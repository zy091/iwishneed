import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  BarChart3,
  Users as UsersIcon,
  Target,
  CheckCircle
} from 'lucide-react'
import { unifiedRequirementService } from '@/services/unified-requirement-service'
// 兼容旧变量名
const techRequirementService = unifiedRequirementService
import type { TechRequirement, RequirementStats } from '@/types'
import { supabase } from '@/lib/supabaseClient'

interface OverviewStats {
  total: number
  completed: number
  inProgress: number
  pending: number
  overdue: number
  techDept: number
  creativeDept: number
  completionRate: number
}

type TechAssigneeAgg = {
  name: string
  total: number
  pending: number
  inProgress: number
  completed: number
  delayed: number
  avgDuration: number
}

type CreativeDesignerAgg = {
  name: string
  total: number
  notStarted: number       // 未开始
  inProgress: number       // 处理中
  completed: number        // 已完成
  noAction: number         // 不做处理
}

export default function Dashboard() {
  // 概览
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState<OverviewStats>({
    total: 0,
    completed: 0,
    inProgress: 0,
    pending: 0,
    overdue: 0,
    techDept: 0,
    creativeDept: 0,
    completionRate: 0
  })
  const [recent, setRecent] = useState<TechRequirement[]>([])

  // 用户指标
  const [staffLoading, setStaffLoading] = useState(true)
  const [techAgg, setTechAgg] = useState<TechAssigneeAgg[]>([])
  const [creativeAgg, setCreativeAgg] = useState<CreativeDesignerAgg[]>([])

  // 概览数据（当前仅接入技术部真实数据）
  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const techReqs = await unifiedRequirementService.getTechRequirements()
        const totalTech = techReqs.length
        const completedTech = techReqs.filter(r => r.progress === 'completed').length
        const inProgressTech = techReqs.filter(r => r.progress === 'in_progress').length
        const pendingTech = techReqs.filter(r => r.progress === 'not_started').length
        const overdueTech = techReqs.filter(r => r.progress === 'delayed').length
        const total = totalTech
        const completed = completedTech
        const inProgress = inProgressTech
        const pending = pendingTech
        const overdue = overdueTech
        const completionRate = total > 0 ? (completed / total) * 100 : 0

        setStats({
          total,
          completed,
          inProgress,
          pending,
          overdue,
          techDept: totalTech,
          creativeDept: 0,
          completionRate
        })

        // 最近需求（技术部）
        const sorted = [...techReqs]
          .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())
          .slice(0, 5)
        setRecent(sorted)
      } catch (e) {
        console.error('获取仪表盘概览失败:', e)
      } finally {
        setIsLoading(false)
      }
    }
    fetchOverview()
  }, [])

  // 用户指标（技术部/创意部分区）
  useEffect(() => {
    const fetchUsersAgg = async () => {
      try {
        // 读取启用人员
        const { data: staff, error: staffErr } = await supabase
          .from('tech_staff')
          .select('name, department, active')
          .eq('active', true)
          .order('name', { ascending: true })
        if (staffErr) throw staffErr
        const techNames = (staff || []).filter(s => s.department === '技术部').map(s => s.name as string)
        const creativeNames = (staff || []).filter(s => s.department === '创意部').map(s => s.name as string)

        // 技术部聚合（服务已有统计）
        const techStatsMap = await unifiedRequirementService.getTechRequirements()
        const techStatsGrouped: Record<string, any> = {}
        
        // 手动聚合统计数据
        for (const req of techStatsMap) {
          const assignee = req.assigned_to || '未分配'
          if (!techStatsGrouped[assignee]) {
            techStatsGrouped[assignee] = {
              total: 0,
              pending: 0,
              inProgress: 0,
              completed: 0,
              delayed: 0,
              avgDuration: 0
            }
          }
          
          techStatsGrouped[assignee].total++
          if (req.progress === 'not_started') techStatsGrouped[assignee].pending++
          else if (req.progress === 'in_progress') techStatsGrouped[assignee].inProgress++
          else if (req.progress === 'completed') techStatsGrouped[assignee].completed++
          else if (req.progress === 'delayed') techStatsGrouped[assignee].delayed++
        }
        const techRows: TechAssigneeAgg[] = techNames.map(name => {
          const s = techStatsGrouped[name] || { total: 0, pending: 0, inProgress: 0, completed: 0, delayed: 0, avgDuration: 0 }
          return { name, ...s }
        })
        setTechAgg(techRows)

        // 创意部聚合（按 designer 与 status）
        const { data: creatives, error: cErr } = await supabase
          .from('creative_requirements')
          .select('designer,status')
        if (cErr) throw cErr
        const counters = new Map<string, CreativeDesignerAgg>()
        for (const name of creativeNames) {
          counters.set(name, { name, total: 0, notStarted: 0, inProgress: 0, completed: 0, noAction: 0 })
        }
        for (const row of creatives || []) {
          const name = (row as any).designer as string | null
          if (!name) continue
          if (!counters.has(name)) {
            counters.set(name, { name, total: 0, notStarted: 0, inProgress: 0, completed: 0, noAction: 0 })
          }
          const item = counters.get(name)!
          item.total += 1
          const st = (row as any).status
          if (st === '未开始') item.notStarted += 1
          else if (st === '处理中') item.inProgress += 1
          else if (st === '已完成') item.completed += 1
          else if (st === '不做处理') item.noAction += 1
        }
        setCreativeAgg(Array.from(counters.values()).sort((a, b) => a.name.localeCompare(b.name)))
      } catch (e) {
        console.error('获取人员指标失败:', e)
        setTechAgg([])
        setCreativeAgg([])
      } finally {
        setStaffLoading(false)
      }
    }
    fetchUsersAgg()
  }, [])

  const statusBadge = (r: TechRequirement) => {
    switch (r.progress) {
      case 'completed': return <Badge className="bg-green-500">已完成</Badge>
      case 'in_progress': return <Badge className="bg-blue-500">处理中</Badge>
      case 'delayed': return <Badge className="bg-red-500">已沟通延迟</Badge>
      case 'not_started': return <Badge className="bg-yellow-500">未开始</Badge>
      default: return <Badge>未知</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <TabsList>
        <TabsTrigger value="overview">概览</TabsTrigger>
        <TabsTrigger value="users">用户</TabsTrigger>
      </TabsList>

      {/* 概览 */}
      <TabsContent value="overview" className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">总需求数</p>
                  <p className="text-3xl font-bold">{stats.total}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">完成率</p>
                  <p className="text-3xl font-bold">{stats.completionRate.toFixed(1)}%</p>
                </div>
                <Target className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">技术部需求</p>
                  <p className="text-3xl font-bold">{stats.techDept}</p>
                </div>
                <UsersIcon className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>需求状态分布</CardTitle>
              <CardDescription>技术部分状态统计</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span>未开始</span>
                  </div>
                  <span className="font-medium">{stats.pending}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span>处理中</span>
                  </div>
                  <span className="font-medium">{stats.inProgress}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span>已完成</span>
                  </div>
                  <span className="font-medium">{stats.completed}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span>已沟通延迟</span>
                  </div>
                  <span className="font-medium">{stats.overdue}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>最近需求</CardTitle>
              <CardDescription>最新的 5 条技术需求</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recent.map(r => (
                  <div key={r.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="font-medium text-sm truncate">{r.title}</div>
                    {statusBadge(r)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>部门对比</CardTitle>
            <CardDescription>各部门需求数量对比</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-purple-500" />
                <span>技术部</span>
              </div>
              <div className="flex items-center space-x-4">
                <Progress value={stats.total > 0 ? (stats.techDept / stats.total) * 100 : 0} className="w-24" />
                <span className="font-medium w-8">{stats.techDept}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* 用户 */}
      <TabsContent value="users" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>技术部</CardTitle>
            <CardDescription>按技术负责人统计</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table className="min-w-[900px] whitespace-nowrap">
                <TableHeader>
                  <TableRow>
                    <TableHead>人员</TableHead>
                    <TableHead>总数</TableHead>
                    <TableHead>未开始</TableHead>
                    <TableHead>处理中</TableHead>
                    <TableHead>已完成</TableHead>
                    <TableHead>已沟通延迟</TableHead>
                    <TableHead>平均耗时(h)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffLoading ? (
                    <TableRow><TableCell colSpan={7}>加载中...</TableCell></TableRow>
                  ) : techAgg.length ? (
                    techAgg.map(row => (
                      <TableRow key={row.name}>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell>{row.total}</TableCell>
                        <TableCell>{row.pending}</TableCell>
                        <TableCell>{row.inProgress}</TableCell>
                        <TableCell>{row.completed}</TableCell>
                        <TableCell>{row.delayed}</TableCell>
                        <TableCell>{Math.round(row.avgDuration * 100) / 100}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={7}>暂无数据</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>创意部</CardTitle>
            <CardDescription>按设计师统计</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table className="min-w-[900px] whitespace-nowrap">
                <TableHeader>
                  <TableRow>
                    <TableHead>人员</TableHead>
                    <TableHead>总数</TableHead>
                    <TableHead>未开始</TableHead>
                    <TableHead>处理中</TableHead>
                    <TableHead>已完成</TableHead>
                    <TableHead>不做处理</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffLoading ? (
                    <TableRow><TableCell colSpan={6}>加载中...</TableCell></TableRow>
                  ) : creativeAgg.length ? (
                    creativeAgg.map(row => (
                      <TableRow key={row.name}>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell>{row.total}</TableCell>
                        <TableCell>{row.notStarted}</TableCell>
                        <TableCell>{row.inProgress}</TableCell>
                        <TableCell>{row.completed}</TableCell>
                        <TableCell>{row.noAction}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={6}>暂无数据</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}