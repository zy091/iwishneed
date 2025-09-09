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
import { creativeRequirementService } from '@/services/creative-requirement-service'
import type { CreativeRequirement } from '@/services/creative-requirement-service'


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
        console.error('获取创意部需求失�?', e)
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
      console.error('删除创意需求失�?', e)
    }
  }

  const statusBadge = (s?: string) => {
    switch (s) {
      case '已完�?:
        return <Badge className="bg-green-500">已完�?/Badge>
      case '处理�?:
        return <Badge className="bg-blue-500">处理�?/Badge>
      case '未开�?:
        return <Badge className="bg-gray-500">未开�?/Badge>
      case '不做处理':
        return <Badge className="bg-orange-500">不做处理</Badge>
      default:
        return <Badge variant="outline">{s || '-'}</Badge>
    }
  }

  return (
    <div className="container mx-auto py-6 px-3 overflow-x-hidden">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between md:flex-wrap gap-3 mb-6">
        <h1 className="text-2xl font-bold min-w-0">创意�?- 需求列�?/h1>
        <div className="flex gap-2 flex-wrap justify-end">
          <Button variant="outline" onClick={() => navigate('/requirements/import?department=creative')}>
            <Upload className="mr-2 h-4 w-4" /> 批量导入
          </Button>
          <Button onClick={() => navigate('/creative-requirements/new')}>
            <Plus className="mr-2 h-4 w-4" /> 新建创意需�?
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>筛选条�?/CardTitle>
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
          <div className="md:hidden space-y-3">
            {filtered.length ? filtered.map(r => (
              <Card key={r.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-base leading-6 truncate" title={r.site_name || '-'}>
                        {r.site_name || '-'}
                      </CardTitle>
                      <CardDescription className="mt-1 text-xs">
                        {r.submitter_name || '-'}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {statusBadge(r.status)}
                      <Badge variant="outline">{r.urgency || '-'}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 gap-3 text-xs text-gray-600">
                    <div>设计师：{r.designer || '-'}</div>
                    <div>平台：{r.platform || '-'}</div>
                    <div>素材：{r.asset_type || '-'}</div>
                    <div>尺寸：{r.asset_size || '-'}</div>
                    <div>数量：{(r.asset_count ?? '-') as any}</div>
                    <div>期望：{r.expected_delivery_time ? format(new Date(r.expected_delivery_time), 'P', { locale: zhCN }) : '-'}</div>
                    <div className="col-span-2">
                      {r.url_or_product_page ? (
                        <a href={r.url_or_product_page} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">链接</a>
                      ) : '无链�?}
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end gap-2">
                    <Button variant="secondary" size="sm" onClick={() => navigate(`/creative-requirements/${r.id}`)}>
                      <Eye className="h-4 w-4 mr-1" /> 查看
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/creative-requirements/${r.id}/edit`)}>
                      <Edit className="h-4 w-4 mr-1" /> 编辑
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(r.id)}>
                      <Trash2 className="h-4 w-4 mr-1 text-red-500" /> 删除
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )) : (
              <Card>
                <CardContent className="py-8 text-center text-sm text-gray-500">暂无创意部需�?/CardContent>
              </Card>
            )}
          </div>
          <div className="hidden md:block overflow-x-auto w-full">
            <Table className="min-w-[1200px] whitespace-nowrap">
              <TableHeader>
                <TableRow>
                  <TableHead>提交时间</TableHead>
                  <TableHead>期望交付</TableHead>
                  <TableHead>实际交付</TableHead>
                  <TableHead>状�?/TableHead>
                  <TableHead>紧急程�?/TableHead>
                  <TableHead>设计�?/TableHead>
                  <TableHead>平台</TableHead>
                  <TableHead>网站名称</TableHead>
                  <TableHead>网址/产品�?/TableHead>
                  <TableHead>素材类型</TableHead>
                  <TableHead>尺寸</TableHead>
                  <TableHead>数量</TableHead>
                  <TableHead>提交�?/TableHead>
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
                    <TableCell colSpan={14} className="text-center py-8">暂无创意部需�?/TableCell>
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
