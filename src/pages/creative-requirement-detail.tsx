import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { creativeRequirementService } from '@/services/creative-requirement-service'
import type { CreativeRequirement } from '@/services/creative-requirement-service'

import EnterpriseCommentsV2 from '@/components/enterprise-comments-v2'
import { Edit, ExternalLink } from 'lucide-react'

export default function CreativeRequirementDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<CreativeRequirement | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const run = async () => {
      if (!id) return
      try {
        const res = await creativeRequirementService.getCreativeRequirement(id)
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
            <CardTitle className="text-center">未找到该创意需求</CardTitle>
            <CardDescription className="text-center">请返回列表重试</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button variant="outline" onClick={() => navigate('/departments/creative')}>返回创意需求列表</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold min-w-0 truncate">{data.site_name || '-'}</h1>
        <div className="flex gap-2 flex-wrap justify-end">
          <Button onClick={() => navigate(`/creative-requirements/${id}/edit`)}>
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
                <Badge variant="outline">{data.urgency}·紧急程度</Badge>
                <Badge variant="outline">{data.platform}</Badge>
                <Badge className="bg-blue-500">{data.status}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-gray-700">
                <div>提交人：{data.submitter_name || '-'}</div>
                <div>设计师：{data.designer || '-'}</div>
                <div>素材类型：{data.asset_type || '-'}</div>
                <div>尺寸：{data.asset_size || '-'}</div>
                <div>数量：{(data.asset_count ?? '-') as any}</div>
                {data.url_or_product_page && (
                  <div>
                    网址/产品页：
                    <a href={data.url_or_product_page} target="_blank" rel="noreferrer" className="text-blue-600 inline-flex items-center gap-1">
                      链接 <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <EnterpriseCommentsV2 requirementId={id} />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>时间信息</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-gray-700">
                <div>提交时间：{data.submit_time || '-'}</div>
                <div>期望交付：{data.expected_delivery_time || '-'}</div>
                <div>实际交付：{data.actual_delivery_time || '-'}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}