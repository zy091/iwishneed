import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
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
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card'
import { supabaseRequirementService, Requirement, TechRequirement } from '../services/supabase-requirement-service'
import { creativeRequirementService, CreativeRequirement } from '@/services/creative-requirement-service'
import { useAuth } from '../hooks/use-auth'
import { usePermissions } from '@/hooks/use-permissions'
import { PlusCircle, Search, Trash2, Edit, Eye, Upload, BarChart3, Settings, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'

export default function RequirementList() {
  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [filteredRequirements, setFilteredRequirements] = useState<Requirement[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [assigneeFilter, setAssigneeFilter] = useState('')
  const [progressFilter, setProgressFilter] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
    pending: 0,
    overdue: 0
  })
  const [techAssignees, setTechAssignees] = useState<string[]>([])
  const { user } = useAuth()
  const { isAdmin: isAdminUser } = usePermissions()
  const navigate = useNavigate()
  const location = useLocation()

  // 判断当前路径
  const isDepartmentView = location.pathname.startsWith('/departments/')
  const currentDepartment = isDepartmentView 
    ? location.pathname.includes('/tech') ? '技术部' 
    : location.pathname.includes('/creative') ? '创意部' 
    : ''
    : ''

  // 权限检查函数
  const canEditOrDelete = (requirement: Requirement) => {
    if (!user) return false

    // 仅管理员
    const isAdmin = isAdminUser
    if (isAdmin) return true

    // 优先使用 submitter_id 作为所有权校验，兼容历史数据回退到 submitter 对象
    const uid = user.id
    const subId = (requirement as any)?.submitter_id as string | undefined
    if (uid && subId) {
      return subId === uid
    }

    const submitter = requirement.submitter
    if (!submitter) return false
    return submitter.id === uid ||
           submitter.id?.toString() === uid
  }

  // 处理行点击事件
  const handleRowClick = (requirementId: string, event: React.MouseEvent) => {
    // 如果点击的是按钮或链接，不触发行点击
    if ((event.target as HTMLElement).closest('button, a')) {
      return
    }
    navigate(`/requirements/${requirementId}`)
  }

  useEffect(() => {
    const fetchRequirements = async () => {
      try {
        const filters: any = {}
        if (currentDepartment) {
          filters.department = currentDepartment
        }
        
        const data = await supabaseRequirementService.getRequirements(filters)
        const statsData = await supabaseRequirementService.getStats()
        
        setRequirements(data)
        setFilteredRequirements(data)
        setStats(statsData)
        
        // 获取技术负责人列表
        if (currentDepartment === '技术部') {
          const assignees = await supabaseRequirementService.getTechAssignees()
          setTechAssignees(assignees.map(a => a.name))
        }
        
        setIsLoading(false)
      } catch (error) {
        console.error('获取需求列表失败:', error)
        setIsLoading(false)
      }
    }

    fetchRequirements()
  }, [currentDepartment])

  useEffect(() => {
    let result = requirements

    // 搜索过滤
    if (searchTerm) {
      result = result.filter(req => 
        req.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (req.description && req.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (req.submitter?.name && req.submitter.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (req.type === 'tech' && (req as TechRequirement).tech_assignee && 
         (req as TechRequirement).tech_assignee!.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // 状态过滤
    if (statusFilter && statusFilter !== 'all-status') {
      result = result.filter(req => req.status === statusFilter)
    }

    // 优先级过滤
    if (priorityFilter && priorityFilter !== 'all-priority') {
      result = result.filter(req => req.priority === priorityFilter)
    }

    // 部门过滤（仅在全部需求页面显示）
    if (!currentDepartment && departmentFilter && departmentFilter !== 'all-department') {
      result = result.filter(req => req.department === departmentFilter)
    }

    // 技术负责人过滤
    if (assigneeFilter && assigneeFilter !== 'all-assignee') {
      result = result.filter(req => 
        req.type === 'tech' && (req as TechRequirement).tech_assignee === assigneeFilter
      )
    }

    // 技术进度过滤
    if (progressFilter && progressFilter !== 'all-progress') {
      result = result.filter(req => 
        req.type === 'tech' && (req as TechRequirement).tech_progress === progressFilter
      )
    }

    setFilteredRequirements(result)
  }, [searchTerm, statusFilter, priorityFilter, departmentFilter, assigneeFilter, progressFilter, requirements, currentDepartment])

  const handleDelete = async (id: string) => {
    try {
      await supabaseRequirementService.deleteRequirement(id)
      setRequirements(prevReqs => prevReqs.filter(req => req.id !== id))
    } catch (error) {
      console.error('删除需求失败:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500 hover:bg-green-600">已完成</Badge>
      case 'inProgress':
        return <Badge className="bg-blue-500 hover:bg-blue-600">进行中</Badge>
      case 'pending':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">待处理</Badge>
      case 'overdue':
        return <Badge className="bg-red-500 hover:bg-red-600">已逾期</Badge>
      default:
        return <Badge>未知</Badge>
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="outline" className="border-red-500 text-red-500">高</Badge>
      case 'medium':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-500">中</Badge>
      case 'low':
        return <Badge variant="outline" className="border-green-500 text-green-500">低</Badge>
      default:
        return <Badge variant="outline">未知</Badge>
    }
  }

  const getTechUrgencyBadge = (urgency?: string) => {
    if (!urgency) return null
    switch (urgency) {
      case '高':
        return <Badge variant="destructive">高</Badge>
      case '中':
        return <Badge variant="secondary">中</Badge>
      case '低':
        return <Badge variant="outline">低</Badge>
      default:
        return <Badge variant="outline">{urgency}</Badge>
    }
  }

  const getTechProgressBadge = (progress?: string) => {
    if (!progress) return null
    switch (progress) {
      case '已完成':
        return <Badge className="bg-green-500">已完成</Badge>
      case '处理中':
        return <Badge className="bg-blue-500">处理中</Badge>
      case '未开始':
        return <Badge className="bg-gray-500">未开始</Badge>
      case '已沟通延迟':
        return <Badge className="bg-orange-500">已沟通延迟</Badge>
      default:
        return <Badge variant="outline">{progress}</Badge>
    }
  }

  const calculateTechDuration = (req: TechRequirement) => {
    if (req.tech_start_time && req.tech_end_time) {
      return supabaseRequirementService.calculateTechDuration(req.tech_start_time, req.tech_end_time)
    }
    return 0
  }

  const getPageTitle = () => {
    if (currentDepartment) {
      return `${currentDepartment} - 需求列表`
    }
    return '所有需求'
  }

  const getCreatePath = () => {
    if (currentDepartment === '技术部') {
      return '/requirements/new?department=tech'
    } else if (currentDepartment === '创意部') {
      return '/requirements/new?department=creative'
    }
    return '/requirements/new'
  }

  const getImportPath = () => {
    if (currentDepartment === '技术部') {
      return '/requirements/import?department=tech'
    } else if (currentDepartment === '创意部') {
      return '/requirements/import?department=creative'
    }
    return '/requirements/import'
  }

  const getTechAssigneeEditPath = (id: string) => {
    return `/requirements/${id}/edit?mode=assignee`
  }

  return (
    <div className="container mx-auto py-6 px-3 overflow-x-hidden">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{getPageTitle()}</h1>
        <div className="flex gap-2 flex-wrap justify-end">
          {isAdminUser && (
            <Button variant="outline" onClick={() => navigate(getImportPath())}>
              <Upload className="mr-2 h-4 w-4" /> 批量导入
            </Button>
          )}
          <Button onClick={() => navigate(getCreatePath())}>
            <PlusCircle className="mr-2 h-4 w-4" /> 新建需求
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
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
                <p className="text-sm text-gray-600">待处理</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
                <div className="h-4 w-4 rounded-full bg-yellow-500"></div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">进行中</p>
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
                <p className="text-sm text-gray-600">已逾期</p>
                <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                <div className="h-4 w-4 rounded-full bg-red-500"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>筛选条件</CardTitle>
          <CardDescription>使用以下选项筛选需求列表</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
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
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-status">全部状态</SelectItem>
                  <SelectItem value="pending">待处理</SelectItem>
                  <SelectItem value="inProgress">进行中</SelectItem>
                  <SelectItem value="completed">已完成</SelectItem>
                  <SelectItem value="overdue">已逾期</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-48">
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="优先级" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-priority">全部优先级</SelectItem>
                  <SelectItem value="high">高</SelectItem>
                  <SelectItem value="medium">中</SelectItem>
                  <SelectItem value="low">低</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {!currentDepartment && (
              <div className="w-full md:w-48">
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="部门" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-department">全部部门</SelectItem>
                    <SelectItem value="技术部">技术部</SelectItem>
                    <SelectItem value="创意部">创意部</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {currentDepartment === '技术部' && (
              <>
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
                  <Select value={progressFilter} onValueChange={setProgressFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="技术进度" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all-progress">全部进度</SelectItem>
                      <SelectItem value="未开始">未开始</SelectItem>
                      <SelectItem value="处理中">处理中</SelectItem>
                      <SelectItem value="已完成">已完成</SelectItem>
                      <SelectItem value="已沟通延迟">已沟通延迟</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow">
          <div className="overflow-x-auto w-full">
            <Table className="w-full table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/4 min-w-[200px]">标题</TableHead>
                  {currentDepartment === '技术部' && (
                    <>
                      <TableHead className="w-20">月份</TableHead>
                      <TableHead className="w-24">紧急程度</TableHead>
                      <TableHead className="w-24">客户类型</TableHead>
                      <TableHead className="w-28">技术负责人</TableHead>
                      <TableHead className="w-24">技术进度</TableHead>
                      <TableHead className="w-24">耗时(小时)</TableHead>
                    </>
                  )}
                  {!currentDepartment && <TableHead className="w-20">部门</TableHead>}
                  <TableHead className="w-28">提交人</TableHead>
                  <TableHead className="w-32">期望完成时间</TableHead>
                  <TableHead className="w-28">创建日期</TableHead>
                  <TableHead className="w-24 text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequirements.length > 0 ? (
                  filteredRequirements.map((req) => {
                    const techReq = req.type === 'tech' ? req as TechRequirement : null
                    const hasPermission = canEditOrDelete(req)
                    return (
                      <TableRow 
                        key={req.id} 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={(e) => handleRowClick(req.id!, e)}
                      >
                        <TableCell className="font-medium">
                          <div 
                            className="hover:underline cursor-pointer" 
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(`/requirements/${req.id}`)
                            }}
                          >
                            {req.title}
                          </div>
                        </TableCell>
                        {currentDepartment === '技术部' && techReq && (
                          <>
                            <TableCell>{techReq.tech_month || '-'}</TableCell>
                            <TableCell>{getTechUrgencyBadge(techReq.tech_urgency)}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{techReq.tech_client_type || '-'}</Badge>
                            </TableCell>
                            <TableCell>{techReq.tech_assignee || '未分配'}</TableCell>
                            <TableCell>{getTechProgressBadge(techReq.tech_progress)}</TableCell>
                            <TableCell>
                              {techReq.tech_progress === '已完成' ? (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  {calculateTechDuration(techReq)}h
                                </div>
                              ) : '-'}
                            </TableCell>
                          </>
                        )}
                        {!currentDepartment && (
                          <TableCell>
                            <Badge variant="outline">{req.department}</Badge>
                          </TableCell>
                        )}
                        <TableCell className="min-w-[120px]">
                          <div className="flex items-center gap-2 min-w-0">
                            <img 
                              src={req.submitter?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Unknown'} 
                              alt={req.submitter?.name || 'Unknown'} 
                              className="h-6 w-6 rounded-full flex-shrink-0" 
                            />
                            <span className="text-sm truncate">{req.submitter?.name || 'Unknown'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {techReq?.tech_expected_completion_time ? 
                            format(new Date(techReq.tech_expected_completion_time), "PPP", { locale: zhCN }) : 
                            (req.due_date ? format(new Date(req.due_date), "PPP", { locale: zhCN }) : '-')
                          }
                        </TableCell>
                        <TableCell>
                          {req.created_at ? format(new Date(req.created_at), "PPP", { locale: zhCN }) : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={(e) => {
                                e.stopPropagation()
                                navigate(`/requirements/${req.id}`)
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {hasPermission && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={(e) => {
                                  e.stopPropagation()
                                  navigate(`/requirements/${req.id}/edit`)
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {currentDepartment === '技术部' && hasPermission && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={(e) => {
                                  e.stopPropagation()
                                  navigate(getTechAssigneeEditPath(req.id!))
                                }}
                                title="技术负责人处理"
                              >
                                <Settings className="h-4 w-4" />
                              </Button>
                            )}
                            {hasPermission && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>确认删除</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      您确定要删除这个需求吗？此操作无法撤销。
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
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={currentDepartment === '技术部' ? 11 : (!currentDepartment ? 6 : 5)} className="text-center py-8">
                      没有找到符合条件的需求
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}