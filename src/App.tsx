import React from 'react'
import { Toaster } from '@/components/ui/toaster'
import { ThemeProvider } from '@/components/theme-provider'
import { Layout } from '@/components/layout/Layout'
import { useAppStore } from '@/stores/app-store'
import { useElasticsearchStore } from '@/stores/elasticsearch-store'
import { useAIStore } from '@/stores/ai-store'

/**
 * 主应用组件
 * 提供主题、状态管理和布局结构
 */
function App() {
  const { isInitialized } = useAppStore()

  // 应用初始化检查
  React.useEffect(() => {
    const initializeApp = async () => {
      try {
        // 使用预加载脚本提供的 API
        if (window.electronAPI) {
          const version = await window.electronAPI.getAppVersion()
          const platform = await window.electronAPI.getPlatform()
          console.log(`Magic Cube v${version} running on ${platform}`)
        }
        
        // 检查并恢复连接状态
        await checkAndRestoreConnections()
        
        // 标记应用已初始化
        useAppStore.getState().setInitialized(true)
      } catch (error) {
        console.error('应用初始化失败:', error)
        // 即使初始化失败也要标记为已初始化，避免卡在加载页面
        useAppStore.getState().setInitialized(true)
      }
    }

    initializeApp()
  }, [])

  /**
   * 检查并恢复连接状态
   * 从本地存储恢复集群连接状态和AI连接状态
   */
  const checkAndRestoreConnections = async () => {
    try {
      const { currentConnection, isConnected, connect, setCurrentConnection } = useElasticsearchStore.getState()
      const { ollamaConnected, ollamaHost, ollamaPort, connectToOllama } = useAIStore.getState()
      
      // 检查是否有保存的当前集群ID
      const currentClusterId = localStorage.getItem('current-cluster-id')
      if (currentClusterId) {
        const savedClusters = localStorage.getItem('elasticsearch-clusters')
        if (savedClusters) {
          const clusters = JSON.parse(savedClusters)
          const savedCluster = clusters.find((c: any) => c.id === currentClusterId)
          
          if (savedCluster) {
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

            const { host, port, protocol } = parseHostAndPort(savedCluster.host)
            
            const connectionConfig = {
              id: savedCluster.id,
              name: savedCluster.name,
              host,
              port,
              protocol,
              username: savedCluster.username,
              password: savedCluster.password,
              isDefault: false,
              createdAt: savedCluster.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
            
            try {
              setCurrentConnection(connectionConfig)
              await connect(connectionConfig)
              console.log('已恢复 Elasticsearch 连接:', savedCluster.name)
            } catch (error) {
              console.error('恢复 Elasticsearch 连接失败:', error)
            }
          }
        }
      }
      
      // 如果有当前连接但显示未连接，尝试重新连接
      if (currentConnection && !isConnected) {
        try {
          await connect(currentConnection)
          console.log('已恢复 Elasticsearch 连接')
        } catch (error) {
          console.error('恢复 Elasticsearch 连接失败:', error)
        }
      }
      
      // 尝试连接到Ollama服务
      if (!ollamaConnected) {
        try {
          // 如果有保存的配置，使用保存的配置；否则使用默认配置
          const host = ollamaHost || 'localhost'
          const port = ollamaPort || 11434
          await connectToOllama(host, port)
          console.log('已连接到 Ollama 服务')
        } catch (error) {
          console.error('连接 Ollama 服务失败:', error)
          // 连接失败不影响应用启动，只是AI功能不可用
        }
      }
    } catch (error) {
      console.error('检查连接状态失败:', error)
    }
  }

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto flex items-center justify-center">
            <img src="/static/logo.svg" alt="Magic Cube Logo" className="w-16 h-16" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold magic-cube-text-gradient">
              Magic Cube
            </h2>
            <p className="text-muted-foreground text-sm">
              正在初始化应用...
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <ThemeProvider defaultTheme="system" storageKey="magic-cube-theme">
      <div className="min-h-screen bg-background font-sans antialiased">
        <Layout />
        <Toaster />
      </div>
    </ThemeProvider>
  )
}

export default App