import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
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
import { SupabaseRequirementService } from '../services/supabase-requirement-service'
import { mockUsers } from '../services/requirement-service'
import { useAuth } from '../hooks/use-auth'

// 统一的表单验证模式
const formSchema = z.object({
  title: z.string().min(2, { message: '标题至少需要2个字符' }).max(100, { message: '标题最多100个字符' }),
  description: z.string().min(10, { message: '描述至少需要10个字符' }),
  status: z.enum(['pending', 'inProgress', 'completed', 'overdue']),
  priority: z.enum(['high', 'medium', 'low']),
  assigneeId: z.string(),
  department: z.string(),
  dueDate: z.date().optional(),
  tags: z.string().optional(),
  // 技术部字段
  techStack: z.string().optional(),
  complexity: z.enum(['low', 'medium', 'high']).optional(),
  estimatedHours: z.string().optional(),
  repositoryUrl: z.string().optional(),
  // 创意部字段
  creativeType: z.string().optional(),
  targetAudience: z.string().optional(),
  brandGuidelines: z.string().optional(),
  deliverables: z.string().optional()
})

type FormValues = z.infer<typeof formSchema>

export default function RequirementForm() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()
  const { user } = useAuth()
  const isEditMode = !!id

  // 从 URL 参数获取部门信息
  const departmentParam = searchParams.get('department')
  const presetDepartment = departmentParam === 'tech' ? '技术部' 
    : departmentParam === 'creative' ? '创意部' 
    : ''

  const [selectedDepartment, setSelectedDepartment] = useState(presetDepartment || '技术部')

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      status: 'pending',
      priority: 'medium',
      assigneeId: 'unassigned',
      department: selectedDepartment,
      tags: '',
      techStack: '',
      complexity: 'medium',
      estimatedHours: '',
      repositoryUrl: '',
      creativeType: '',
      targetAudience: '',
      brandGuidelines: '',
      deliverables: ''
    }
  })

  useEffect(() => {
    const fetchRequirement = async () => {
      if (!id) return
      
      setIsLoading(true)
      try {
        const data = await SupabaseRequirementService.getRequirementById(id)
        if (data) {
          setSelectedDepartment(data.department)
          form.reset({
            title: data.title,
            description: data.description,
            status: data.status,
            priority: data.priority,
            assigneeId: data.assignee?.id || 'unassigned',
            department: data.department,
            dueDate: data.due_date ? new Date(data.due_date) : undefined,
            tags: data.tags.join(', '),
            techStack: data.extra?.techStack || '',
            complexity: data.extra?.complexity || 'medium',
            estimatedHours: data.extra?.estimatedHours || '',
            repositoryUrl: data.extra?.repositoryUrl || '',
            creativeType: data.extra?.creativeType || '',
            targetAudience: data.extra?.targetAudience || '',
            brandGuidelines: data.extra?.brandGuidelines || '',
            deliverables: data.extra?.deliverables || ''
          })
        } else {
          console.error('需求不存在')
          navigate('/requirements')
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

      // 构建部门特有的额外数据
      const extraData: any = {}
      if (selectedDepartment === '技术部') {
        extraData.techStack = values.techStack
        extraData.complexity = values.complexity
        extraData.estimatedHours = values.estimatedHours
        extraData.repositoryUrl = values.repositoryUrl
      } else if (selectedDepartment === '创意部') {
        extraData.creativeType = values.creativeType
        extraData.targetAudience = values.targetAudience
        extraData.brandGuidelines = values.brandGuidelines
        extraData.deliverables = values.deliverables
      }

      const requirementData = {
        title: values.title,
        description: values.description,
        status: values.status,
        priority: values.priority,
        submitter: {
          id: user.id,
          name: user.name,
          avatar: user.avatar
        },
        assignee,
        department: values.department,
        type: selectedDepartment === '技术部' ? 'tech' as const : selectedDepartment === '创意部' ? 'creative' as const : undefined,
        due_date: values.dueDate ? format(values.dueDate, 'yyyy-MM-dd') : null,
        tags: tagsArray,
        extra: extraData
      }

      if (isEditMode && id) {
        await SupabaseRequirementService.updateRequirement(id, requirementData)
      } else {
        await SupabaseRequirementService.createRequirement(requirementData)
      }
      
      navigate('/requirements')
    } catch (error) {
      console.error('保存需求失败:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDepartmentChange = (newDepartment: string) => {
    setSelectedDepartment(newDepartment)
    form.setValue('department', newDepartment)
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
            请填写以下表单，提供需求的详细信息。不同部门会显示相应的专业字段。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* 基础信息 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">基础信息</h3>
                
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>需求标题 *</FormLabel>
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
                      <FormLabel>需求描述 *</FormLabel>
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
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>所属部门 *</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value)
                            handleDepartmentChange(value)
                          }} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="选择部门" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="技术部">技术部</SelectItem>
                            <SelectItem value="创意部">创意部</SelectItem>
                            <SelectItem value="产品部">产品部</SelectItem>
                            <SelectItem value="市场部">市场部</SelectItem>
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
                        <FormLabel>优先级 *</FormLabel>
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
              </div>

              {/* 技术部特有字段 */}
              {selectedDepartment === '技术部' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">技术部专业字段</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="techStack"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>技术栈</FormLabel>
                          <FormControl>
                            <Input placeholder="如：React, Node.js, PostgreSQL" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="complexity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>复杂度</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="选择复杂度" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">低</SelectItem>
                              <SelectItem value="medium">中</SelectItem>
                              <SelectItem value="high">高</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="estimatedHours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>预估工时（小时）</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="如：40" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="repositoryUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>代码仓库地址</FormLabel>
                          <FormControl>
                            <Input placeholder="https://github.com/..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              {/* 创意部特有字段 */}
              {selectedDepartment === '创意部' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">创意部专业字段</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="creativeType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>创意类型</FormLabel>
                          <FormControl>
                            <Input placeholder="如：海报设计、视频制作、品牌设计" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="targetAudience"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>目标受众</FormLabel>
                          <FormControl>
                            <Input placeholder="如：18-35岁年轻用户" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="brandGuidelines"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>品牌指导原则</FormLabel>
                          <FormControl>
                            <Textarea placeholder="品牌色彩、字体、风格要求等..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="deliverables"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>交付物</FormLabel>
                          <FormControl>
                            <Textarea placeholder="如：PSD源文件、PNG/JPG输出、字体文件等..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}
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