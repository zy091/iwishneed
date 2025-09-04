import { useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { cn } from './lib/utils'
import { Button } from './components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from './components/ui/avatar'
import {
  LayoutDashboard,
  Folder,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  Users,
  BarChart3,
} from 'lucide-react'
import { useAuth } from './hooks/use-auth'
import { usePermissions } from './hooks/use-permissions'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from './components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs'
import { useMobile } from './hooks/use-mobile'


export default function Layout() {
  const { user, logout } = useAuth()
  const { isAdmin } = usePermissions()
  const navigate = useNavigate()
  const location = useLocation()
  const isMobile = useMobile()
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile)
  const [activeView, setActiveView] = useState<'overview' | 'user'>('overview')
  const isSSO = false

  const handleLogout = () => {
    logout()
    navigate('/login')
  }



  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const isDashboard = location.pathname === '/'

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* 侧边栏 */}
      <aside
        className={cn(
          "bg-white border-r border-gray-200 w-64 flex-shrink-0 flex flex-col transition-all duration-300 ease-in-out",
          isMobile ? (sidebarOpen ? "fixed inset-y-0 left-0 z-50" : "hidden") : ""
        )}
      >
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h1 className="text-xl font-bold text-blue-900">需求管理系统</h1>
          {isMobile && (
            <Button variant="ghost" size="icon" onClick={toggleSidebar}>
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {/* 仪表盘 */}
          <NavLink
            to="/"
            className={({ isActive }) => cn(
              "flex items-center px-3 py-2 rounded-md text-sm font-medium",
              isActive
                ? "bg-blue-100 text-blue-900"
                : "text-gray-700 hover:bg-gray-100"
            )}
            end
          >
            <LayoutDashboard className="mr-2 h-5 w-5" />
            仪表盘
          </NavLink>

          {/* 需求 */}
          <div className="px-3 pt-4 pb-1 text-xs text-gray-400 uppercase tracking-wider">需求</div>

          <NavLink
            to="/departments/tech"
            className={({ isActive }) => cn(
              "flex items-center px-3 py-2 rounded-md text-sm font-medium",
              (isActive || location.pathname.startsWith('/tech-requirements'))
                ? "bg-blue-100 text-blue-900"
                : "text-gray-700 hover:bg-gray-100"
            )}
          >
            <Folder className="mr-2 h-5 w-5" />
            技术需求列表
          </NavLink>

          <NavLink
            to="/departments/creative"
            className={({ isActive }) => cn(
              "flex items-center px-3 py-2 rounded-md text-sm font-medium",
              (isActive || location.pathname.startsWith('/creative-requirements'))
                ? "bg-blue-100 text-blue-900"
                : "text-gray-700 hover:bg-gray-100"
            )}
          >
            <Folder className="mr-2 h-5 w-5" />
            创意部需求列表
          </NavLink>

          {/* 系统（仅管理员可见） */}
          {isAdmin && (
            <>
              <div className="px-3 pt-4 pb-1 text-xs text-gray-400 uppercase tracking-wider">系统</div>
              <NavLink
                to="/admin/users"
                className={({ isActive }) => cn(
                  "flex items-center px-3 py-2 rounded-md text-sm font-medium",
                  isActive
                    ? "bg-blue-100 text-blue-900"
                    : "text-gray-700 hover:bg-gray-100"
                )}
              >
                <Users className="mr-2 h-5 w-5" />
                用户管理
              </NavLink>
            </>
          )}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center">
            <Avatar>
              <AvatarImage src={user?.avatar} />
              <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="ml-3">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-gray-500">
                {user?.rolename ||
                  (user?.role_id === 0
                    ? '超级管理员'
                    : (user?.role === 'admin'
                        ? '管理员'
                        : (user?.role === 'manager'
                            ? '经理'
                            : (user?.role === 'developer' ? '开发者' : '提交者')
                          )
                      )
                  )
                }
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* 主内容区 */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="bg-white border-b border-gray-200 h-16 flex items-center px-4 justify-between">
          {isMobile && (
            <Button variant="ghost" size="icon" onClick={toggleSidebar}>
              <Menu className="h-5 w-5" />
            </Button>
          )}

          <div className={cn("flex-1 min-w-0", isMobile ? "ml-4" : "")}>
            {isDashboard ? (
              <h2 className="text-lg font-semibold text-gray-800 truncate whitespace-nowrap">仪表盘</h2>
            ) : (
              <h2 className="text-lg font-semibold text-gray-800 truncate whitespace-nowrap" title={`欢迎回来，${user?.name || ''}`}>欢迎回来，{user?.name}</h2>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
            </Button>


            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Settings className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>我的账户</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {!isSSO && <DropdownMenuItem>个人资料</DropdownMenuItem>}
                {!isSSO && <DropdownMenuItem>系统设置</DropdownMenuItem>}

                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-y-auto overflow-x-hidden">
          {isDashboard ? (
            <Outlet context={{ viewType: 'overview' }} />
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  )
}