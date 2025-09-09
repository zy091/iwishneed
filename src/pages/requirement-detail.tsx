import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import Comments from '@/components/Comments'
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
import { RequirementService, Requirement } from '@/services/requirement-service'
import { useAuth } from '@/hooks/useAuth'
import { 
  Calendar, 
  Clock, 
  Edit, 
  Trash2, 
  Tag, 
  FileText, 
  User, 
  Users, 
  Building, 
  AlertCircle 
} from 'lucide-react'

export default function RequirementDetail() {
  const { id } = useParams<{ id: string }>()
  const [requirement, setRequirement] = useState<Requirement | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const fetchRequirement = async () => {
      if (!id) return
      
      try {
        const data = await RequirementService.getRequirementById(id)
        if (data) {
          setRequirement(data)
        } else {
          console.error('需求不存在')
        }
      } catch (error) {
        console.error('获取需求详情失�?', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchRequirement()
  }, [id])

  const handleDelete = async () => {
    if (!id) return
    
    try {
      const success = await RequirementService.deleteRequirement(id)
      if (success) {
        navigate('/requirements')
      }
    } catch (error) {
      console.error('删除需求失�?', error)
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!requirement) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">需求不存在</CardTitle>
            <CardDescription className="text-center">
              您请求的需求可能已被删除或不存�?
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button onClick={() => navigate('/requirements')}>返回需求列�?/Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{requirement.title}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/requirements/${id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" /> 编辑
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" /> 删除
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
                <AlertDialogAction onClick={handleDelete}>
                  删除
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>需求详�?/CardTitle>
              <div className="flex flex-wrap gap-2 mt-2">
                {getStatusBadge(requirement.status)}
                {getPriorityBadge(requirement.priority)}
                {requirement.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary">
                    <Tag className="mr-1 h-3 w-3" /> {tag}
                  </Badge>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <div className="whitespace-pre-wrap">{requirement.description}</div>
            </CardContent>
          </Card>

          {requirement.attachments && requirement.attachments.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>附件</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {requirement.attachments.map((attachment) => (
                    <div 
                      key={attachment.id} 
                      className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <FileText className="h-5 w-5 mr-2 text-blue-500" />
                      <div className="flex-1">
                        <p className="font-medium">{attachment.name}</p>
                        <p className="text-sm text-gray-500">{attachment.size}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>评论</CardTitle>
            </CardHeader>
            <CardContent>
              {/* 使用新的 CommentsSection 组件 */}
              {id && <Comments requirementId={id} />}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>基本信息</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center">
                  <User className="h-5 w-5 mr-2 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">提交�?/p>
                    <div className="flex items-center mt-1">
                      <img 
                        src={requirement.submitter.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Unknown'} 
                        alt={requirement.submitter.name} 
                        className="h-6 w-6 rounded-full mr-2" 
                      />
                      <p>{requirement.submitter.name}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center">
                  <Users className="h-5 w-5 mr-2 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">负责�?/p>
                    {requirement.assignee ? (
                      <div className="flex items-center mt-1">
                        <img 
                          src={requirement.assignee.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Unknown'} 
                          alt={requirement.assignee.name} 
                          className="h-6 w-6 rounded-full mr-2" 
                        />
                        <p>{requirement.assignee.name}</p>
                      </div>
                    ) : (
                      <p className="mt-1 text-gray-400">未分�?/p>
                    )}
                  </div>
                </div>

                <div className="flex items-center">
                  <Building className="h-5 w-5 mr-2 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">所属部�?/p>
                    <p className="mt-1">{requirement.department}</p>
                  </div>
                </div>

                <div className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">创建日期</p>
                    <p className="mt-1">{requirement.createdAt}</p>
                  </div>
                </div>

                <div className="flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">更新日期</p>
                    <p className="mt-1">{requirement.updatedAt}</p>
                  </div>
                </div>

                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 mr-2 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">截止日期</p>
                    <p className="mt-1">{requirement.dueDate}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {requirement.history && requirement.history.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>历史记录</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative pl-6 border-l border-gray-200">
                  {requirement.history.map((item, index) => (
                    <div key={item.id} className="mb-4 relative">
                      <div className="absolute -left-[25px] mt-1.5 h-4 w-4 rounded-full bg-blue-500"></div>
                      <p className="font-medium">{item.action}</p>
                      <div className="flex items-center text-sm text-gray-500 mt-1">
                        <span>{item.user}</span>
                        <span className="mx-2">�?/span>
                        <span>{item.timestamp}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
