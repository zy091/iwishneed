import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Progress } from '../components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { getUserActivityStats } from '../services/user-activity-service'
import { MainAppLink } from '../components/MainAppLink'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line
} from 'recharts'
import { 
  ClipboardList, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ArrowUpRight, 
  Users, 
  User,
  Calendar,
  Tag
} from 'lucide-react'
import { useAuth } from '../hooks/use-auth'
import { RequirementService } from '../services/requirement-service'

// 颜色配置
const COLORS = {
  blue: '#1e40af',
  green: '#10b981',
  yellow: '#f59e0b',
  red: '#ef4444',
  purple: '#8b5cf6',
  cyan: '#06b6d4',
  orange: '#f97316',
  pink: '#ec4899'
}

// 状态颜色映射
const STATUS_COLORS = {
  pending: COLORS.yellow,
  inProgress: COLORS.blue,
  completed: COLORS.green,
  overdue: COLORS.red
}

// 优先级颜色映射
const PRIORITY_COLORS = {
  high: COLORS.red,
  medium: COLORS.yellow,
  low: COLORS.green
}

// 部门颜色映射
const DEPARTMENT_COLORS = {
  '产品部': COLORS.blue,
  '技术部': COLORS.purple,
  '设计部': COLORS.pink,
  '市场部': COLORS.orange,
  '运营部': COLORS.cyan,
  '客服部': COLORS.green,
  '法务部': COLORS.yellow,
  '人力资源部': COLORS.red,
  '财务部': COLORS.blue
}

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
    pending: 0,
    overdue: 0,
    submitterCount: 0,
    assigneeCount: 0
  })
  const [chartData, setChartData] = useState([])
  const [recentRequirements, setRecentRequirements] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusData, setStatusData] = useState([])
  const [priorityData, setPriorityData] = useState([])
  const [departmentData, setDepartmentData] = useState([])
  const [submitterData, setSubmitterData] = useState([])
  const [assigneeData, setAssigneeData] = useState([])
  const [monthlyTrendData, setMonthlyTrendData] = useState([])
  const [userActivityData, setUserActivityData] = useState({
    dailyActiveUsers: [],
    userActions: [],
    departmentActivity: []
  })

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // 获取所有需求
        const requirements = await RequirementService.getAllRequirements()
        
        // 获取用户活跃度数据
        const activityData = await getUserActivityStats()
        setUserActivityData(activityData)
        
        // 计算基本统计数据
        const total = requirements.length
        const completed = requirements.filter(req => req.status === 'completed').length
        const inProgress = requirements.filter(req => req.status === 'inProgress').length
        const pending = requirements.filter(req => req.status === 'pending').length
        const overdue = requirements.filter(req => req.status === 'overdue').length
        
        // 计算提交人和负责人数量
        const submitters = new Set(requirements.map(req => req.submitter.id))
        const assignees = new Set(requirements.filter(req => req.assignee).map(req => req.assignee.id))
        
        setStats({
          total,
          completed,
          inProgress,
          pending,
          overdue,
          submitterCount: submitters.size,
          assigneeCount: assignees.size
        })
        
        // 设置最近的需求
        const sortedRequirements = [...requirements].sort((a, b) => 
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        ).slice(0, 5)
        setRecentRequirements(sortedRequirements)
        
        // 按状态统计
        const statusCounts = {
          pending: pending,
          inProgress: inProgress,
          completed: completed,
          overdue: overdue
        }
        const statusChartData = Object.entries(statusCounts).map(([name, value]) => ({
          name: getStatusText(name),
          value
        }))
        setStatusData(statusChartData)
        
        // 按优先级统计
        const priorityCounts = {
          high: requirements.filter(req => req.priority === 'high').length,
          medium: requirements.filter(req => req.priority === 'medium').length,
          low: requirements.filter(req => req.priority === 'low').length
        }
        const priorityChartData = Object.entries(priorityCounts).map(([name, value]) => ({
          name: getPriorityText(name),
          value
        }))
        setPriorityData(priorityChartData)
        
        // 按部门统计
        const departmentCounts = {}
        requirements.forEach(req => {
          if (!departmentCounts[req.department]) {
            departmentCounts[req.department] = 0
          }
          departmentCounts[req.department]++
        })
        const departmentChartData = Object.entries(departmentCounts)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5) // 只取前5个部门
        setDepartmentData(departmentChartData)
        
        // 按提交人统计
        const submitterCounts = {}
        requirements.forEach(req => {
          if (!submitterCounts[req.submitter.name]) {
            submitterCounts[req.submitter.name] = 0
          }
          submitterCounts[req.submitter.name]++
        })
        const submitterChartData = Object.entries(submitterCounts)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5) // 只取前5个提交人
        setSubmitterData(submitterChartData)
        
        // 按负责人统计
        const assigneeCounts = {}
        requirements.filter(req => req.assignee).forEach(req => {
          if (!assigneeCounts[req.assignee.name]) {
            assigneeCounts[req.assignee.name] = 0
          }
          assigneeCounts[req.assignee.name]++
        })
        const assigneeChartData = Object.entries(assigneeCounts)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5) // 只取前5个负责人
        setAssigneeData(assigneeChartData)
        
        // 按月份统计需求趋势
        const monthlyData = {}
        const currentYear = new Date().getFullYear()
        
        // 初始化月份数据
        for (let i = 1; i <= 12; i++) {
          const monthName = `${i}月`
          monthlyData[monthName] = {
            name: monthName,
            新建: 0,
            完成: 0
          }
        }
        
        // 统计每月新建和完成的需求
        requirements.forEach(req => {
          const createdDate = new Date(req.createdAt)
          if (createdDate.getFullYear() === currentYear) {
            const createdMonth = `${createdDate.getMonth() + 1}月`
            monthlyData[createdMonth].新建++
          }
          
          if (req.status === 'completed') {
            const completedDate = new Date(req.updatedAt)
            if (completedDate.getFullYear() === currentYear) {
              const completedMonth = `${completedDate.getMonth() + 1}月`
              monthlyData[completedMonth].完成++
            }
          }
        })
        
        // 转换为数组并按月份排序
        const monthlyTrend = Object.values(monthlyData)
        setMonthlyTrendData(monthlyTrend)
        
        // 设置图表数据
        setChartData(monthlyTrend)
        
        setIsLoading(false)
      } catch (error) {
        console.error('获取仪表盘数据失败:', error)
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500'
      case 'inProgress': return 'bg-blue-500'
      case 'pending': return 'bg-yellow-500'
      case 'overdue': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return '已完成'
      case 'inProgress': return '进行中'
      case 'pending': return '待处理'
      case 'overdue': return '已逾期'
      default: return '未知'
    }
  }

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high': return '高'
      case 'medium': return '中'
      case 'low': return '低'
      default: return '未知'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-500'
      case 'medium': return 'text-yellow-500'
      case 'low': return 'text-green-500'
      default: return 'text-gray-500'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">仪表盘</h1>
          <p className="text-muted-foreground">
            查看您的需求管理概览和统计数据
          </p>
        </div>
        <MainAppLink label="返回主系统" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总需求数</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              全部系统需求
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已完成</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
            <div className="flex items-center space-x-2">
              <Progress value={stats.total ? (stats.completed / stats.total) * 100 : 0} className="h-2" />
              <div className="text-xs text-muted-foreground">
                {stats.total ? Math.round((stats.completed / stats.total) * 100) : 0}%
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">进行中</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgress}</div>
            <div className="flex items-center space-x-2">
              <Progress value={stats.total ? (stats.inProgress / stats.total) * 100 : 0} className="h-2" />
              <div className="text-xs text-muted-foreground">
                {stats.total ? Math.round((stats.inProgress / stats.total) * 100) : 0}%
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已逾期</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{stats.overdue}</div>
            <p className="text-xs text-muted-foreground">
              需要立即处理
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 mt-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">提交人数量</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.submitterCount}</div>
            <p className="text-xs text-muted-foreground">
              参与提交需求的用户数量
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">负责人数量</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.assigneeCount}</div>
            <p className="text-xs text-muted-foreground">
              负责处理需求的用户数量
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="activity">用户活跃度</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>需求趋势</CardTitle>
              <CardDescription>
                本年度每月需求创建和完成情况
              </CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="新建" stroke={COLORS.blue} activeDot={{ r: 8 }} />
                  <Line type="monotone" dataKey="完成" stroke={COLORS.green} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>最近需求</CardTitle>
              <CardDescription>
                最近更新或创建的需求
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentRequirements.map((req) => (
                  <div key={req.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className={`h-2 w-2 rounded-full ${getStatusColor(req.status)}`} />
                        <p className="text-sm font-medium">{req.title}</p>
                      </div>
                      <div className="flex space-x-4 text-xs text-muted-foreground">
                        <span>{req.department}</span>
                        <span>•</span>
                        <span>{req.date}</span>
                        <span>•</span>
                        <span className={getPriorityColor(req.priority)}>
                          优先级: {getPriorityText(req.priority)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <span className="text-xs mr-2">{getStatusText(req.status)}</span>
                      <ArrowUpRight className="h-4 w-4" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>需求状态分布</CardTitle>
                <CardDescription>
                  各状态需求数量占比
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={Object.values(STATUS_COLORS)[index % Object.values(STATUS_COLORS).length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>需求优先级分布</CardTitle>
                <CardDescription>
                  各优先级需求数量占比
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={priorityData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {priorityData.map((entry, index) => {
                        const priority = entry.name === '高' ? 'high' : entry.name === '中' ? 'medium' : 'low'
                        return <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[priority]} />
                      })}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>部门需求分布</CardTitle>
                <CardDescription>
                  各部门提交的需求数量
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={departmentData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={80} />
                    <Tooltip />
                    <Bar dataKey="value" fill={COLORS.blue} name="需求数量" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>月度需求趋势</CardTitle>
                <CardDescription>
                  本年度每月新建和完成的需求数量
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="新建" stroke={COLORS.blue} activeDot={{ r: 8 }} />
                    <Line type="monotone" dataKey="完成" stroke={COLORS.green} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>提交人排名</CardTitle>
                <CardDescription>
                  提交需求数量最多的用户
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={submitterData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={80} />
                    <Tooltip />
                    <Bar dataKey="value" fill={COLORS.purple} name="需求数量" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>负责人排名</CardTitle>
                <CardDescription>
                  处理需求数量最多的用户
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={assigneeData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={80} />
                    <Tooltip />
                    <Bar dataKey="value" fill={COLORS.cyan} name="需求数量" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="activity" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>日活跃用户趋势</CardTitle>
                <CardDescription>
                  最近7天的系统活跃用户数量
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={userActivityData.dailyActiveUsers}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="count" name="活跃用户数" stroke={COLORS.blue} activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>用户行为分布</CardTitle>
                <CardDescription>
                  不同类型用户行为的数量分布
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={userActivityData.userActions}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                      nameKey="action"
                      label={({ action, percent }) => `${action} ${(percent * 100).toFixed(0)}%`}
                    >
                      {userActivityData.userActions.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={Object.values(COLORS)[index % Object.values(COLORS).length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>部门活跃度排名</CardTitle>
              <CardDescription>
                各部门在系统中的活动数量
              </CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={userActivityData.departmentActivity}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="department" type="category" width={80} />
                  <Tooltip />
                  <Bar dataKey="actions" fill={COLORS.orange} name="活动数量" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>用户活跃度分析</CardTitle>
              <CardDescription>
                系统使用情况总结
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Users className="h-5 w-5 text-blue-500" />
                      <h3 className="font-medium">最活跃部门</h3>
                    </div>
                    <p className="mt-2 text-lg font-bold">技术部</p>
                    <p className="text-sm text-muted-foreground">120 次活动</p>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <User className="h-5 w-5 text-green-500" />
                      <h3 className="font-medium">最活跃用户</h3>
                    </div>
                    <p className="mt-2 text-lg font-bold">王强</p>
                    <p className="text-sm text-muted-foreground">45 次活动</p>
                  </div>
                  
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-5 w-5 text-yellow-500" />
                      <h3 className="font-medium">最活跃日期</h3>
                    </div>
                    <p className="mt-2 text-lg font-bold">8月9日</p>
                    <p className="text-sm text-muted-foreground">22 位活跃用户</p>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Tag className="h-5 w-5 text-gray-500" />
                    <h3 className="font-medium">最常见操作</h3>
                  </div>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <span>查看需求</span>
                      <span className="font-medium">145 次</span>
                    </div>
                    <Progress value={145 / 1.45} className="h-2" />
                    
                    <div className="flex items-center justify-between">
                      <span>添加评论</span>
                      <span className="font-medium">67 次</span>
                    </div>
                    <Progress value={67 / 1.45} className="h-2" />
                    
                    <div className="flex items-center justify-between">
                      <span>更新状态</span>
                      <span className="font-medium">42 次</span>
                    </div>
                    <Progress value={42 / 1.45} className="h-2" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}