import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { techRequirementService } from '@/services/tech-requirement-service'
import type { TechRequirement as ServiceTechRequirement } from '@/services/tech-requirement-service'
import Comments from '@/components/Comments'
import { Edit, ExternalLink } from 'lucide-react'

export default function TechRequirementDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<ServiceTechRequirement | null>(null)
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
            <CardTitle className="text-center">未找到该技术需�?/CardTitle>
            <CardDescription className="text-center">请返回列表重�?/CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button variant="outline" onClick={() => navigate('/departments/tech')}>返回技术需求列�?/Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
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
              <CardTitle>需求详�?/CardTitle>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline">{data.urgency}·紧急程�?/Badge>
                <Badge variant="outline">{data.client_type}</Badge>
                {data.progress && <Badge className="bg-blue-500">{data.progress}</Badge>}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm text-gray-600">月份：{data.month}</div>
                <div className="text-sm text-gray-600">提交人：{data.submitter_name}</div>
                {data.client_url && (
                  <div className="text-sm text-gray-600">
                    客户网址�?
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

          <Comments requirementId={id} />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>时间与负责人</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-gray-700">
                <div>期望完成时间：{data.expected_completion_time || '-'}</div>
                <div>技术负责人：{data.tech_assignee || '未分�?}</div>
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
