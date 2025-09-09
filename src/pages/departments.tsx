import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Code, 
  Palette, 
  Users, 
  BarChart3, 
  Plus, 
  Upload,
  Eye
} from 'lucide-react'

export default function Departments() {
  const navigate = useNavigate()

  const departments = [
    {
      id: 'tech',
      name: '技术部',
      description: '负责网站开发、技术支持和系统维护',
      icon: Code,
      color: 'bg-blue-500',
      stats: {
        total: 0,
        pending: 0,
        inProgress: 0,
        completed: 0
      },
      actions: [
        { label: '查看需�?, action: () => navigate('/departments/tech'), icon: Eye },
        { label: '新建需�?, action: () => navigate('/tech-requirements/new'), icon: Plus },
        { label: '批量导入', action: () => navigate('/tech-requirements/import'), icon: Upload }
      ]
    },
    {
      id: 'creative',
      name: '创意�?,
      description: '负责创意设计、品牌策划和视觉传达',
      icon: Palette,
      color: 'bg-purple-500',
      stats: {
        total: 0,
        pending: 0,
        inProgress: 0,
        completed: 0
      },
      actions: [
        { label: '查看需�?, action: () => navigate('/requirements'), icon: Eye },
        { label: '新建需�?, action: () => navigate('/requirements/new'), icon: Plus },
        { label: '批量导入', action: () => navigate('/requirements/import'), icon: Upload }
      ]
    }
  ]

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">部门需求管�?/h1>
          <p className="text-gray-600 mt-2">选择部门查看和管理相应的需�?/p>
        </div>
        <Button variant="outline" onClick={() => navigate('/dashboard')}>
          <BarChart3 className="mr-2 h-4 w-4" />
          返回仪表�?
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {departments.map((dept) => {
          const IconComponent = dept.icon
          return (
            <Card key={dept.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-lg ${dept.color} text-white`}>
                      <IconComponent className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{dept.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {dept.description}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* 统计信息 */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{dept.stats.total}</div>
                    <div className="text-sm text-gray-500">总计</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-600">{dept.stats.pending}</div>
                    <div className="text-sm text-gray-500">待处�?/div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{dept.stats.inProgress}</div>
                    <div className="text-sm text-gray-500">进行�?/div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{dept.stats.completed}</div>
                    <div className="text-sm text-gray-500">已完�?/div>
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex flex-col gap-2">
                  {dept.actions.map((action, index) => {
                    const ActionIcon = action.icon
                    return (
                      <Button
                        key={index}
                        variant={index === 0 ? "default" : "outline"}
                        className="w-full justify-start"
                        onClick={action.action}
                      >
                        <ActionIcon className="mr-2 h-4 w-4" />
                        {action.label}
                      </Button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* 快速统�?*/}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            整体概览
          </CardTitle>
          <CardDescription>
            所有部门的需求统计汇�?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-3xl font-bold text-gray-900">0</div>
              <div className="text-sm text-gray-600 mt-1">总需求数</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-3xl font-bold text-blue-600">0</div>
              <div className="text-sm text-gray-600 mt-1">进行�?/div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-3xl font-bold text-green-600">0</div>
              <div className="text-sm text-gray-600 mt-1">已完�?/div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-3xl font-bold text-orange-600">0</div>
              <div className="text-sm text-gray-600 mt-1">延迟</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
