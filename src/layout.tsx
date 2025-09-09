import { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { cn } from './lib/utils'
import {
  LayoutDashboard,
  Folder,
  Users,
} from 'lucide-react'
import { useAuth } from './hooks/useAuth'
import Header from './components/Header'

export default function Layout() {
  const { isAdmin } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)

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

  return (
    <div className="flex h-screen bg-gray-100">
      {/* 侧边栏 */}
      <div className={cn(
        "bg-white shadow-lg transition-all duration-300 ease-in-out flex flex-col",
        sidebarOpen ? "w-64" : "w-16"
      )}>
        <div className="flex items-center justify-center p-4 border-b h-[65px]">
          {!sidebarOpen && (
             <img src="/logo.png" alt="Logo" className="h-8 w-auto" />
          )}
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
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header sidebarOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}