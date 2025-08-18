import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card'
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { CalendarIcon, Save, ArrowLeft } from 'lucide-react'
import { RequirementService, mockUsers } from '../services/requirement-service'
import { useAuth } from '../hooks/use-auth'

// 模拟部门数据
const mockDepartments = [
  '产品部',
  '技术部',
  '设计部',
  '市场部',
  '运营部',
  '客服部',
  '法务部',
  '人力资源部',
  '财务部'
]

// 表单验证模式
const formSchema = z.object({
  title: z.string().min(2, { message: '标题至少需要2个字符' }).max(100, { message: '标题最多100个字符' }),
  description: z.string().min(10, { message: '描述至少需要10个字符' }),
  status: z.enum(['pending', 'inProgress', 'completed', 'overdue']),
  priority: z.enum(['high', 'medium', 'low']),
  assigneeId: z.string(),
  department: z.string(),
  dueDate: z.date(),
  tags: z.string().optional()
})

type FormValues = z.infer<typeof formSchema>

export default function RequirementForm() {
  const { id } = useParams<{ id: string }>()
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()
  const { user } = useAuth()
  const isEditMode = !!id
  const location = useLocation()
  const base =
    location.pathname.startsWith('/tech')
      ? '/tech'
      : location.pathname.startsWith('/creative')
      ? '/creative'
      : ''
  const presetDepartment = base === '/tech' ? '技术部' : base === '/creative' ? '创意部' : ''

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      status: 'pending',
      priority: 'medium',
      assigneeId: 'unassigned',
      department: presetDepartment || '',
      tags: ''
    }
  })

  useEffect(() => {
    const fetchRequirement = async () => {
      if (!id) return
      
      setIsLoading(true)
      try {
        const data = await RequirementService.getRequirementById(id)
        if (data) {
          form.reset({
            title: data.title,
            description: data.description,
            status: data.status,
            priority: data.priority,
            assigneeId: data.assignee?.id || 'unassigned',
            department: data.department,
            dueDate: new Date(data.dueDate),
            tags: data.tags.join(', ')
          })
        } else {
          console.error('需求不存在')
          navigate(`${base}/requirements` || '/requirements')
        }
      } catch (error) {
        console.error('获取需求详情失败:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (isEditMode) {
      fetchRequirement()
    }
  }, [id, isEditMode, navigate, form])

  const onSubmit = async (values: FormValues) => {
    if (!user) return
    
    setIsSubmitting(true)
    try {
      const assignee = values.assigneeId && values.assigneeId !== 'unassigned'
        ? mockUsers.find(u => u.id === values.assigneeId) || null
        : null

      const tagsArray = values.tags
        ? values.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
        : []

      if (isEditMode && id) {
        // 更新需求
        await RequirementService.updateRequirement(
          id,
          {
            title: values.title,
            description: values.description,
            status: values.status,
            priority: values.priority,
            assignee,
            department: values.department,
            dueDate: format(values.dueDate, 'yyyy-MM-dd'),
            tags: tagsArray
          },
          user
        )
      } else {
        // 创建新需求
        await RequirementService.createRequirement(
          {
            title: values.title,
            description: values.description,
            status: values.status,
            priority: values.priority,
            assignee,
            department: values.department,
            dueDate: format(values.dueDate, 'yyyy-MM-dd'),
            tags: tagsArray,
            submitter: {
              id: user.id,
              name: user.name,
              avatar: user.avatar
            }
          },
          user
        )
      }
      
      navigate(`${base}/requirements` || '/requirements')
    } catch (error) {
      console.error('保存需求失败:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> 返回
        </Button>
        <h1 className="text-2xl font-bold">{isEditMode ? '编辑需求' : '创建需求'}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isEditMode ? '编辑需求信息' : '填写需求信息'}</CardTitle>
          <CardDescription>
            请填写以下表单，提供需求的详细信息
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>需求标题</FormLabel>
                    <FormControl>
                      <Input placeholder="输入需求标题" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>需求描述</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="详细描述需求内容、背景和目标..." 
                        className="min-h-32" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>状态</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="选择状态" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pending">待处理</SelectItem>
                          <SelectItem value="inProgress">进行中</SelectItem>
                          <SelectItem value="completed">已完成</SelectItem>
                          <SelectItem value="overdue">已逾期</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>优先级</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="选择优先级" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="high">高</SelectItem>
                          <SelectItem value="medium">中</SelectItem>
                          <SelectItem value="low">低</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="assigneeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>负责人</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="选择负责人" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="unassigned">未分配</SelectItem>
                          {mockUsers.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>所属部门</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value || "default-department"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="选择部门" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="default-department">请选择部门</SelectItem>
                          {mockDepartments.map((dept) => (
                            <SelectItem key={dept} value={dept}>
                              {dept}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>截止日期</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "yyyy-MM-dd")
                              ) : (
                                <span>选择日期</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date("2000-01-01")}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>标签</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="输入标签，用逗号分隔" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => navigate(-1)}>取消</Button>
          <Button 
            onClick={form.handleSubmit(onSubmit)}
            disabled={isSubmitting}
          >
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting ? '保存中...' : '保存需求'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}