import { useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { cn } from './lib/utils'
import { Button } from './components/ui/button'
import { Avatar, AvatarFallback } from './components/ui/avatar'
import {
  LayoutDashboard,
  Folder,
  Settings,
  LogOut,
  Menu,
  X,
  Users,
} from 'lucide-react'
import { useAuth } from './hooks/useAuth'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from './components/ui/dropdown-menu'

export default function Layout() {
  const { user, profile, signOut, isAdmin, isSuperAdmin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const handleLogout = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (error) {
      console.error('登出失败:', error)
    }
  }

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  // 导航菜单
  const navigationItems = [
    {
      name: '仪表盘',
      href: '/',
      icon: LayoutDashboard,
    },
    {
      name: '技术需求',
      href: '/departments/tech',
      icon: Folder,
    },
    {
      name: '创意需求',
      href: '/departments/creative',
      icon: Folder,
    },
  ]

  // 管理员菜单项
  const adminItems = [
    {
      name: '用户管理',
      href: '/admin/users',
      icon: Users,
    },
    {
      name: '员工管理',
      href: '/admin/staff',
      icon: Users,
    },
  ]

  // 获取用户显示名称
  const getUserDisplayName = () => {
    return profile?.name || profile?.full_name || user?.email?.split('@')[0] || '用户'
  }

  // 获取用户角色显示
  const getUserRoleDisplay = () => {
    if (!profile?.role) return '用户'
    return profile.role.name
  }

  // 获取用户头像
  const getUserAvatar = () => {
    const name = getUserDisplayName()
    return name.charAt(0).toUpperCase()
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* 侧边栏 */}
      <div className={cn(
        "bg-white shadow-lg transition-all duration-300 ease-in-out",
        sidebarOpen ? "w-64" : "w-16"
      )}>
        <div className="flex flex-col h-full">
          {/* 头部 */}
          <div className="flex items-center justify-between p-4 border-b">
            {sidebarOpen && (
              <h1 className="text-xl font-bold text-gray-800">需求管理系统</h1>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSidebar}
              className="p-2"
            >
              {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>

          {/* 导航菜单 */}
          <nav className="flex-1 p-4 space-y-2">
            {navigationItems.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    "flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  )
                }
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {sidebarOpen && <span>{item.name}</span>}
              </NavLink>
            ))}

            {/* 管理员菜单 */}
            {isAdmin && (
              <>
                <div className="pt-4">
                  {sidebarOpen && (
                    <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      管理功能
                    </p>
                  )}
                </div>
                {adminItems.map((item) => (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                        isActive
                          ? "bg-blue-100 text-blue-700"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      )
                    }
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    {sidebarOpen && <span>{item.name}</span>}
                  </NavLink>
                ))}
              </>
            )}
          </nav>

          {/* 用户信息 */}
          <div className="p-4 border-t">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start space-x-3 p-2",
                    !sidebarOpen && "justify-center"
                  )}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-sm">
                      {getUserAvatar()}
                    </AvatarFallback>
                  </Avatar>
                  {sidebarOpen && (
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-medium">{getUserDisplayName()}</span>
                      <span className="text-xs text-gray-500">{getUserRoleDisplay()}</span>
                    </div>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{getUserDisplayName()}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                    <p className="text-xs text-blue-600">{getUserRoleDisplay()}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  <Settings className="mr-2 h-4 w-4" />
                  个人设置
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}