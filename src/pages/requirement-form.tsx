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
import { CalendarIcon } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'
import { RequirementService, Requirement } from '@/services/requirement-service'

// 创意部表单验证
const creativeSchema = z.object({
  title: z.string().min(1, '需求标题不能为空'),
  description: z.string().min(1, '需求描述不能为空'),
  priority: z.enum(['low', 'medium', 'high'], { required_error: '请选择优先级' }),
  category: z.string().min(1, '请选择分类'),
  expected_completion_date: z.date().optional(),
})

type CreativeForm = z.infer<typeof creativeSchema>

export default function RequirementForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [requirement, setRequirement] = useState<Requirement | null>(null)
  const [loading, setLoading] = useState(false)
  
  const isEdit = !!id
  
  // 表单设置
  const form = useForm<CreativeForm>({
    resolver: zodResolver(creativeSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'medium',
      category: '',
    }
  })

  // 加载数据
  useEffect(() => {
    const loadData = async () => {
      if (isEdit && id) {
        try {
          const req = await RequirementService.getRequirementById(id)
          if (req) {
            setRequirement(req)
            form.reset({
              title: req.title,
              description: req.description || '',
              priority: req.priority || 'medium',
              category: req.category || '',
              expected_completion_date: req.expected_completion_date 
                ? new Date(req.expected_completion_date) 
                : undefined,
            })
          }
        } catch (error) {
          console.error('加载需求失败:', error)
        }
      }
    }

    loadData()
  }, [id, isEdit, form])

  // 提交表单
  const onSubmit = async (data: CreativeForm) => {
    if (!user) return
    
    setLoading(true)
    try {
      const reqData: Partial<Requirement> = {
        title: data.title,
        description: data.description,
        priority: data.priority,
        category: data.category,
        expected_completion_date: data.expected_completion_date?.toISOString(),
        submitter_id: user.id,
        submitter_name: user.name,
        submitter_avatar: user.avatar,
      }

      if (isEdit && id) {
        await RequirementService.updateRequirement(id, reqData, user)
      } else {
        await RequirementService.createRequirement(reqData, user)
      }

      navigate('/requirements')
    } catch (error) {
      console.error('保存失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTitle = () => {
    return isEdit ? '编辑创意需求' : '提交创意需求'
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{getTitle()}</h1>
        <Button variant="secondary" onClick={() => navigate('/requirements')}>
          返回列表
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>创意需求信息</CardTitle>
          <CardDescription>请填写完整的创意需求信息</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>优先级 *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>分类 *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="选择分类" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="design">设计</SelectItem>
                          <SelectItem value="video">视频</SelectItem>
                          <SelectItem value="copywriting">文案</SelectItem>
                          <SelectItem value="branding">品牌</SelectItem>
                          <SelectItem value="other">其他</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="expected_completion_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>期望完成时间</FormLabel>
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

              <div className="flex justify-end gap-4">
                <Button type="button" variant="secondary" onClick={() => navigate('/requirements')}>
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