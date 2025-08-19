import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { CalendarIcon, X } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'
import { techRequirementService, TechRequirement } from '@/services/tech-requirement-service'

// 技术需求表单验证
const techRequirementSchema = z.object({
  title: z.string().min(1, '需求标题不能为空'),
  month: z.string().min(1, '月份不能为空'),
  expected_completion_time: z.date({ required_error: '期望完成时间不能为空' }),
  urgency: z.enum(['高', '中', '低'], { required_error: '请选择紧急程度' }),
  client_url: z.string().url('请输入有效的网址').optional().or(z.literal('')),
  description: z.string().min(1, '具体需求描述不能为空'),
  tech_assignee: z.string().optional(),
  client_type: z.enum(['流量运营服务', '全案深度服务'], { required_error: '请选择客户类型' }),
  assignee_estimated_time: z.date().optional(),
  progress: z.enum(['未开始', '处理中', '已完成', '已沟通延迟']).optional(),
})

type TechRequirementForm = z.infer<typeof techRequirementSchema>

export default function TechRequirementForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [requirement, setRequirement] = useState<TechRequirement | null>(null)
  const [techAssignees, setTechAssignees] = useState<string[]>([])
  const [attachments, setAttachments] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  
  const isEdit = !!id

  const form = useForm<TechRequirementForm>({
    resolver: zodResolver(techRequirementSchema),
    defaultValues: {
      title: '',
      month: new Date().getFullYear() + '年' + (new Date().getMonth() + 1) + '月',
      expected_completion_time: new Date(),
      urgency: '中',
      client_url: '',
      description: '',
      // 重要：Radix Select 禁止空字符串，使用占位值
      tech_assignee: '__none__',
      client_type: '流量运营服务',
      assignee_estimated_time: undefined,
      progress: '未开始',
    }
  })

  // 加载数据
  useEffect(() => {
    const loadData = async () => {
      try {
        // 加载技术负责人列表
        const assignees = await techRequirementService.getTechAssignees()
        setTechAssignees(assignees)

        // 加载需求详情
        if (isEdit && id) {
          const req = await techRequirementService.getTechRequirement(id)
          if (req) {
            setRequirement(req)
            form.reset({
              title: req.title,
              month: req.month,
              expected_completion_time: req.expected_completion_time ? new Date(req.expected_completion_time) : new Date(),
              urgency: req.urgency,
              client_url: req.client_url || '',
              description: req.description,
              // 编辑态：为空时也使用占位值
              tech_assignee: (req.tech_assignee && req.tech_assignee.trim() !== '') ? req.tech_assignee : '__none__',
              client_type: req.client_type,
              assignee_estimated_time: req.assignee_estimated_time ? new Date(req.assignee_estimated_time) : undefined,
              progress: req.progress || '未开始',
            })
          }
        }
      } catch (error) {
        console.error('加载数据失败:', error)
      }
    }

    loadData()
  }, [id, isEdit, form])

  // 处理文件上传
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setAttachments(prev => [...prev, ...files])
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  // 提交表单
  const onSubmit = async (data: TechRequirementForm) => {
    if (!user) return
    
    setLoading(true)
    try {
      const techData: Omit<TechRequirement, 'id' | 'created_at' | 'updated_at'> = {
        title: data.title,
        month: data.month,
        expected_completion_time: data.expected_completion_time.toISOString(),
        urgency: data.urgency,
        submitter_name: user.name,
        client_url: data.client_url || undefined,
        description: data.description,
        // 映射占位值为 undefined，避免写入无效值
        tech_assignee: (data.tech_assignee && data.tech_assignee !== '__none__') ? data.tech_assignee : undefined,
        client_type: data.client_type,
        attachments: attachments.map(f => ({ name: f.name, size: f.size, type: f.type })),
        assignee_estimated_time: data.assignee_estimated_time?.toISOString(),
        progress: data.progress || '未开始',
        submitter_id: user.id,
        submitter_avatar: user.avatar,
      }

      if (isEdit && id) {
        await techRequirementService.updateTechRequirement(id, techData)
      } else {
        await techRequirementService.createTechRequirement(techData)
      }

      navigate('/departments/tech')
    } catch (error) {
      console.error('保存失败:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{isEdit ? '编辑技术需求' : '提交技术需求'}</h1>
        <Button variant="secondary" onClick={() => navigate('/departments/tech')}>
          返回列表
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>技术需求信息</CardTitle>
          <CardDescription>请按照飞书表格格式填写完整的技术需求信息</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* 基础信息 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>需求标题 *</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入需求标题" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="month"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>月份 *</FormLabel>
                      <FormControl>
                        <Input placeholder="如：2024年1月" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>具体需求描述 *</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="请详细描述需求内容、功能要求、预期效果等"
                        className="min-h-[120px]"
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
                  name="expected_completion_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>期望完成的时间 *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: zhCN })
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
                            disabled={(date) => date < new Date()}
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
                  name="urgency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>紧急程度 *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="选择紧急程度" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="高">高</SelectItem>
                          <SelectItem value="中">中</SelectItem>
                          <SelectItem value="低">低</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="client_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>需支持的客户网址</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="client_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>客户类型（流量运营服务/全案深度服务） *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="选择客户类型" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="流量运营服务">流量运营服务</SelectItem>
                          <SelectItem value="全案深度服务">全案深度服务</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* 技术负责人字段 */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium mb-4">技术负责人处理信息</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="tech_assignee"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>技术负责人</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? '__none__'}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="选择技术负责人" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__none__">未分配</SelectItem>
                            {techAssignees.map((assignee) => (
                              <SelectItem key={assignee} value={assignee}>
                                {assignee}
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
                    name="progress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>技术完成进度（未开始/处理中/已完成/已沟通延迟）</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="选择进度状态" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="未开始">未开始</SelectItem>
                            <SelectItem value="处理中">处理中</SelectItem>
                            <SelectItem value="已完成">已完成</SelectItem>
                            <SelectItem value="已沟通延迟">已沟通延迟</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="mt-6">
                  <FormField
                    control={form.control}
                    name="assignee_estimated_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>技术负责人预计可完成时间</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP", { locale: zhCN })
                                ) : (
                                  <span>选择预计完成时间</span>
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
                              disabled={(date) => date < new Date()}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* 附件上传 */}
              <div>
                <FormLabel>支持上传附件</FormLabel>
                <div className="mt-2">
                  <Input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="mb-2"
                  />
                  {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {attachments.map((file, index) => (
                        <Badge key={index} variant="secondary" className="flex items-center gap-1">
                          {file.name}
                          <X 
                            className="h-3 w-3 cursor-pointer" 
                            onClick={() => removeAttachment(index)}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-4">
                <Button type="button" variant="secondary" onClick={() => navigate('/departments/tech')}>
                  取消
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? '保存中...' : (isEdit ? '更新需求' : '提交需求')}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}