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
import { SupabaseRequirementService, SupabaseRequirement } from '../services/supabase-requirement-service'
import { mockUsers } from '../services/requirement-service'
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
  const [recentRequirements, setRecentRequirements] = useState<SupabaseRequirement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // 获取所有需求数据
        const requirements = await SupabaseRequirementService.getAllRequirements()
        
        // 计算总体统计
        const totalStats = await SupabaseRequirementService.getRequirementStats()
        const techStats = await SupabaseRequirementService.getRequirementStats('技术部')
        const creativeStats = await SupabaseRequirementService.getRequirementStats('创意部')
        
        const completionRate = totalStats.total > 0 ? (totalStats.completed / totalStats.total) * 100 : 0
        
        setStats({
          ...totalStats,
          techDept: techStats.total,
          creativeDept: creativeStats.total,
          completionRate
        })

        // 计算用户统计
        const userStatsData: UserStats[] = mockUsers.map(mockUser => {
          const userRequirements = requirements.filter(req => req.assignee?.id === mockUser.id)
          const completedRequirements = userRequirements.filter(req => req.status === 'completed')
          const userCompletionRate = userRequirements.length > 0 ? (completedRequirements.length / userRequirements.length) * 100 : 0
          
          return {
            id: mockUser.id,
            name: mockUser.name,
            avatar: mockUser.avatar,
            assignedCount: userRequirements.length,
            completedCount: completedRequirements.length,
            completionRate: userCompletionRate,
            department: mockUser.role === 'developer' ? '技术部' : '创意部'
          }
        })
        
        setUserStats(userStatsData.sort((a, b) => b.assignedCount - a.assignedCount))
        
        // 获取最近的需求
        setRecentRequirements(requirements.slice(0, 5))
        
        setIsLoading(false)
      } catch (error) {
        console.error('获取仪表盘数据失败:', error)
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500">已完成</Badge>
      case 'inProgress':
        return <Badge className="bg-blue-500">进行中</Badge>
      case 'pending':
        return <Badge className="bg-yellow-500">待处理</Badge>
      case 'overdue':
        return <Badge className="bg-red-500">已逾期</Badge>
      default:
        return <Badge>未知</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (viewType === 'user') {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">用户统计</h2>
        </div>

        {/* 用户统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {userStats.map((userStat) => (
            <Card key={userStat.id}>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={userStat.avatar} />
                    <AvatarFallback>{userStat.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-semibold">{userStat.name}</h3>
                    <p className="text-sm text-gray-500">{userStat.department}</p>
                  </div>
                </div>
                
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>分配任务</span>
                    <span className="font-medium">{userStat.assignedCount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>已完成</span>
                    <span className="font-medium text-green-600">{userStat.completedCount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>完成率</span>
                    <span className="font-medium">{userStat.completionRate.toFixed(1)}%</span>
                  </div>
                  <Progress value={userStat.completionRate} className="mt-2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">数据概览</h2>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">创意部需求</p>
                <p className="text-3xl font-bold">{stats.creativeDept}</p>
              </div>
              <Users className="h-8 w-8 text-orange-500" />
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
                    <p className="text-xs text-gray-500">{req.department}</p>
                  </div>
                  {getStatusBadge(req.status)}
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
                <Progress value={(stats.techDept / stats.total) * 100} className="w-24" />
                <span className="font-medium w-8">{stats.techDept}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-orange-500" />
                <span>创意部</span>
              </div>
              <div className="flex items-center space-x-4">
                <Progress value={(stats.creativeDept / stats.total) * 100} className="w-24" />
                <span className="font-medium w-8">{stats.creativeDept}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}