import { useAppStore } from '@/stores/app-store'
import { Dashboard } from '@/components/pages/Dashboard'
import { SearchQuery } from '@/components/pages/SearchQuery'
import { IndexManagement } from '@/components/pages/IndexManagement'
import { ClusterManagement } from '@/components/pages/ClusterManagement'
import { AIChat } from '@/components/pages/AIChat'
import { QueryHistory } from '@/components/pages/QueryHistory'
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
      case 'search':
        return <SearchQuery />
      case 'indices':
        return <IndexManagement />
      case 'cluster-management':
        return <ClusterManagement />
      case 'ai-chat':
        return <AIChat />
      case 'history':
        return <QueryHistory />
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