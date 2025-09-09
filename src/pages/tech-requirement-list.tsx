import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { 
  Search, 
  Plus, 
  Eye, 
  Edit, 
  Trash2, 
  Clock, 
  Upload, 
  BarChart3,
  Calendar
} from 'lucide-react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { useAuth } from '@/hooks/useAuth'
import { logger } from '@/lib/logger'
import { techRequirementService } from '@/services/tech-requirement-service'
import type { TechRequirement, TechRequirementStats } from '@/types/requirement'

export default function TechRequirementList() {
  const [requirements, setRequirements] = useState<TechRequirement[]>([])
  const [filteredRequirements, setFilteredRequirements] = useState<TechRequirement[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [urgencyFilter, setUrgencyFilter] = useState('')
  const [progressFilter, setProgressFilter] = useState('')
  const [assigneeFilter, setAssigneeFilter] = useState('')
  const [clientTypeFilter, setClientTypeFilter] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState<TechRequirementStats>({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    delayed: 0,
    byUrgency: { high: 0, medium: 0, low: 0 },
    byClientType: { traffic: 0, fullService: 0 }
  })
  const [techAssignees, setTechAssignees] = useState<string[]>([])
  
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const fetchRequirements = async () => {
      try {
        const data = await techRequirementService.getTechRequirements()
        const statsData = await techRequirementService.getTechRequirementStats()
        const assignees = await techRequirementService.getTechAssignees()
        
        setRequirements(data)
        setFilteredRequirements(data)
        setStats(statsData)
        setTechAssignees(assignees)
        setIsLoading(false)
      } catch (error) {
        logger.error('获取技术需求列表失败', { error })
        setIsLoading(false)
      }
    }

    fetchRequirements()
  }, [])

  useEffect(() => {
    let result = requirements

    // 搜索过滤
    if (searchTerm) {
      result = result.filter(req => 
        req.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (req.description && req.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (req.submitter_name && req.submitter_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (req.tech_assignee && req.tech_assignee.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // 紧急程度过滤
    if (urgencyFilter && urgencyFilter !== 'all-urgency') {
      result = result.filter(req => req.urgency === urgencyFilter)
    }

    // 进度过滤
    if (progressFilter && progressFilter !== 'all-progress') {
      result = result.filter(req => req.progress === progressFilter)
    }

    // 技术负责人过滤
    if (assigneeFilter && assigneeFilter !== 'all-assignee') {
      result = result.filter(req => req.tech_assignee === assigneeFilter)
    }

    // 客户类型过滤
    if (clientTypeFilter && clientTypeFilter !== 'all-client-type') {
      result = result.filter(req => req.client_type === clientTypeFilter)
    }

    setFilteredRequirements(result)
  }, [searchTerm, urgencyFilter, progressFilter, assigneeFilter, clientTypeFilter, requirements])

  const handleDelete = async (id: string) => {
    try {
      await techRequirementService.deleteTechRequirement(id)
      setRequirements(prevReqs => prevReqs.filter(req => req.id !== id))
    } catch (error) {
      logger.error('删除需求失败', { error, id })
    }
  }

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'high':
        return <Badge variant="destructive">高</Badge>
      case 'medium':
        return <Badge variant="secondary">中</Badge>
      case 'low':
        return <Badge variant="outline">低</Badge>
      default:
        return <Badge variant="outline">{urgency}</Badge>
    }
  }

  const getProgressBadge = (progress?: string) => {
    switch (progress) {
      case 'completed':
        return <Badge className="bg-green-500">已完成</Badge>
      case 'in_progress':
        return <Badge className="bg-blue-500">处理中</Badge>
      case 'not_started':
        return <Badge className="bg-gray-500">未开始</Badge>
      case 'delayed':
        return <Badge className="bg-orange-500">已沟通延迟</Badge>
      default:
        return <Badge variant="outline">{progress || '未开始'}</Badge>
    }
  }

  const getClientTypeBadge = (clientType: string) => {
    switch (clientType) {
      case 'traffic_operation':
        return <Badge variant="outline">流量运营服务</Badge>
      case 'full_service':
        return <Badge variant="outline">全案深度服务</Badge>
      default:
        return <Badge variant="outline">{clientType}</Badge>
    }
  }

  const calculateTechDuration = (req: TechRequirement) => {
    if (req.start_time && req.end_time) {
      return techRequirementService.calculateTechDuration(req.start_time, req.end_time)
    }
    return 0
  }

  return (
    <div className="container mx-auto py-6 px-3 overflow-x-hidden">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold min-w-0">技术部 - 需求列表</h1>
        <div className="flex gap-2 flex-wrap justify-end">
          <Button variant="outline" onClick={() => navigate('/tech-requirements/import')}>
            <Upload className="mr-2 h-4 w-4" /> 批量导入
          </Button>
          <Button onClick={() => navigate('/tech-requirements/new')}>
            <Plus className="mr-2 h-4 w-4" /> 新建需求
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">总计</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">未开始</p>
                <p className="text-2xl font-bold text-gray-600">{stats.pending}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                <div className="h-4 w-4 rounded-full bg-gray-500"></div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">处理中</p>
                <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                <div className="h-4 w-4 rounded-full bg-blue-500"></div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">已完成</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <div className="h-4 w-4 rounded-full bg-green-500"></div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">已沟通延迟</p>
                <p className="text-2xl font-bold text-orange-600">{stats.delayed}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
                <div className="h-4 w-4 rounded-full bg-orange-500"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>筛选条件</CardTitle>
          <CardDescription>使用以下选项筛选技术需求列表</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row md:flex-wrap gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  type="search"
                  placeholder="搜索需求标题、描述或人员..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="紧急程度" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-urgency">全部紧急程度</SelectItem>
                  <SelectItem value="high">高</SelectItem>
                  <SelectItem value="medium">中</SelectItem>
                  <SelectItem value="low">低</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-48">
              <Select value={progressFilter} onValueChange={setProgressFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="技术进度" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-progress">全部进度</SelectItem>
                  <SelectItem value="not_started">未开始</SelectItem>
                  <SelectItem value="in_progress">处理中</SelectItem>
                  <SelectItem value="completed">已完成</SelectItem>
                  <SelectItem value="delayed">已沟通延迟</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-48">
              <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="技术负责人" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-assignee">全部负责人</SelectItem>
                  {techAssignees.map(assignee => (
                    <SelectItem key={assignee} value={assignee}>{assignee}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-48">
              <Select value={clientTypeFilter} onValueChange={setClientTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="客户类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-client-type">全部客户类型</SelectItem>
                  <SelectItem value="traffic_operation">流量运营服务</SelectItem>
                  <SelectItem value="full_service">全案深度服务</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
        {/* 移动端卡片视图 */}
        <div className="md:hidden space-y-3">
          {filteredRequirements.length > 0 ? (
            filteredRequirements.map((req) => (
              <Card key={req.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-base leading-6 truncate" title={req.title}>
                        {req.title}
                      </CardTitle>
                      <CardDescription className="mt-1 text-xs">
                        {req.month} · {req.submitter_name}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {getProgressBadge(req.progress)}
                      {getUrgencyBadge(req.urgency)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 gap-3 text-xs text-gray-600">
                    <div>负责人：{req.tech_assignee || '未分配'}</div>
                    <div>
                      期望：{req.expected_completion_time ? format(new Date(req.expected_completion_time), "P", { locale: zhCN }) : '-'}
                    </div>
                    <div>客户类型：{req.client_type}</div>
                    <div>
                      提交：{req.submit_time ? format(new Date(req.submit_time), "P", { locale: zhCN }) : (req.created_at ? format(new Date(req.created_at), "P", { locale: zhCN }) : '-')}
                    </div>
                    <div className="col-span-2">
                      {req.client_url ? (
                        <a href={req.client_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">客户链接</a>
                      ) : '无客户链接'}
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end gap-2">
                    <Button variant="secondary" size="sm" onClick={() => navigate(`/tech-requirements/${req.id!}`)}>
                      <Eye className="h-4 w-4 mr-1" /> 查看
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/tech-requirements/${req.id!}/edit`)}>
                      <Edit className="h-4 w-4 mr-1" /> 编辑
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-sm text-gray-500">没有找到符合条件的技术需求</CardContent>
            </Card>
          )}
        </div>

        {/* 桌面端表格视图 */}
        <div className="hidden md:block bg-white rounded-lg shadow">
          <div className="overflow-x-auto w-full">
            <Table className="min-w-[1200px] whitespace-nowrap">
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[100px]">月份</TableHead>
                  <TableHead className="min-w-[240px]">需求标题</TableHead>
                  <TableHead className="min-w-[160px]">期望完成时间</TableHead>
                  <TableHead className="min-w-[100px]">紧急程度</TableHead>
                  <TableHead className="min-w-[120px]">客户类型</TableHead>
                  <TableHead className="min-w-[120px]">客户网址</TableHead>
                  <TableHead className="min-w-[120px]">提交人</TableHead>
                  <TableHead className="min-w-[120px]">技术负责人</TableHead>
                  <TableHead className="min-w-[120px]">技术进度</TableHead>
                  <TableHead className="min-w-[180px]">负责人预计完成时间</TableHead>
                  <TableHead className="min-w-[140px]">技术所耗时长</TableHead>
                  <TableHead className="min-w-[160px]">提交时间</TableHead>
                  <TableHead className="text-right min-w-[120px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequirements.length > 0 ? (
                  filteredRequirements.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell>{req.month}</TableCell>
                      <TableCell className="font-medium">
                        <div className="max-w-[200px] truncate" title={req.title}>
                          {req.title}
                        </div>
                      </TableCell>
                      <TableCell>
                        {req.expected_completion_time ? 
                          format(new Date(req.expected_completion_time), "PPP", { locale: zhCN }) : 
                          '-'
                        }
                      </TableCell>
                      <TableCell>{getUrgencyBadge(req.urgency)}</TableCell>
                      <TableCell>{getClientTypeBadge(req.client_type)}</TableCell>
                      <TableCell>
                        {req.client_url ? (
                          <a href={req.client_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">链接</a>
                        ) : '-'}
                      </TableCell>
                      <TableCell>{req.submitter_name}</TableCell>
                      <TableCell>{req.tech_assignee || '未分配'}</TableCell>
                      <TableCell>{getProgressBadge(req.progress)}</TableCell>
                      <TableCell>
                        {req.assignee_estimated_time ? 
                          format(new Date(req.assignee_estimated_time), "PPP", { locale: zhCN }) : 
                          '-'
                        }
                      </TableCell>
                      <TableCell>
                        {req.progress === 'completed' ? (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {calculateTechDuration(req)}h
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {req.submit_time ? 
                          format(new Date(req.submit_time), "PPP", { locale: zhCN }) : 
                          (req.created_at ? format(new Date(req.created_at), "PPP", { locale: zhCN }) : '-')
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => navigate(`/tech-requirements/${req.id}`)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => navigate(`/tech-requirements/${req.id}/edit`)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>确认删除</AlertDialogTitle>
                                <AlertDialogDescription>
                                  您确定要删除这个技术需求吗？此操作无法撤销。
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>取消</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(req.id!)}>
                                  删除
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center py-8">
                      没有找到符合条件的技术需求
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
        </>
      )}
    </div>
  )
}