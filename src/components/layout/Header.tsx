import React from 'react'
import { 
  Sun, 
  Moon, 
  Monitor, 
  Wifi, 
  WifiOff,
  Settings,
  User,
  RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { useTheme } from '@/components/theme-provider'
import { useAppStore } from '@/stores/app-store'
import { useElasticsearchStore } from '@/stores/elasticsearch-store'
import { useAIStore } from '@/stores/ai-store'
import { ClusterSelector } from '@/components/ClusterSelector'


/**
 * 头部组件
 * 提供主题切换、连接状态、用户菜单等功能
 */
export function Header() {
  const { theme, setTheme } = useTheme()
  const { activeTab } = useAppStore()
  const { 
    isConnected: esConnected, 
    currentConnection, 
    clusterInfo,
    fetchClusterInfo,
    fetchIndices,
    connect
  } = useElasticsearchStore()
  const { ollamaConnected, currentModel } = useAIStore()

  /**
   * 获取集群列表
   * 从本地存储中获取已保存的集群配置
   */
  const getClusters = () => {
    try {
      const savedClusters = localStorage.getItem('elasticsearch-clusters')
      if (savedClusters) {
        const clusters = JSON.parse(savedClusters)
        return clusters.map((cluster: any) => ({
          id: cluster.id,
          name: cluster.name,
          host: cluster.host,
          username: cluster.username,
          status: cluster.status || 'disconnected',
          clusterName: cluster.clusterName
        }))
      }
    } catch (error) {
      console.error('获取集群列表失败:', error)
    }
    return []
  }

  /**
   * 处理集群切换
   * @param cluster 要切换到的集群
   */
  const handleClusterChange = async (cluster: any) => {
    try {
      // 解析主机地址、端口和协议
      const parseHostAndPort = (hostInput: string): { host: string; port: number; protocol: 'http' | 'https' } => {
        let protocol: 'http' | 'https' = 'http'
        let cleanInput = hostInput
        
        if (hostInput.startsWith('https://')) {
          protocol = 'https'
          cleanInput = hostInput.replace(/^https:\/\//, '')
        } else if (hostInput.startsWith('http://')) {
          protocol = 'http'
          cleanInput = hostInput.replace(/^http:\/\//, '')
        }
        
        const portMatch = cleanInput.match(/^(.+):(\d+)$/)
        if (portMatch) {
          return {
            host: portMatch[1],
            port: parseInt(portMatch[2], 10),
            protocol
          }
        }
        
        return {
          host: cleanInput,
          port: protocol === 'https' ? 9243 : 9200,
          protocol
        }
      }

      const { host, port, protocol } = parseHostAndPort(cluster.host)
      
      // 创建连接配置
      const connectionConfig = {
        id: cluster.id,
        name: cluster.name,
        host,
        port,
        protocol,
        username: cluster.username,
        password: cluster.password,
        isDefault: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      // 连接到集群
      await connect(connectionConfig)
      
      // 保存当前集群ID
      localStorage.setItem('current-cluster-id', cluster.id)
      
      // 更新本地集群状态
      const savedClusters = localStorage.getItem('elasticsearch-clusters')
      if (savedClusters) {
        const clusters = JSON.parse(savedClusters)
        const updatedClusters = clusters.map((c: any) => 
          c.id === cluster.id ? { ...c, status: 'connected', lastConnected: new Date() } : c
        )
        localStorage.setItem('elasticsearch-clusters', JSON.stringify(updatedClusters))
      }
      
    } catch (error) {
      console.error('切换集群失败:', error)
      
      // 更新失败状态
      const savedClusters = localStorage.getItem('elasticsearch-clusters')
      if (savedClusters) {
        const clusters = JSON.parse(savedClusters)
        const updatedClusters = clusters.map((c: any) => 
          c.id === cluster.id ? { ...c, status: 'disconnected' } : c
        )
        localStorage.setItem('elasticsearch-clusters', JSON.stringify(updatedClusters))
      }
    }
  }

  /**
   * 获取当前页面标题
   */
  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return '仪表板'
      case 'search-query':
        return '搜索查询'
      case 'indices':
        return '索引管理'
      case 'cluster-management':
        return '集群管理'
      case 'ai-chat':
        return 'AI 助手'
      case 'settings':
        return '设置'
      default:
        return 'Magic Cube'
    }
  }

  /**
   * 刷新数据
   */
  const handleRefresh = async () => {
    if (esConnected) {
      try {
        await Promise.all([
          fetchClusterInfo(),
          fetchIndices()
        ])
      } catch (error) {
        console.error('刷新数据失败:', error)
      }
    }
  }

  /**
   * 渲染主题切换按钮
   */
  const renderThemeToggle = () => {
    const themeIcons = {
      light: Sun,
      dark: Moon,
      system: Monitor,
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            {React.createElement(themeIcons[theme], { className: "h-4 w-4" })}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>主题设置</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setTheme('light')}>
            <Sun className="mr-2 h-4 w-4" />
            亮色模式
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme('dark')}>
            <Moon className="mr-2 h-4 w-4" />
            暗色模式
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme('system')}>
            <Monitor className="mr-2 h-4 w-4" />
            跟随系统
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <header className="h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between h-full px-6">
        {/* 左侧：集群选择器和页面标题 */}
        <div className="flex items-center space-x-6">
          <ClusterSelector
            currentCluster={currentConnection ? {
              id: currentConnection.id || 'default',
              name: currentConnection.name || '默认集群',
              host: currentConnection.host,
              username: currentConnection.username,
              status: esConnected ? 'connected' : 'disconnected',
              clusterName: clusterInfo?.cluster_name
            } : undefined}
            clusters={getClusters()}
            onClusterChange={handleClusterChange}
          />
          <div className="h-6 w-px bg-border" />
          <h1 className="text-lg font-medium text-foreground">
            {getPageTitle()}
          </h1>
        </div>

        {/* 右侧：状态指示器和操作按钮 */}
        <div className="flex items-center space-x-3">
          {/* Elasticsearch 连接状态 */}
          <div className="flex items-center space-x-2">
            {esConnected ? (
              <Wifi className="h-4 w-4 text-green-600" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-600" />
            )}
            <Badge 
              variant={esConnected ? "default" : "destructive"}
              className="text-xs"
            >
              ES {esConnected ? '已连接' : '未连接'}
            </Badge>
          </div>

          {/* AI 模型状态 */}
          <div className="flex items-center space-x-2">
            <Badge 
              variant={ollamaConnected ? "default" : "secondary"}
              className="text-xs"
            >
              AI {ollamaConnected ? (currentModel?.name || 'Ollama') : '未连接'}
            </Badge>
          </div>

          {/* 刷新按钮 */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={handleRefresh}
            disabled={!esConnected}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>

          {/* 主题切换 */}
          {renderThemeToggle()}

          {/* 用户菜单 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <User className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>我的账户</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                设置
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                关于 Magic Cube
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}