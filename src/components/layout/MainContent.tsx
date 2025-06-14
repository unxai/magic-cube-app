import { useAppStore } from '@/stores/app-store'
import { Dashboard } from '@/components/pages/Dashboard'
import { SearchQuery } from '@/components/pages/SearchQuery'
import { IndexManagement } from '@/components/pages/IndexManagement'
import { AIChat } from '@/components/pages/AIChat'
import { Settings } from '@/components/pages/Settings'

/**
 * 主内容区域组件
 * 根据当前活跃的标签页渲染对应的页面组件
 */
export function MainContent() {
  const { activeTab } = useAppStore()

  /**
   * 根据活跃标签页渲染对应的页面组件
   */
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />
      case 'search-query':
        return <SearchQuery />
      case 'indices':
        return <IndexManagement />
      case 'ai-chat':
        return <AIChat />
      case 'settings':
        return <Settings />
      default:
        return <Dashboard />
    }
  }

  return (
    <main className="flex-1 overflow-hidden bg-background">
      <div className="h-full overflow-auto">
        {renderContent()}
      </div>
    </main>
  )
}