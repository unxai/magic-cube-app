import React from 'react'
import { 
  Sun, 
  Moon, 
  Monitor, 
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
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
    currentConnection, 
    clusterInfo,
    fetchClusterInfo,
    fetchIndices,
    testConnection
  } = useElasticsearchStore()
  const { 
    ollamaConnected, 
    currentModel, 
    availableModels,
    setCurrentModel,
    fetchAvailableModels,
    isModelLoading
  } = useAIStore()

  /**
   * 初始化AI模型
   */
  React.useEffect(() => {
    if (ollamaConnected && availableModels.length === 0) {
      fetchAvailableModels()
    }
  }, [ollamaConnected, fetchAvailableModels, availableModels.length])

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
          password: cluster.password,
          status: cluster.status || 'disconnected',
          clusterName: cluster.clusterName,
          version: cluster.version,
          nodeCount: cluster.nodeCount
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
      
      // 使用共享的切换集群函数
      await useElasticsearchStore.getState().switchCluster(connectionConfig)
      
    } catch (error) {
      console.error('切换集群失败:', error)
    }
  }

  /**
   * 测试集群连接
   * @param connection 要测试的连接配置
   */
  const handleTestConnection = async (connection: any) => {
    try {
      return await testConnection(connection)
    } catch (error) {
      console.error('测试连接失败:', error)
      return {
        success: false,
        error: '测试连接失败: ' + (error instanceof Error ? error.message : '未知错误')
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
    if (currentConnection?.status === 'connected') {
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
              id: currentConnection.id,
              name: currentConnection.name,
              host: currentConnection.host,
              username: currentConnection.username,
              password: currentConnection.password,
              status: currentConnection.status,
              clusterName: clusterInfo?.cluster_name,
              version: clusterInfo?.version?.number,
              nodeCount: clusterInfo ? 1 : undefined
            } : undefined}
            clusters={getClusters()}
            onClusterChange={handleClusterChange}
            onTestConnection={handleTestConnection}
          />
          <div className="h-6 w-px bg-border" />
          <h1 className="text-lg font-medium text-foreground">
            {getPageTitle()}
          </h1>
        </div>

        {/* 右侧：状态指示器和操作按钮 */}
        <div className="flex items-center space-x-3">
          {/* AI 模型选择器 */}
          {ollamaConnected && availableModels.length > 0 ? (
            <div className="flex items-center space-x-2">
              <Label htmlFor="global-model-select" className="text-sm text-muted-foreground whitespace-nowrap">
                AI模型:
              </Label>
              <Select
                value={currentModel?.id || ''}
                onValueChange={(value) => {
                  const model = availableModels.find(m => m.id === value)
                  if (model) {
                    setCurrentModel(model)
                  }
                }}
                disabled={isModelLoading}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder={isModelLoading ? "加载中..." : "选择模型"} />
                </SelectTrigger>
                <SelectContent>
                  {availableModels
                    .filter(model => model.isAvailable)
                    .map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Badge 
                variant={ollamaConnected ? "default" : "secondary"}
                className="text-xs"
              >
                AI {ollamaConnected ? '已连接' : '未连接'}
              </Badge>
            </div>
          )}

          {/* 刷新按钮 */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={handleRefresh}
            disabled={currentConnection?.status !== 'connected'}
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