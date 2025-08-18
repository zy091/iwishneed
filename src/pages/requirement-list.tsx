import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
import { RequirementService, Requirement } from '../services/requirement-service'
import { useAuth } from '../hooks/use-auth'
import { PlusCircle, Search, Filter, Trash2, Edit, Eye, Upload } from 'lucide-react'

export default function RequirementList() {
  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [filteredRequirements, setFilteredRequirements] = useState<Requirement[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const fetchRequirements = async () => {
      try {
        const data = await RequirementService.getAllRequirements()
        setRequirements(data)
        setFilteredRequirements(data)
        setIsLoading(false)
      } catch (error) {
        console.error('获取需求列表失败:', error)
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
        req.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.submitter.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (req.assignee && req.assignee.name.toLowerCase().includes(searchTerm.toLowerCase()))
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

    setFilteredRequirements(result)
  }, [searchTerm, statusFilter, priorityFilter, requirements])

  const handleDelete = async (id: string) => {
    try {
      const success = await RequirementService.deleteRequirement(id)
      if (success) {
        setRequirements(prevReqs => prevReqs.filter(req => req.id !== id))
      }
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

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">需求列表</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/requirements/import')}>
            <Upload className="mr-2 h-4 w-4" /> 导入
          </Button>
          <Button onClick={() => navigate('/requirements/new')}>
            <PlusCircle className="mr-2 h-4 w-4" /> 新建需求
          </Button>
        </div>
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
                  placeholder="搜索需求..."
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
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>标题</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>优先级</TableHead>
                  <TableHead>提交人</TableHead>
                  <TableHead>负责人</TableHead>
                  <TableHead>创建日期</TableHead>
                  <TableHead>截止日期</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequirements.length > 0 ? (
                  filteredRequirements.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell className="font-medium">
                        <Link to={`/requirements/${req.id}`} className="hover:underline">
                          {req.title}
                        </Link>
                      </TableCell>
                      <TableCell>{getStatusBadge(req.status)}</TableCell>
                      <TableCell>{getPriorityBadge(req.priority)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <img 
                            src={req.submitter.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Unknown'} 
                            alt={req.submitter.name} 
                            className="h-6 w-6 rounded-full" 
                          />
                          <span>{req.submitter.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {req.assignee ? (
                          <div className="flex items-center gap-2">
                            <img 
                              src={req.assignee.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Unknown'} 
                              alt={req.assignee.name} 
                              className="h-6 w-6 rounded-full" 
                            />
                            <span>{req.assignee.name}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">未分配</span>
                        )}
                      </TableCell>
                      <TableCell>{req.createdAt}</TableCell>
                      <TableCell>{req.dueDate}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => navigate(`/requirements/${req.id}`)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => navigate(`/requirements/${req.id}/edit`)}>
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
                                  您确定要删除这个需求吗？此操作无法撤销。
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>取消</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(req.id)}>
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
                    <TableCell colSpan={8} className="text-center py-8">
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