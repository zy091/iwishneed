import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search, Plus, Upload, Edit, Trash2, Eye } from 'lucide-react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { creativeRequirementService, CreativeRequirement } from '@/services/creative-requirement-service'

export default function CreativeRequirementList() {
  const [list, setList] = useState<CreativeRequirement[]>([])
  const [filtered, setFiltered] = useState<CreativeRequirement[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const run = async () => {
      try {
        const data = await creativeRequirementService.getCreativeRequirements()
        setList(data)
        setFiltered(data)
      } catch (e) {
        console.error('获取创意部需求失败:', e)
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [])

  useEffect(() => {
    let res = list
    if (search) {
      const q = search.toLowerCase()
      res = res.filter(r =>
        (r.submitter_name || '').toLowerCase().includes(q) ||
        (r.designer || '').toLowerCase().includes(q) ||
        (r.site_name || '').toLowerCase().includes(q) ||
        (r.asset_type || '').toLowerCase().includes(q)
      )
    }
    setFiltered(res)
  }, [search, list])

  const handleDelete = async (id?: string) => {
    if (!id) return
    try {
      await creativeRequirementService.deleteCreativeRequirement(id)
      setList(prev => prev.filter(x => x.id !== id))
    } catch (e) {
      console.error('删除创意需求失败:', e)
    }
  }

  const statusBadge = (s?: string) => {
    switch (s) {
      case '已完成':
        return <Badge className="bg-green-500">已完成</Badge>
      case '处理中':
        return <Badge className="bg-blue-500">处理中</Badge>
      case '未开始':
        return <Badge className="bg-gray-500">未开始</Badge>
      case '不做处理':
        return <Badge className="bg-orange-500">不做处理</Badge>
      default:
        return <Badge variant="outline">{s || '-'}</Badge>
    }
  }

  return (
    <div className="container mx-auto py-6 px-3 overflow-x-hidden">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">创意部 - 需求列表</h1>
        <div className="flex gap-2 flex-wrap justify-end">
          <Button variant="outline" onClick={() => navigate('/requirements/import?department=creative')}>
            <Upload className="mr-2 h-4 w-4" /> 批量导入
          </Button>
          <Button onClick={() => navigate('/creative-requirements/new')}>
            <Plus className="mr-2 h-4 w-4" /> 新建创意需求
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>筛选条件</CardTitle>
          <CardDescription>搜索提交人、设计师、网站名称或素材类型</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              type="search"
              placeholder="搜索..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto w-full">
            <Table className="min-w-[1600px] whitespace-nowrap">
              <TableHeader>
                <TableRow>
                  <TableHead>提交时间</TableHead>
                  <TableHead>期望交付</TableHead>
                  <TableHead>实际交付</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>紧急程度</TableHead>
                  <TableHead>设计师</TableHead>
                  <TableHead>平台</TableHead>
                  <TableHead>网站名称</TableHead>
                  <TableHead>网址/产品页</TableHead>
                  <TableHead>素材类型</TableHead>
                  <TableHead>尺寸</TableHead>
                  <TableHead>数量</TableHead>
                  <TableHead>提交人</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length ? filtered.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>{r.submit_time ? format(new Date(r.submit_time), 'PPP', { locale: zhCN }) : '-'}</TableCell>
                    <TableCell>{r.expected_delivery_time ? format(new Date(r.expected_delivery_time), 'PPP', { locale: zhCN }) : '-'}</TableCell>
                    <TableCell>{r.actual_delivery_time ? format(new Date(r.actual_delivery_time), 'PPP', { locale: zhCN }) : '-'}</TableCell>
                    <TableCell>{statusBadge(r.status)}</TableCell>
                    <TableCell><Badge variant="outline">{r.urgency || '-'}</Badge></TableCell>
                    <TableCell>{r.designer || '-'}</TableCell>
                    <TableCell>{r.platform || '-'}</TableCell>
                    <TableCell>{r.site_name || '-'}</TableCell>
                    <TableCell>
                      {r.url_or_product_page ? (
                        <a href={r.url_or_product_page} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">链接</a>
                      ) : '-'}
                    </TableCell>
                    <TableCell>{r.asset_type || '-'}</TableCell>
                    <TableCell>{r.asset_size || '-'}</TableCell>
                    <TableCell>{(r.asset_count ?? '-') as any}</TableCell>
                    <TableCell>{r.submitter_name || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/creative-requirements/${r.id}`)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/creative-requirements/${r.id}/edit`)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={14} className="text-center py-8">暂无创意部需求</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}