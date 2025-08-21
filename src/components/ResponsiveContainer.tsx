import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ResponsiveContainerProps {
  children: ReactNode
  className?: string
}

export function ResponsiveContainer({ children, className }: ResponsiveContainerProps) {
  return (
    <div className={cn(
      "w-full min-h-screen",
      "px-4 py-6", // 移动端内边距
      "sm:px-6 sm:py-8", // 小屏幕
      "md:px-8 md:py-10", // 中等屏幕
      "lg:px-12 lg:py-12", // 大屏幕
      "xl:px-16 xl:py-16", // 超大屏幕
      className
    )}>
      <div className="max-w-7xl mx-auto">
        {children}
      </div>
    </div>
  )
}

interface ResponsiveGridProps {
  children: ReactNode
  className?: string
  cols?: {
    default?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
  }
}

export function ResponsiveGrid({ 
  children, 
  className,
  cols = { default: 1, sm: 1, md: 2, lg: 3, xl: 4 }
}: ResponsiveGridProps) {
  const gridClasses = [
    `grid-cols-${cols.default || 1}`,
    cols.sm && `sm:grid-cols-${cols.sm}`,
    cols.md && `md:grid-cols-${cols.md}`,
    cols.lg && `lg:grid-cols-${cols.lg}`,
    cols.xl && `xl:grid-cols-${cols.xl}`
  ].filter(Boolean).join(' ')

  return (
    <div className={cn(
      "grid gap-4",
      "sm:gap-6",
      "md:gap-8",
      gridClasses,
      className
    )}>
      {children}
    </div>
  )
}

interface ResponsiveCardProps {
  children: ReactNode
  className?: string
  title?: string
  description?: string
}

export function ResponsiveCard({ children, className, title, description }: ResponsiveCardProps) {
  return (
    <div className={cn(
      "bg-white rounded-lg shadow-sm border",
      "p-4", // 移动端内边距
      "sm:p-6", // 小屏幕
      "md:p-8", // 中等屏幕
      "hover:shadow-md transition-shadow duration-200",
      className
    )}>
      {title && (
        <div className="mb-4 sm:mb-6">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
            {title}
          </h3>
          {description && (
            <p className="mt-1 text-sm sm:text-base text-gray-600">
              {description}
            </p>
          )}
        </div>
      )}
      {children}
    </div>
  )
}

interface ResponsiveTableProps {
  children: ReactNode
  className?: string
}

export function ResponsiveTable({ children, className }: ResponsiveTableProps) {
  return (
    <div className={cn(
      "overflow-x-auto",
      "-mx-4 sm:mx-0", // 移动端负边距，让表格占满宽度
      "shadow ring-1 ring-black ring-opacity-5",
      "sm:rounded-lg",
      className
    )}>
      <div className="inline-block min-w-full align-middle">
        <table className="min-w-full divide-y divide-gray-300">
          {children}
        </table>
      </div>
    </div>
  )
}

interface ResponsiveButtonGroupProps {
  children: ReactNode
  className?: string
  orientation?: 'horizontal' | 'vertical'
}

export function ResponsiveButtonGroup({ 
  children, 
  className,
  orientation = 'horizontal'
}: ResponsiveButtonGroupProps) {
  return (
    <div className={cn(
      "flex gap-2",
      orientation === 'horizontal' ? [
        "flex-col", // 移动端垂直排列
        "sm:flex-row" // 小屏幕及以上水平排列
      ] : "flex-col",
      className
    )}>
      {children}
    </div>
  )
}