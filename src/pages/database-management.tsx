import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { 
  Database, 
  Trash2, 
  RefreshCw, 
  AlertTriangle,
  BarChart3,
  Shield
} from 'lucide-react'
import { clearAllRequirements, getDatabaseStats } from '../scripts/clear-database'
import { useAuth } from '@/hooks/use-auth'

interface DatabaseStats {
  techRequirements: number
  creativeRequirements: number
  userActivities: number
  total: number
}

export default function DatabaseManagement() {
  const [stats, setStats] = useState<DatabaseStats>({
    techRequirements: 0,
    creativeRequirements: 0,
    userActivities: 0,
    total: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isClearing, setIsClearing] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [lastClearTime, setLastClearTime] = useState<string | null>(null)
  
  const { user } = useAuth()

  const fetchStats = async () => {
    setIsLoading(true)
    try {
      const data = await getDatabaseStats()
      setStats(data)
    } catch (error) {
      console.error('获取数据库统计失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    
    // 获取上次清理时间
    const lastClear = localStorage.getItem('lastDatabaseClear')
    if (lastClear) {
      setLastClearTime(lastClear)
    }
  }, [])

  const handleClearDatabase = async () => {
    if (confirmText !== 'CLEAR ALL DATA') {
      return
    }
    
    setIsClearing(true)
    try {
      const result = await clearAllRequirements()
      if (result.success) {
        // 记录清理时间
        const clearTime = new Date().toLocaleString('zh-CN')
        localStorage.setItem('lastDatabaseClear', clearTime)
        setLastClearTime(clearTime)
        
        // 刷新统计
        await fetchStats()
        
        // 重置确认文本
        setConfirmText('')
        
        alert('数据库清理完成！')
      } else {
        alert(`清理失败: ${result.message}`)
      }
    } catch (error) {
      console.error('清理数据库失败:', error)
      alert('清理失败，请检查控制台错误信息')
    } finally {
      setIsClearing(false)
    }
  }

  const isConfirmValid = confirmText === 'CLEAR ALL DATA'

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Database className="h-6 w-6" />
            数据库管理
          </h1>
          <p className="text-gray-600 mt-1">管理和维护系统数据库</p>
        </div>
        <Button variant="outline" onClick={fetchStats} disabled={isLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          刷新统计
        </Button>
      </div>

      {/* 权限警告 */}
      <Card className="mb-6 border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <Shield className="h-5 w-5" />
            权限提醒
          </CardTitle>
          <CardDescription className="text-orange-700">
            数据库管理功能具有高风险操作，请确保你有足够的权限并了解操作后果。
            当前用户：{user?.name} ({user?.role === 'admin' ? '管理员' : '普通用户'})
          </CardDescription>
        </CardHeader>
      </Card>

      {/* 数据库统计 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            数据库统计
          </CardTitle>
          <CardDescription>
            当前数据库中的数据统计信息
            {lastClearTime && (
              <span className="block mt-1 text-sm text-gray-500">
                上次清理时间：{lastClearTime}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {isLoading ? '...' : stats.techRequirements}
              </div>
              <div className="text-sm text-gray-600 mt-1">技术需求</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {isLoading ? '...' : stats.creativeRequirements}
              </div>
              <div className="text-sm text-gray-600 mt-1">创意需求</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {isLoading ? '...' : stats.userActivities}
              </div>
              <div className="text-sm text-gray-600 mt-1">用户活动</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">
                {isLoading ? '...' : stats.total}
              </div>
              <div className="text-sm text-gray-600 mt-1">总需求数</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 危险操作区域 */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-800">
            <AlertTriangle className="h-5 w-5" />
            危险操作区域
          </CardTitle>
          <CardDescription className="text-red-700">
            以下操作具有不可逆性，请谨慎使用。建议在执行前备份重要数据。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <h3 className="font-semibold text-red-800 mb-2">清空所有数据</h3>
            <p className="text-sm text-red-700 mb-4">
              此操作将删除数据库中的所有需求数据，包括技术需求、创意需求和相关的用户活动记录。
              <strong>此操作不可撤销！</strong>
            </p>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-red-800 mb-1">
                  确认操作（请输入 "CLEAR ALL DATA"）
                </label>
                <Input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="输入 CLEAR ALL DATA 来确认"
                  className="border-red-300 focus:border-red-500"
                />
              </div>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="destructive" 
                    disabled={!isConfirmValid || isClearing}
                    className="w-full"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {isClearing ? '正在清理...' : '清空所有数据'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                      <AlertTriangle className="h-5 w-5" />
                      最终确认
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      你即将删除数据库中的所有数据：
                      <ul className="mt-2 space-y-1 text-sm">
                        <li>• {stats.techRequirements} 条技术需求</li>
                        <li>• {stats.creativeRequirements} 条创意需求</li>
                        <li>• {stats.userActivities} 条用户活动记录</li>
                      </ul>
                      <p className="mt-3 font-semibold text-red-600">
                        此操作无法撤销，确定要继续吗？
                      </p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleClearDatabase}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      确认清空
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 操作说明 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>操作说明</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5">1</Badge>
              <p>数据库清理操作会删除所有需求数据，但不会影响用户账户信息</p>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5">2</Badge>
              <p>清理后，所有的需求ID、统计数据都会重置</p>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5">3</Badge>
              <p>建议在清理前导出重要数据作为备份</p>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5">4</Badge>
              <p>清理操作会记录执行时间，方便追踪</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}