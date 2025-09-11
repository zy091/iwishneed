import { Edit, ExternalLink, ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import RequirementComments from '@/components/RequirementComments'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { techRequirementService } from '@/services/tech-requirement-service'
import type { TechRequirement } from '@/types/requirement'

export default function TechRequirementDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<TechRequirement | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const run = async () => {
      if (!id) return
      try {
        const res = await techRequirementService.getTechRequirement(id)
        setData(res)
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [id])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
      </div>
    )
  }

  if (!data || !id) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">未找到该技术需求</CardTitle>
            <CardDescription className="text-center">请返回列表重试</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button variant="outline" onClick={() => navigate('/departments/tech')}>返回技术需求列表</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleGoBack = () => {
    // 使用更可靠的后退逻辑
    try {
      // 尝试后退，如果没有历史记录会自动处理
      window.history.back();
      
      // 设置一个超时，如果后退没有生效（比如这是第一个页面），则导航到列表页
      setTimeout(() => {
        // 检查当前URL是否还是详情页，如果是则说明后退没有生效
        if (window.location.pathname.includes('/tech-requirements/') && window.location.pathname.includes('/')) {
          navigate('/departments/tech');
        }
      }, 100);
    } catch (error) {
      // 如果出现错误，直接导航到列表页
      navigate('/departments/tech');
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleGoBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          返回
        </Button>
      </div>
      
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold min-w-0 truncate">{data.title}</h1>
        <div className="flex gap-2 flex-wrap justify-end">
          <Button onClick={() => navigate(`/tech-requirements/${id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" /> 编辑
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>需求详情</CardTitle>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline">{
                  data.urgency === 'high' ? '高' : data.urgency === 'medium' ? '中' : '低'
                }·紧急程度</Badge>
                <Badge variant="outline">{
                  data.client_type === 'traffic_operation' ? '流量运营服务' : '全案深度服务'
                }</Badge>
                {data.progress && <Badge className="bg-blue-500">{
                  data.progress === 'not_started' ? '未开始' :
                  data.progress === 'in_progress' ? '处理中' :
                  data.progress === 'completed' ? '已完成' :
                  data.progress === 'delayed' ? '已沟通延迟' : '未知'
                }</Badge>}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm text-gray-600">月份：{data.month}</div>
                <div className="text-sm text-gray-600">提交人：{data.submitter_name}</div>
                {data.client_url && (
                  <div className="text-sm text-gray-600">
                    客户网址：
                    <a href={data.client_url} target="_blank" rel="noreferrer" className="text-blue-600 inline-flex items-center gap-1">
                      链接 <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                )}
                <Separator />
                <div className="whitespace-pre-wrap">{data.description}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <RequirementComments requirementId={id} requirementType="tech" />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>时间与负责人</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-gray-700">
                <div>期望完成时间：{data.expected_completion_time || '-'}</div>
                <div>技术负责人：{data.tech_assignee || '未分配'}</div>
                <div>负责人预计完成：{data.assignee_estimated_time || '-'}</div>
                <div>开始时间：{data.start_time || '-'}</div>
                <div>结束时间：{data.end_time || '-'}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}