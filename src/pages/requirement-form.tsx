import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
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
import { Separator } from '@/components/ui/separator'
import { CalendarIcon, Upload, X } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'
import { supabaseRequirementService, TechRequirement, CreativeRequirement, TechAssignee } from '@/services/supabase-requirement-service'

// 技术部表单验证 - 提交人字段
const techSubmitterSchema = z.object({
  title: z.string().min(1, '需求标题不能为空'),
  description: z.string().min(1, '具体需求描述不能为空'),
  tech_month: z.string().min(1, '月份不能为空'),
  tech_expected_completion_time: z.date({ required_error: '期望完成时间不能为空' }),
  tech_urgency: z.enum(['高', '中', '低'], { required_error: '请选择紧急程度' }),
  tech_client_url: z.string().url('请输入有效的网址').optional().or(z.literal('')),
  tech_client_type: z.enum(['流量运营服务', '全案深度服务'], { required_error: '请选择客户类型' }),
})

// 技术部表单验证 - 技术负责人字段
const techAssigneeSchema = z.object({
  tech_assignee: z.string().min(1, '技术负责人不能为空'),
  tech_estimated_completion_time: z.date().optional(),
  tech_progress: z.enum(['未开始', '处理中', '已完成', '已沟通延迟']),
})

// 创意部表单验证
const creativeSchema = z.object({
  title: z.string().min(1, '需求标题不能为空'),
  description: z.string().min(1, '需求描述不能为空'),
  creative_type: z.string().min(1, '创意类型不能为空'),
  creative_target_audience: z.string().min(1, '目标受众不能为空'),
  creative_brand_guidelines: z.string().optional(),
  creative_deliverables: z.string().min(1, '交付物不能为空'),
})

type TechSubmitterForm = z.infer<typeof techSubmitterSchema>
type TechAssigneeForm = z.infer<typeof techAssigneeSchema>
type CreativeForm = z.infer<typeof creativeSchema>

export default function RequirementForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  
  const [requirement, setRequirement] = useState<TechRequirement | CreativeRequirement | null>(null)
  const [techAssignees, setTechAssignees] = useState<TechAssignee[]>([])
  const [attachments, setAttachments] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  
  // 确定部门和模式
  const departmentParam = searchParams.get('department')
  const mode = searchParams.get('mode') // 'submitter' | 'assignee'
  const isEdit = !!id
  const isTech = departmentParam === 'tech' || requirement?.type === 'tech'
  const isAssigneeMode = mode === 'assignee'
  
  // 表单设置
  const techSubmitterForm = useForm<TechSubmitterForm>({
    resolver: zodResolver(techSubmitterSchema),
    defaultValues: {
      title: '',
      description: '',
      tech_month: new Date().getFullYear() + '年' + (new Date().getMonth() + 1) + '月',
      tech_urgency: '中',
      tech_client_url: '',
      tech_client_type: '流量运营服务',
    }
  })

  const techAssigneeForm = useForm<TechAssigneeForm>({
    resolver: zodResolver(techAssigneeSchema),
    defaultValues: {
      tech_assignee: '',
      tech_progress: '未开始',
    }
  })

  const creativeForm = useForm<CreativeForm>({
    resolver: zodResolver(creativeSchema),
    defaultValues: {
      title: '',
      description: '',
      creative_type: '',
      creative_target_audience: '',
      creative_brand_guidelines: '',
      creative_deliverables: '',
    }
  })

  // 加载数据
  useEffect(() => {
    const loadData = async () => {
      try {
        // 加载技术负责人列表
        if (isTech) {
          const assignees = await supabaseRequirementService.getTechAssignees()
          setTechAssignees(assignees)
        }

        // 加载需求详情
        if (isEdit && id) {
          const req = await supabaseRequirementService.getRequirement(id)
          if (req) {
            setRequirement(req)
            
            if (req.type === 'tech') {
              const techReq = req as TechRequirement
              
              if (isAssigneeMode) {
                // 技术负责人模式
                techAssigneeForm.reset({
                  tech_assignee: techReq.tech_assignee || '',
                  tech_estimated_completion_time: techReq.tech_estimated_completion_time 
                    ? new Date(techReq.tech_estimated_completion_time) 
                    : undefined,
                  tech_progress: techReq.tech_progress || '未开始',
                })
              } else {
                // 提交人模式
                techSubmitterForm.reset({
                  title: techReq.title,
                  description: techReq.description || '',
                  tech_month: techReq.tech_month || '',
                  tech_expected_completion_time: techReq.tech_expected_completion_time 
                    ? new Date(techReq.tech_expected_completion_time) 
                    : new Date(),
                  tech_urgency: techReq.tech_urgency || '中',
                  tech_client_url: techReq.tech_client_url || '',
                  tech_client_type: techReq.tech_client_type || '流量运营服务',
                })
              }
            } else {
              // 创意部
              const creativeReq = req as CreativeRequirement
              creativeForm.reset({
                title: creativeReq.title,
                description: creativeReq.description || '',
                creative_type: creativeReq.creative_type || '',
                creative_target_audience: creativeReq.creative_target_audience || '',
                creative_brand_guidelines: creativeReq.creative_brand_guidelines || '',
                creative_deliverables: creativeReq.creative_deliverables || '',
              })
            }
          }
        }
      } catch (error) {
        console.error('加载数据失败:', error)
      }
    }

    loadData()
  }, [id, isEdit, isTech, isAssigneeMode])

  // 处理文件上传
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setAttachments(prev => [...prev, ...files])
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  // 提交表单
  const onSubmit = async (data: any) => {
    if (!user) return
    
    setLoading(true)
    try {
      if (isTech && isAssigneeMode) {
        // 技术负责人更新字段
        if (id) {
          await supabaseRequirementService.updateTechAssigneeFields(id, {
            tech_assignee: data.tech_assignee,
            tech_estimated_completion_time: data.tech_estimated_completion_time?.toISOString(),
            tech_progress: data.tech_progress,
          })
        }
      } else if (isTech) {
        // 技术部提交人字段
        const techData: Partial<TechRequirement> = {
          title: data.title,
          description: data.description,
          department: '技术部',
          type: 'tech',
          submitter: {
            id: user.id,
            name: user.name,
            avatar: user.avatar,
          },
          tech_month: data.tech_month,
          tech_expected_completion_time: data.tech_expected_completion_time.toISOString(),
          tech_urgency: data.tech_urgency,
          tech_client_url: data.tech_client_url,
          tech_client_type: data.tech_client_type,
          tech_attachments: attachments.map(f => ({ name: f.name, size: f.size, type: f.type })),
        }

        if (isEdit && id) {
          await supabaseRequirementService.updateRequirement(id, techData)
        } else {
          await supabaseRequirementService.createRequirement(techData)
        }
      } else {
        // 创意部
        const creativeData: Partial<CreativeRequirement> = {
          title: data.title,
          description: data.description,
          department: '创意部',
          type: 'creative',
          submitter: {
            id: user.id,
            name: user.name,
            avatar: user.avatar,
          },
          creative_type: data.creative_type,
          creative_target_audience: data.creative_target_audience,
          creative_brand_guidelines: data.creative_brand_guidelines,
          creative_deliverables: data.creative_deliverables,
        }

        if (isEdit && id) {
          await supabaseRequirementService.updateRequirement(id, creativeData)
        } else {
          await supabaseRequirementService.createRequirement(creativeData)
        }
      }

      // 返回对应页面
      if (isTech) {
        navigate('/departments/tech')
      } else {
        navigate('/departments/creative')
      }
    } catch (error) {
      console.error('保存失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTitle = () => {
    if (isEdit) {
      if (isTech && isAssigneeMode) return '技术负责人处理'
      if (isTech) return '编辑技术需求'
      return '编辑创意需求'
    }
    if (isTech) return '提交技术需求'
    return '提交创意需求'
  }

  const getReturnPath = () => {
    if (isTech) return '/departments/tech'
    return '/departments/creative'
  }

  // 技术部提交人表单
  if (isTech && !isAssigneeMode) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">{getTitle()}</h1>
          <Button variant="secondary" onClick={() => navigate(getReturnPath())}>
            返回列表
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>技术需求信息</CardTitle>
            <CardDescription>请填写完整的需求信息，技术负责人将根据这些信息进行处理</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...techSubmitterForm}>
              <form onSubmit={techSubmitterForm.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={techSubmitterForm.control}
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
                    control={techSubmitterForm.control}
                    name="tech_month"
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
                  control={techSubmitterForm.control}
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
                    control={techSubmitterForm.control}
                    name="tech_expected_completion_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>期望完成时间 *</FormLabel>
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
                    control={techSubmitterForm.control}
                    name="tech_urgency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>紧急程度 *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    control={techSubmitterForm.control}
                    name="tech_client_url"
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
                    control={techSubmitterForm.control}
                    name="tech_client_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>客户类型 *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                <Button type="button" variant="secondary" onClick={() => navigate(getReturnPath())}>
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

  // 技术负责人处理表单
  if (isTech && isAssigneeMode) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">{getTitle()}</h1>
          <Button variant="secondary" onClick={() => navigate(getReturnPath())}>
            返回列表
          </Button>
        </div>

        {requirement && (
          <div className="space-y-6">
            {/* 需求基本信息展示 */}
            <Card>
              <CardHeader>
                <CardTitle>需求基本信息</CardTitle>
                <CardDescription>提交人填写的需求信息</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">需求标题</label>
                    <p className="mt-1">{requirement.title}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">月份</label>
                    <p className="mt-1">{(requirement as TechRequirement).tech_month || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">期望完成时间</label>
                    <p className="mt-1">
                      {(requirement as TechRequirement).tech_expected_completion_time 
                        ? format(new Date((requirement as TechRequirement).tech_expected_completion_time!), "PPP", { locale: zhCN })
                        : '-'
                      }
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">紧急程度</label>
                    <p className="mt-1">
                      <Badge variant={(requirement as TechRequirement).tech_urgency === '高' ? 'destructive' : 'secondary'}>
                        {(requirement as TechRequirement).tech_urgency || '-'}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">客户网址</label>
                    <p className="mt-1">{(requirement as TechRequirement).tech_client_url || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">客户类型</label>
                    <p className="mt-1">{(requirement as TechRequirement).tech_client_type || '-'}</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">具体需求描述</label>
                  <p className="mt-1 whitespace-pre-wrap">{requirement.description}</p>
                </div>
              </CardContent>
            </Card>

            {/* 技术负责人处理表单 */}
            <Card>
              <CardHeader>
                <CardTitle>技术负责人处理</CardTitle>
                <CardDescription>请填写技术处理相关信息</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...techAssigneeForm}>
                  <form onSubmit={techAssigneeForm.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={techAssigneeForm.control}
                        name="tech_assignee"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>技术负责人 *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="选择技术负责人" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {techAssignees.map((assignee) => (
                                  <SelectItem key={assignee.id} value={assignee.name}>
                                    {assignee.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={techAssigneeForm.control}
                        name="tech_progress"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>技术完成进度 *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
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

                    <FormField
                      control={techAssigneeForm.control}
                      name="tech_estimated_completion_time"
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

                    <div className="flex justify-end gap-4">
                      <Button type="button" variant="secondary" onClick={() => navigate(getReturnPath())}>
                        取消
                      </Button>
                      <Button type="submit" disabled={loading}>
                        {loading ? '保存中...' : '更新处理信息'}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    )
  }

  // 创意部表单
  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{getTitle()}</h1>
        <Button variant="secondary" onClick={() => navigate(getReturnPath())}>
          返回列表
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>创意需求信息</CardTitle>
          <CardDescription>请填写完整的创意需求信息</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...creativeForm}>
            <form onSubmit={creativeForm.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={creativeForm.control}
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
                control={creativeForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>需求描述 *</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="请详细描述创意需求"
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
                  control={creativeForm.control}
                  name="creative_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>创意类型 *</FormLabel>
                      <FormControl>
                        <Input placeholder="如：海报设计、视频制作等" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={creativeForm.control}
                  name="creative_target_audience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>目标受众 *</FormLabel>
                      <FormControl>
                        <Input placeholder="请描述目标受众群体" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={creativeForm.control}
                name="creative_brand_guidelines"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>品牌指南</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="请描述品牌相关要求和指南"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={creativeForm.control}
                name="creative_deliverables"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>交付物 *</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="请详细描述需要交付的内容和格式"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-4">
                <Button type="button" variant="secondary" onClick={() => navigate(getReturnPath())}>
                  取消
                </Button>