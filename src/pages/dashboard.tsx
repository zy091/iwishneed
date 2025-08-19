import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { 
  BarChart3, 
  Users, 
  Target,
  CheckCircle
} from 'lucide-react'
import { Requirement } from '../services/requirement-service'
import { techRequirementService, TechRequirement } from '../services/tech-requirement-service'
import { useAuth } from '../hooks/use-auth'

interface DashboardStats {
  total: number
  completed: number
  inProgress: number
  pending: number
  overdue: number
  techDept: number
  creativeDept: number
  completionRate: number
}

interface UserStats {
  id: string
  name: string
  avatar?: string
  assignedCount: number
  completedCount: number
  completionRate: number
  department: string
}

export default function Dashboard() {
  const context = useOutletContext<{ viewType?: 'overview' | 'user' }>()
  const viewType = context?.viewType || 'overview'
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    completed: 0,
    inProgress: 0,
    pending: 0,
    overdue: 0,
    techDept: 0,
    creativeDept: 0,
    completionRate: 0
  })
  const [userStats, setUserStats] = useState<UserStats[]>([])
  const [recentRequirements, setRecentRequirements] = useState<(Requirement | TechRequirement)[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // 获取创意部需求数据（暂时禁用创意部）
        const creativeRequirements: Requirement[] = []
        
        // 获取技术部需求数据
        const techRequirements = await techRequirementService.getTechRequirements()
        
        // 计算统计数据
        const totalCreative = creativeRequirements.length
        const totalTech = techRequirements.length
        const total = totalCreative + totalTech
        
        const completedCreative = creativeRequirements.filter((req: Requirement) => req.status === 'completed').length
        const completedTech = techRequirements.filter((req: TechRequirement) => req.progress === '已完成').length
        const completed = completedCreative + completedTech
        
        const inProgressCreative = creativeRequirements.filter((req: Requirement) => req.status === 'in_progress').length
        const inProgressTech = techRequirements.filter((req: TechRequirement) => req.progress === '处理中').length
        const inProgress = inProgressCreative + inProgressTech
        
        const pendingCreative = creativeRequirements.filter((req: Requirement) => req.status === 'pending').length
        const pendingTech = techRequirements.filter((req: TechRequirement) => req.progress === '未开始').length
        const pending = pendingCreative + pendingTech
        
        const overdueCreative = creativeRequirements.filter((req: Requirement) => req.status === 'overdue').length
        const overdueTech = techRequirements.filter((req: TechRequirement) => req.progress === '已沟通延迟').length
        const overdue = overdueCreative + overdueTech
        
        const completionRate = total > 0 ? (completed / total) * 100 : 0
        
        setStats({
          total,
          completed,
          inProgress,
          pending,
          overdue,
          techDept: totalTech,
          creativeDept: totalCreative,
          completionRate
        })

        // 计算用户统计（暂不展示用户统计，等待真实需求数据驱动）
        const userStatsData: UserStats[] = []
        setUserStats(userStatsData)
        
        // 获取最近的需求（混合两个部门的数据）
        const allRequirements = [
          ...techRequirements.map((req: TechRequirement) => ({ ...req, department: '技术部' }))
        ]
        
        // 按创建时间排序，取最新的5个
        const sortedRequirements = allRequirements
          .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())
          .slice(0, 5)
        
        setRecentRequirements(sortedRequirements)
        
        setIsLoading(false)
      } catch (error) {
        console.error('获取仪表盘数据失败:', error)
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  const getStatusBadge = (req: Requirement | TechRequirement) => {
    // 判断是技术部还是创意部需求
    if ('progress' in req) {
      // 技术部需求
      const techReq = req as TechRequirement
      switch (techReq.progress) {
        case '已完成':
          return <Badge className="bg-green-500">已完成</Badge>
        case '处理中':
          return <Badge className="bg-blue-500">处理中</Badge>
        case '未开始':
          return <Badge className="bg-yellow-500">未开始</Badge>
        case '已沟通延迟':
          return <Badge className="bg-red-500">已沟通延迟</Badge>
        default:
          return <Badge>未知</Badge>
      }
    } else {
      // 创意部需求
      const creativeReq = req as Requirement
      switch (creativeReq.status) {
        case 'completed':
          return <Badge className="bg-green-500">已完成</Badge>
        case 'in_progress':
          return <Badge className="bg-blue-500">进行中</Badge>
        case 'pending':
          return <Badge className="bg-yellow-500">待处理</Badge>
        case 'overdue':
          return <Badge className="bg-red-500">已逾期</Badge>
        default:
          return <Badge>未知</Badge>
      }
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">数据概览</h2>
      </div>

      {/* 统计卡片 */}
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
              <Users className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

      </div>

      {/* 状态分布和最近需求 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>需求状态分布</CardTitle>
            <CardDescription>各状态需求数量统计</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span>待处理</span>
                </div>
                <span className="font-medium">{stats.pending}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span>进行中</span>
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
                  <span>已逾期</span>
                </div>
                <span className="font-medium">{stats.overdue}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>最近需求</CardTitle>
            <CardDescription>最新创建的需求列表</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentRequirements.map((req) => (
                <div key={req.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{req.title}</h4>
                    <p className="text-xs text-gray-500">{(req as any).department}</p>
                  </div>
                  {getStatusBadge(req)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 部门对比 */}
      <Card>
        <CardHeader>
          <CardTitle>部门需求对比</CardTitle>
          <CardDescription>各部门需求数量对比</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
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
          </div>
        </CardContent>
      </Card>
    </div>
  )
}