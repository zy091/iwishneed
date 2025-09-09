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
import { techRequirementService } from '@/services/tech-requirement-service'
import type { TechRequirement as ServiceTechRequirement } from '@/services/tech-requirement-service'
import { creativeRequirementService } from '@/services/creative-requirement-service'
import type { CreativeRequirement } from '@/services/creative-requirement-service'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/use-permissions'
import { logger } from '@/lib/logger'
import { PlusCircle, Search, Trash2, Edit, Eye, Upload, BarChart3, Settings, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'

type CombinedRequirement = {
  id?: string
  title: string
  description?: string
  submitter?: { id?: string; name?: string; avatar?: string }
  created_at?: string
  type: 'tech' | 'creative'
  department: '技术部' | '创意�?
  status?: 'completed' | 'inProgress' | 'pending' | 'overdue'
  priority?: 'high' | 'medium' | 'low'
  due_date?: string
  tech_month?: string
  tech_urgency?: '�? | '�? | '�?
  tech_client_type?: '流量运营服务' | '全案深度服务'
  tech_assignee?: string
  tech_progress?: '未开�? | '处理�? | '已完�? | '已沟通延�?
  tech_expected_completion_time?: string
  tech_start_time?: string
  tech_end_time?: string
}

type Requirement = CombinedRequirement
type TechRequirement = CombinedRequirement

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
    : location.pathname.includes('/creative') ? '创意�? 
    : ''
    : ''

  // 权限检查函�?
  const canEditOrDelete = (requirement: Requirement) => {
    if (!user) return false

    // 仅管理员
    const isAdmin = isAdminUser
    if (isAdmin) return true

    // 优先使用 submitter_id 作为所有权校验，兼容历史数据回退�?submitter 对象
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

  // 数据聚合工具
  const fetchCombinedRequirements = async (filters: any): Promise<CombinedRequirement[]> => {
    const [tech, creative] = await Promise.all([
      techRequirementService.getTechRequirements(),
      creativeRequirementService.getCreativeRequirements()
    ])

    const techMapped: CombinedRequirement[] = (tech || []).map(t => ({
      id: (t as any).id,
      title: (t as any).title,
      description: (t as any).description,
      submitter: { id: (t as any).submitter_id, name: (t as any).submitter_name, avatar: (t as any).submitter_avatar },
      created_at: (t as any).created_at,
      type: 'tech',
      department: '技术部',
      status: (t as any).progress === '已完�? ? 'completed'
            : (t as any).progress === '处理�? ? 'inProgress'
            : (t as any).progress === '未开�? ? 'pending'
            : (t as any).progress === '已沟通延�? ? 'overdue'
            : undefined,
      priority: (t as any).urgency === '�? ? 'high' : (t as any).urgency === '�? ? 'low' : 'medium',
      due_date: (t as any).expected_completion_time,
      tech_month: (t as any).month,
      tech_urgency: (t as any).urgency,
      tech_client_type: (t as any).client_type,
      tech_assignee: (t as any).tech_assignee,
      tech_progress: (t as any).progress,
      tech_expected_completion_time: (t as any).expected_completion_time,
      tech_start_time: (t as any).start_time,
      tech_end_time: (t as any).end_time,
    }))

    const creativeMapped: CombinedRequirement[] = (creative || []).map(c => ({
      id: (c as any).id,
      title: (c as any).site_name || (c as any).asset_type || '创意需�?,
      description: undefined,
      submitter: { id: (c as any).submitter_id, name: (c as any).submitter_name },
      created_at: (c as any).created_at,
      type: 'creative',
      department: '创意�?,
      status: (c as any).status === '已完�? ? 'completed'
            : (c as any).status === '处理�? ? 'inProgress'
            : (c as any).status === '未开�? ? 'pending'
            : undefined,
      priority: (c as any).urgency === '�? ? 'high' : (c as any).urgency === '�? ? 'low' : 'medium',
      due_date: (c as any).expected_delivery_time
    }))

    let merged = [...techMapped, ...creativeMapped]
    if (filters?.department === '技术部') merged = merged.filter(x => x.department === '技术部')
    else if (filters?.department === '创意�?) merged = merged.filter(x => x.department === '创意�?)
    return merged
  }

  const computeStats = (data: CombinedRequirement[]) => {
    const t = data.filter(x => x.type === 'tech')
    const completed = t.filter(r => r.tech_progress === '已完�?).length
    const inProgress = t.filter(r => r.tech_progress === '处理�?).length
    const pending = t.filter(r => r.tech_progress === '未开�?).length
    const overdue = t.filter(r => r.tech_progress === '已沟通延�?).length
    const total = t.length
    const completionRate = total > 0 ? (completed / total) * 100 : 0
    return { total, completed, inProgress, pending, overdue, completionRate, techDept: t.length, creativeDept: data.filter(x => x.type === 'creative').length }
  }

  // 处理行点击事�?
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
        
        const data = await fetchCombinedRequirements(filters)
        const statsData = computeStats(data)
        
        setRequirements(data)
        setFilteredRequirements(data)
        setStats(statsData)
        
        // 获取技术负责人列表
        if (currentDepartment === '技术部') {
          const assignees = await techRequirementService.getTechAssignees()
          setTechAssignees(assignees)
        }
        
        setIsLoading(false)
      } catch (error) {
        logger.error('Failed to fetch requirements list', error)
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

    // 状态过�?
    if (statusFilter && statusFilter !== 'all-status') {
      result = result.filter(req => req.status === statusFilter)
    }

    // 优先级过�?
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

    // 技术进度过�?
    if (progressFilter && progressFilter !== 'all-progress') {
      result = result.filter(req => 
        req.type === 'tech' && (req as TechRequirement).tech_progress === progressFilter
      )
    }

    setFilteredRequirements(result)
  }, [searchTerm, statusFilter, priorityFilter, departmentFilter, assigneeFilter, progressFilter, requirements, currentDepartment])

  const handleDelete = async (id: string) => {
    try {
      const target = requirements.find(r => r.id === id)
      if ((target as any)?.type === 'tech') {
        await techRequirementService.deleteTechRequirement(id)
      } else if ((target as any)?.type === 'creative') {
        await creativeRequirementService.deleteCreativeRequirement(id)
      }
      setRequirements(prevReqs => prevReqs.filter(req => req.id !== id))
    } catch (error) {
      logger.error('Failed to delete requirement', error)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500 hover:bg-green-600">已完�?/Badge>
      case 'inProgress':
        return <Badge className="bg-blue-500 hover:bg-blue-600">进行�?/Badge>
      case 'pending':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">待处�?/Badge>
      case 'overdue':
        return <Badge className="bg-red-500 hover:bg-red-600">已逾期</Badge>
      default:
        return <Badge>未知</Badge>
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="outline" className="border-red-500 text-red-500">�?/Badge>
      case 'medium':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-500">�?/Badge>
      case 'low':
        return <Badge variant="outline" className="border-green-500 text-green-500">�?/Badge>
      default:
        return <Badge variant="outline">未知</Badge>
    }
  }

  const getTechUrgencyBadge = (urgency?: string) => {
    if (!urgency) return null
    switch (urgency) {
      case '�?:
        return <Badge variant="destructive">�?/Badge>
      case '�?:
        return <Badge variant="secondary">�?/Badge>
      case '�?:
        return <Badge variant="outline">�?/Badge>
      default:
        return <Badge variant="outline">{urgency}</Badge>
    }
  }

  const getTechProgressBadge = (progress?: string) => {
    if (!progress) return null
    switch (progress) {
      case '已完�?:
        return <Badge className="bg-green-500">已完�?/Badge>
      case '处理�?:
        return <Badge className="bg-blue-500">处理�?/Badge>
      case '未开�?:
        return <Badge className="bg-gray-500">未开�?/Badge>
      case '已沟通延�?:
        return <Badge className="bg-orange-500">已沟通延�?/Badge>
      default:
        return <Badge variant="outline">{progress}</Badge>
    }
  }

  const calculateTechDuration = (req: TechRequirement) => {
    if (req.tech_start_time && req.tech_end_time) {
      const diffMs = new Date(req.tech_end_time).getTime() - new Date(req.tech_start_time).getTime()
      return Math.max(0, Math.round((diffMs / 3600000) * 100) / 100)
    }
    return 0
  }

  const getPageTitle = () => {
    if (currentDepartment) {
      return `${currentDepartment} - 需求列表`
    }
    return '所有需�?
  }

  const getCreatePath = () => {
    if (currentDepartment === '技术部') {
      return '/requirements/new?department=tech'
    } else if (currentDepartment === '创意�?) {
      return '/requirements/new?department=creative'
    }
    return '/requirements/new'
  }

  const getImportPath = () => {
    if (currentDepartment === '技术部') {
      return '/requirements/import?department=tech'
    } else if (currentDepartment === '创意�?) {
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
            <PlusCircle className="mr-2 h-4 w-4" /> 新建需�?
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
                <p className="text-sm text-gray-600">待处�?/p>
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
                <p className="text-sm text-gray-600">进行�?/p>
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
                <p className="text-sm text-gray-600">已完�?/p>
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
          <CardTitle>筛选条�?/CardTitle>
          <CardDescription>使用以下选项筛选需求列�?/CardDescription>
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
                  <SelectValue placeholder="状�? />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-status">全部状�?/SelectItem>
                  <SelectItem value="pending">待处�?/SelectItem>
                  <SelectItem value="inProgress">进行�?/SelectItem>
                  <SelectItem value="completed">已完�?/SelectItem>
                  <SelectItem value="overdue">已逾期</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-48">
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="优先�? />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-priority">全部优先�?/SelectItem>
                  <SelectItem value="high">�?/SelectItem>
                  <SelectItem value="medium">�?/SelectItem>
                  <SelectItem value="low">�?/SelectItem>
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
                    <SelectItem value="创意�?>创意�?/SelectItem>
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
                      <SelectItem value="all-assignee">全部负责�?/SelectItem>
                      {techAssignees.map(assignee => (
                        <SelectItem key={assignee} value={assignee}>{assignee}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-full md:w-48">
                  <Select value={progressFilter} onValueChange={setProgressFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="技术进�? />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all-progress">全部进度</SelectItem>
                      <SelectItem value="未开�?>未开�?/SelectItem>
                      <SelectItem value="处理�?>处理�?/SelectItem>
                      <SelectItem value="已完�?>已完�?/SelectItem>
                      <SelectItem value="已沟通延�?>已沟通延�?/SelectItem>
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
                      <TableHead className="w-24">紧急程�?/TableHead>
                      <TableHead className="w-24">客户类型</TableHead>
                      <TableHead className="w-28">技术负责人</TableHead>
                      <TableHead className="w-24">技术进�?/TableHead>
                      <TableHead className="w-24">耗时(小时)</TableHead>
                    </>
                  )}
                  {!currentDepartment && <TableHead className="w-20">部门</TableHead>}
                  <TableHead className="w-28">提交�?/TableHead>
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
                            <TableCell>{techReq.tech_assignee || '未分�?}</TableCell>
                            <TableCell>{getTechProgressBadge(techReq.tech_progress)}</TableCell>
                            <TableCell>
                              {techReq.tech_progress === '已完�? ? (
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
                                      您确定要删除这个需求吗？此操作无法撤销�?
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
                      没有找到符合条件的需�?
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
