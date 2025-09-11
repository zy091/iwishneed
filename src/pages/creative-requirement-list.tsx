import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Edit, Eye, Plus, Search, Trash2, Upload } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { creativeRequirementService } from '@/services/creative-requirement-service'
import type { CreativeRequirement } from '@/types/requirement'
import { useAuth } from '@/hooks/useAuth'


export default function CreativeRequirementList() {
  const [list, setList] = useState<CreativeRequirement[]>([])
  const [filtered, setFiltered] = useState<CreativeRequirement[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [urgencyFilter, setUrgencyFilter] = useState('')
  const [designerFilter, setDesignerFilter] = useState('')
  const [assetTypeFilter, setAssetTypeFilter] = useState('')
  const [platformFilter, setPlatformFilter] = useState('')
  const [designers, setDesigners] = useState<string[]>([])
  const [stats, setStats] = useState({
    total: 0,
    notStarted: 0,
    inProgress: 0,
    completed: 0,
    noAction: 0,
    byUrgency: { high: 0, medium: 0, low: 0 },
    byAssetType: {} as Record<string, number>
  })
  const navigate = useNavigate()
  const { user, isAdmin, isSuperAdmin } = useAuth()

  // 权限检查函数
  const canEditRequirement = (req: CreativeRequirement) => {
    return isAdmin || isSuperAdmin || req.submitter_name === user?.name
  }

  const canDeleteRequirement = (req: CreativeRequirement) => {
    return isAdmin || isSuperAdmin || req.submitter_name === user?.name
  }

  useEffect(() => {
    const run = async () => {
      try {
        const [data, statsData, designersData] = await Promise.all([
          creativeRequirementService.getCreativeRequirements(),
          creativeRequirementService.getCreativeRequirementStats(),
          creativeRequirementService.getDesigners()
        ])
        setList(data)
        setFiltered(data)
        setStats(statsData)
        setDesigners(designersData)
      } catch (e) {
        console.error('获取创意部需求失败', e)
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [])

  useEffect(() => {
    let res = list

    // 搜索过滤
    if (search) {
      const q = search.toLowerCase()
      res = res.filter(r =>
        (r.submitter_name || '').toLowerCase().includes(q) ||
        (r.designer || '').toLowerCase().includes(q) ||
        (r.site_name || '').toLowerCase().includes(q) ||
        (r.asset_type || '').toLowerCase().includes(q) ||
        (r.copy || '').toLowerCase().includes(q)
      )
    }

    // 状态过滤
    if (statusFilter && statusFilter !== 'all-status') {
      res = res.filter(r => r.status === statusFilter)
    }

    // 紧急程度过滤
    if (urgencyFilter && urgencyFilter !== 'all-urgency') {
      res = res.filter(r => r.urgency === urgencyFilter)
    }

    // 设计师过滤
    if (designerFilter && designerFilter !== 'all-designer') {
      res = res.filter(r => r.designer === designerFilter)
    }

    // 素材类型过滤
    if (assetTypeFilter && assetTypeFilter !== 'all-asset-type') {
      res = res.filter(r => r.asset_type === assetTypeFilter)
    }

    // 平台过滤
    if (platformFilter && platformFilter !== 'all-platform') {
      res = res.filter(r => r.platform === platformFilter)
    }

    setFiltered(res)
  }, [search, statusFilter, urgencyFilter, designerFilter, assetTypeFilter, platformFilter, list])

  const handleDelete = async (id?: string) => {
    if (!id) return
    try {
      await creativeRequirementService.deleteCreativeRequirement(id)
      setList(prev => prev.filter(x => x.id !== id))
    } catch (e) {
      console.error('删除创意需求失败', e)
    }
  }

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

  return (
    <div className="container mx-auto py-6 px-3 overflow-x-hidden">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between md:flex-wrap gap-3 mb-6">
        <h1 className="text-2xl font-bold min-w-0">创意部 - 需求列表</h1>
        <div className="flex gap-2 flex-wrap justify-end">
          <Button variant="outline" onClick={() => navigate('/requirements/import?department=creative')}>
            <Upload className="mr-2 h-4 w-4" /> 批量导入
          </Button>
          <Button onClick={() => navigate('/creative-requirements/new')}>
            <Plus className="mr-2 h-4 w-4" /> 新建创意需求
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">总计</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                <div className="h-4 w-4 rounded-full bg-gray-400"></div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">未开始</p>
                <p className="text-2xl font-bold text-gray-600">{stats.notStarted}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                <div className="h-4 w-4 rounded-full bg-gray-500"></div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">处理中</p>
                <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                <div className="h-4 w-4 rounded-full bg-blue-500"></div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">已完成</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <div className="h-4 w-4 rounded-full bg-green-500"></div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">不做处理</p>
                <p className="text-2xl font-bold text-orange-600">{stats.noAction}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
                <div className="h-4 w-4 rounded-full bg-orange-500"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>筛选条件</CardTitle>
          <CardDescription>使用以下选项筛选创意需求列表</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
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
            
            <div className="w-full">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="需求状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-status">全部状态</SelectItem>
                  <SelectItem value="未开始">未开始</SelectItem>
                  <SelectItem value="处理中">处理中</SelectItem>
                  <SelectItem value="已完成">已完成</SelectItem>
                  <SelectItem value="不做处理">不做处理</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-full">
              <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="紧急程度" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-urgency">全部程度</SelectItem>
                  <SelectItem value="高">高</SelectItem>
                  <SelectItem value="中">中</SelectItem>
                  <SelectItem value="低">低</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-full">
              <Select value={designerFilter} onValueChange={setDesignerFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="设计师" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-designer">全部设计师</SelectItem>
                  {designers.map(designer => (
                    <SelectItem key={designer} value={designer}>{designer}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full">
              <Select value={assetTypeFilter} onValueChange={setAssetTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="素材类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-asset-type">全部类型</SelectItem>
                  <SelectItem value="Google广告素材">Google广告素材</SelectItem>
                  <SelectItem value="Meta广告素材">Meta广告素材</SelectItem>
                  <SelectItem value="网站Banner素材">网站Banner素材</SelectItem>
                  <SelectItem value="网站产品素材">网站产品素材</SelectItem>
                  <SelectItem value="网站横幅素材">网站横幅素材</SelectItem>
                  <SelectItem value="联盟营销">联盟营销</SelectItem>
                  <SelectItem value="EDM营销">EDM营销</SelectItem>
                  <SelectItem value="Criteo广告素材">Criteo广告素材</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-full">
              <Select value={platformFilter} onValueChange={setPlatformFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="平台" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-platform">全部平台</SelectItem>
                  <SelectItem value="GG">GG</SelectItem>
                  <SelectItem value="FB">FB</SelectItem>
                  <SelectItem value="CT">CT</SelectItem>
                  <SelectItem value="网站">网站</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
                      {urgencyBadge(r.urgency)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 gap-3 text-xs text-gray-600">
                    <div>设计师：{r.designer || '-'}</div>
                    <div>平台：{r.platform || '-'}</div>
                    <div className="col-span-2">素材：{assetTypeBadge(r.asset_type)}</div>
                    <div>尺寸：{r.asset_size || '-'}</div>
                    <div>数量：{r.asset_count ?? '-'}</div>
                    <div>期望：{formatDate(r.expected_delivery_time)}</div>
                    <div className="col-span-2">
                      {r.url_or_product_page ? (
                        <a href={r.url_or_product_page} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">链接</a>
                      ) : '无链接'}
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end gap-2">
                    <Button variant="secondary" size="sm" onClick={() => navigate(`/creative-requirements/${r.id}`)}>
                      <Eye className="h-4 w-4 mr-1" /> 查看
                    </Button>
                    {canEditRequirement(r) && (
                      <Button variant="outline" size="sm" onClick={() => navigate(`/creative-requirements/${r.id}/edit`)}>
                        <Edit className="h-4 w-4 mr-1" /> 编辑
                      </Button>
                    )}
                    {canDeleteRequirement(r) && (
                      <Button variant="outline" size="sm" onClick={() => handleDelete(r.id)}>
                        <Trash2 className="h-4 w-4 mr-1 text-red-500" /> 删除
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )) : (
              <Card>
                <CardContent className="py-8 text-center text-sm text-gray-500">暂无创意部需求</CardContent>
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
                    <TableCell>{formatDate(r.submit_time)}</TableCell>
                    <TableCell>{formatDate(r.expected_delivery_time)}</TableCell>
                    <TableCell>{formatDate(r.actual_delivery_time)}</TableCell>
                    <TableCell>{statusBadge(r.status)}</TableCell>
                    <TableCell>{urgencyBadge(r.urgency)}</TableCell>
                    <TableCell>{r.designer || '-'}</TableCell>
                    <TableCell>{r.platform || '-'}</TableCell>
                    <TableCell>{r.site_name || '-'}</TableCell>
                    <TableCell>
                      {r.url_or_product_page ? (
                        <a href={r.url_or_product_page} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">链接</a>
                      ) : '-'}
                    </TableCell>
                    <TableCell>{assetTypeBadge(r.asset_type)}</TableCell>
                    <TableCell>{r.asset_size || '-'}</TableCell>
                    <TableCell>{r.asset_count ?? '-'}</TableCell>
                    <TableCell>{r.submitter_name || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/creative-requirements/${r.id}`)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canEditRequirement(r) && (
                          <Button variant="ghost" size="icon" onClick={() => navigate(`/creative-requirements/${r.id}/edit`)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {canDeleteRequirement(r) && (
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
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