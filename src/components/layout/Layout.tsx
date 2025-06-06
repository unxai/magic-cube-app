import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { MainContent } from './MainContent'
import { useAppStore } from '@/stores/app-store'
import { cn } from '@/lib/utils'

/**
 * 主布局组件
 * 提供应用的整体布局结构，包括头部、侧边栏和主内容区域
 */
export function Layout() {
  const { sidebarCollapsed } = useAppStore()

  return (
    <div className="flex h-screen bg-background">
      {/* 侧边栏 */}
      <Sidebar />
      
      {/* 主要内容区域 */}
      <div 
        className={cn(
          "flex flex-col flex-1 transition-all duration-300",
          sidebarCollapsed ? "ml-16" : "ml-64"
        )}
      >
        {/* 头部 */}
        <Header />
        
        {/* 主内容 */}
        <MainContent />
      </div>
    </div>
  )
}