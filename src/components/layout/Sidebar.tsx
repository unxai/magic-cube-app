// import React from 'react'
import { 
  Database, 
  MessageSquare, 
  BarChart3, 
  Settings, 
  Search,
  History,
  ChevronLeft,
  ChevronRight,
  Server
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useAppStore } from '@/stores/app-store'
import { cn } from '@/lib/utils'

/**
 * 导航菜单项接口
 */
interface NavItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string | number
  disabled?: boolean
}

/**
 * 导航菜单配置
 */
const navItems: NavItem[] = [
  {
    id: 'dashboard',
    label: '仪表板',
    icon: BarChart3,
  },
  {
    id: 'search',
    label: '搜索查询',
    icon: Search,
  },
  {
    id: 'indices',
    label: '索引管理',
    icon: Database,
  },
  {
    id: 'cluster-management',
    label: '集群管理',
    icon: Server,
  },
  {
    id: 'ai-chat',
    label: 'AI 助手',
    icon: MessageSquare,
  },
  {
    id: 'history',
    label: '查询历史',
    icon: History,
  },
]

/**
 * 底部菜单配置
 */
const bottomNavItems: NavItem[] = [
  {
    id: 'settings',
    label: '设置',
    icon: Settings,
  },
]

/**
 * 侧边栏组件
 * 提供应用的主要导航功能
 */
export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, activeTab, setActiveTab } = useAppStore()
 
  /**
   * 渲染导航项
   */
  const renderNavItem = (item: NavItem) => {
    const isActive = activeTab === item.id
    const IconComponent = item.icon

    const button = (
      <Button
        variant={isActive ? "secondary" : "ghost"}
        size={sidebarCollapsed ? "icon" : "default"}
        className={cn(
          "w-full justify-start transition-all duration-200",
          sidebarCollapsed ? "px-2" : "px-3",
          isActive && "bg-primary/10 text-primary border-r-2 border-primary",
          item.disabled && "opacity-50 cursor-not-allowed"
        )}
        onClick={() => !item.disabled && setActiveTab(item.id)}
        disabled={item.disabled}
      >
        <IconComponent className={cn(
          "h-5 w-5",
          !sidebarCollapsed && "mr-3"
        )} />
        {!sidebarCollapsed && (
          <>
            <span className="flex-1 text-left">{item.label}</span>
            {item.badge && (
              <span className="ml-2 px-2 py-1 text-xs bg-primary/20 text-primary rounded-full">
                {item.badge}
              </span>
            )}
          </>
        )}
      </Button>
    )

    if (sidebarCollapsed) {
      return (
        <TooltipProvider key={item.id}>
          <Tooltip>
            <TooltipTrigger asChild>
              {button}
            </TooltipTrigger>
            <TooltipContent side="right" className="ml-2">
              <p>{item.label}</p>
              {item.badge && (
                <span className="ml-2 px-1 py-0.5 text-xs bg-primary/20 text-primary rounded">
                  {item.badge}
                </span>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    }

    return <div key={item.id}>{button}</div>
  }

  return (
    <div className={cn(
      "fixed left-0 top-0 h-full bg-card border-r border-border transition-all duration-300 z-50",
      sidebarCollapsed ? "w-16" : "w-64"
    )}>
      {/* 头部 Logo 区域 */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        {!sidebarCollapsed && (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 flex items-center justify-center">
              <img src="/static/logo.svg" alt="Magic Cube Logo" className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-lg font-bold magic-cube-text-gradient">
                Magic Cube
              </h1>
              <p className="text-xs text-muted-foreground">
                智能数据查询工具
              </p>
            </div>
          </div>
        )}
        
        {/* 折叠按钮 */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="h-8 w-8"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>



      {/* 导航菜单 */}
      <nav className="flex-1 px-4 py-4 space-y-2">
        {navItems.map(renderNavItem)}
      </nav>

      {/* 底部菜单 */}
      <div className="px-4 py-4 border-t border-border space-y-2">
        {bottomNavItems.map(renderNavItem)}
      </div>
    </div>
  )
}