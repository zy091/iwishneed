import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Edit, ExternalLink } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Comments from '@/components/Comments'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { creativeRequirementService } from '@/services/creative-requirement-service'
import type { CreativeRequirement } from '@/types/requirement'

export default function CreativeRequirementDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<CreativeRequirement | null>(null)
  const [loading, setLoading] = useState(true)

  const statusBadge = (s?: string) => {
    switch (s) {
      case '已完成':
        return <Badge className="bg-green-500 text-white">已完成</Badge>
      case '处理中':
        return <Badge className="bg-blue-500 text-white">处理中</Badge>
      case '未开始':
        return <Badge className="bg-gray-500 text-white">未开始</Badge>
      case '不做处理':
        return <Badge className="bg-orange-500 text-white">不做处理</Badge>
      default:
        return <Badge variant="outline">{s || '-'}</Badge>
    }
  }

  const urgencyBadge = (u?: string) => {
    switch (u) {
      case '高':
        return <Badge className="bg-red-500 text-white">高</Badge>
      case '中':
        return <Badge className="bg-yellow-500 text-white">中</Badge>
      case '低':
        return <Badge className="bg-green-500 text-white">低</Badge>
      default:
        return <Badge variant="outline">{u || '-'}</Badge>
    }
  }

  const assetTypeBadge = (type?: string) => {
    const colorMap: Record<string, string> = {
      'Google广告素材': 'bg-blue-600 text-white',
      'Meta广告素材': 'bg-indigo-600 text-white',
      '网站Banner素材': 'bg-purple-600 text-white',
      '网站产品素材': 'bg-pink-600 text-white',
      '网站横幅素材': 'bg-cyan-600 text-white',
      '联盟营销': 'bg-teal-600 text-white',
      'EDM营销': 'bg-emerald-600 text-white',
      'Criteo广告素材': 'bg-amber-600 text-white'
    }
    const className = colorMap[type || ''] || 'bg-gray-500 text-white'
    return <Badge className={className}>{type || '-'}</Badge>
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-'
    return format(new Date(dateStr), 'yyyy年MM月dd日', { locale: zhCN })
  }

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
                {urgencyBadge(data.urgency)}
                <Badge variant="outline">{data.platform}</Badge>
                {statusBadge(data.status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-gray-700">
                <div>提交人：{data.submitter_name || '-'}</div>
                <div>设计师：{data.designer || '-'}</div>
                <div className="flex items-center gap-2">素材类型：{assetTypeBadge(data.asset_type)}</div>
                <div>尺寸：{data.asset_size || '-'}</div>
                <div>数量：{data.asset_count ?? '-'}</div>
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

          <Comments requirementId={id} />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>时间信息</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-gray-700">
                <div>提交时间：{formatDate(data.submit_time)}</div>
                <div>期望交付：{formatDate(data.expected_delivery_time)}</div>
                <div>实际交付：{formatDate(data.actual_delivery_time)}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}