import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * 获取 Elasticsearch API
 * 从 Electron 预加载脚本中获取 Elasticsearch 相关功能
 */
const getElasticsearchAPI = () => {
  if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.elasticsearch) {
    return window.electronAPI.elasticsearch
  }
  throw new Error('Elasticsearch API not available. Please ensure you are running in Electron environment.')
}

/**
 * Elasticsearch 连接配置
 */
export interface ElasticsearchConnection {
  id: string
  name: string
  host: string
  port: number
  protocol: 'http' | 'https'
  username?: string
  password?: string
  apiKey?: string
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

/**
 * 集群信息
 */
export interface ClusterInfo {
  name: string
  cluster_name: string
  cluster_uuid: string
  version: {
    number: string
    build_flavor: string
    build_type: string
    build_hash: string
    build_date: string
    build_snapshot: boolean
    lucene_version: string
    minimum_wire_compatibility_version: string
    minimum_index_compatibility_version: string
  }
  tagline: string
}

/**
 * 索引信息
 */
export interface IndexInfo {
  index: string
  health: 'green' | 'yellow' | 'red'
  status: 'open' | 'close'
  pri: number
  rep: number
  docsCount: number
  docsDeleted: number
  storeSize: string
  priStoreSize: string
}

/**
 * Elasticsearch 状态接口
 */
interface ElasticsearchState {
  // 连接配置
  connections: ElasticsearchConnection[]
  currentConnection: ElasticsearchConnection | null
  
  // 连接状态
  isConnected: boolean
  isConnecting: boolean
  isLoading: boolean
  connectionError: string | null
  
  // 集群信息
  clusterInfo: ClusterInfo | null
  
  // 索引信息
  indices: IndexInfo[]
  selectedIndex: string | null
  
  // 查询历史
  queryHistory: Array<{
    id: string
    query: string
    timestamp: string
    index?: string
    results?: any
  }>
}

/**
 * Elasticsearch 操作接口
 */
interface ElasticsearchActions {
  // 连接管理
  addConnection: (connection: Omit<ElasticsearchConnection, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateConnection: (id: string, updates: Partial<ElasticsearchConnection>) => void
  deleteConnection: (id: string) => void
  setCurrentConnection: (connection: ElasticsearchConnection | null) => void
  
  // 连接操作
  connect: (connection: ElasticsearchConnection) => Promise<void>
  disconnect: () => void
  testConnection: (connection: ElasticsearchConnection) => Promise<{
    success: boolean
    version?: string
    nodeCount?: number
    clusterName?: string
    error?: string
  }>
  
  // 集群操作
  fetchClusterInfo: () => Promise<void>
  fetchIndices: () => Promise<void>
  
  // 索引操作
  setSelectedIndex: (index: string | null) => void
  executeQuery: (index: string, queryBody: any) => Promise<any>
  createIndex: (name: string, settings?: any) => Promise<any>
  deleteIndex: (name: string) => Promise<any>
  refreshIndices: () => Promise<void>
  
  // 查询历史
  addToHistory: (query: string, index?: string, results?: any) => void
  clearHistory: () => void
  
  // 错误处理
  setConnectionError: (error: string | null) => void
  clearError: () => void
}

/**
 * Elasticsearch Store 类型
 */
export type ElasticsearchStore = ElasticsearchState & ElasticsearchActions

/**
 * 初始状态
 */
const initialState: ElasticsearchState = {
  connections: [],
  currentConnection: null,
  isConnected: false,
  isConnecting: false,
  isLoading: false,
  connectionError: null,
  clusterInfo: null,
  indices: [],
  selectedIndex: null,
  queryHistory: [],
}

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

// Elasticsearch 客户端功能现在通过 Electron IPC 提供，无需在渲染进程中创建客户端

/**
 * Elasticsearch 状态管理 Store
 */
export const useElasticsearchStore = create<ElasticsearchStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      // 连接管理
      addConnection: (connectionData) => {
        const connection: ElasticsearchConnection = {
          ...connectionData,
          id: generateId(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        
        set((state) => ({
          connections: [...state.connections, connection]
        }))
      },
      
      updateConnection: (id, updates) => {
        set((state) => ({
          connections: state.connections.map(conn => 
            conn.id === id 
              ? { ...conn, ...updates, updatedAt: new Date().toISOString() }
              : conn
          )
        }))
      },
      
      deleteConnection: (id) => {
        set((state) => {
          const newConnections = state.connections.filter(conn => conn.id !== id)
          const newCurrentConnection = state.currentConnection?.id === id 
            ? null 
            : state.currentConnection
          
          return {
            connections: newConnections,
            currentConnection: newCurrentConnection,
            isConnected: newCurrentConnection ? state.isConnected : false,
          }
        })
      },
      
      setCurrentConnection: (connection) => {
        set({ currentConnection: connection })
      },
      
      // 连接操作
      connect: async (connection) => {
        set({ isConnecting: true, connectionError: null })
        
        try {
          // 使用 Electron API 测试连接
          const elasticsearchAPI = getElasticsearchAPI()
          const pingResult = await elasticsearchAPI.ping(connection)
          
          if (!pingResult) {
            throw new Error('无法连接到 Elasticsearch 服务器')
          }
          
          set({
            currentConnection: connection,
            isConnected: true,
            isConnecting: false,
            connectionError: null,
          })
          
          // 连接成功后获取集群信息
          await get().fetchClusterInfo()
          await get().fetchIndices()
          
        } catch (error) {
          set({
            isConnecting: false,
            connectionError: error instanceof Error ? error.message : '连接失败',
          })
          throw error
        }
      },
      
      disconnect: () => {
        set({
          isConnected: false,
          currentConnection: null,
          clusterInfo: null,
          indices: [],
          selectedIndex: null,
          connectionError: null,
        })
      },
      
      testConnection: async (connection) => {
        try {
          const elasticsearchAPI = getElasticsearchAPI()
          return await elasticsearchAPI.testConnection(connection)
        } catch (error) {
          return {
            success: false,
            error: '连接失败: ' + (error instanceof Error ? error.message : '未知错误')
          }
        }
      },
      
      // 集群操作
      fetchClusterInfo: async () => {
        try {
          const connection = get().currentConnection
          if (!connection) {
            throw new Error('未连接到 Elasticsearch')
          }
          
          const elasticsearchAPI = getElasticsearchAPI()
          const response = await elasticsearchAPI.getClusterInfo(connection)
          
          set({ clusterInfo: response as ClusterInfo })
        } catch (error) {
          console.error('获取集群信息失败:', error)
        }
      },
      
      fetchIndices: async () => {
        set({ isLoading: true })
        try {
          const connection = get().currentConnection
          if (!connection) {
            throw new Error('未连接到 Elasticsearch')
          }
          
          const elasticsearchAPI = getElasticsearchAPI()
          const indices = await elasticsearchAPI.getIndices(connection)
          
          set({ indices })
        } catch (error) {
          console.error('获取索引信息失败:', error)
        } finally {
          set({ isLoading: false })
        }
      },
      
      // 索引操作
      setSelectedIndex: (index) => {
        set({ selectedIndex: index })
      },
      
      createIndex: async (name, settings) => {
        try {
          const connection = get().currentConnection
          if (!connection) {
            throw new Error('未连接到 Elasticsearch')
          }
          
          const elasticsearchAPI = getElasticsearchAPI()
          const result = await elasticsearchAPI.createIndex(connection, name, settings)
          
          // 刷新索引列表
          await get().fetchIndices()
          
          return result
        } catch (error) {
          console.error('创建索引失败:', error)
          throw error
        }
      },
      
      deleteIndex: async (name) => {
        try {
          const connection = get().currentConnection
          if (!connection) {
            throw new Error('未连接到 Elasticsearch')
          }
          
          const elasticsearchAPI = getElasticsearchAPI()
          const result = await elasticsearchAPI.deleteIndex(connection, name)
          
          // 刷新索引列表
          await get().fetchIndices()
          
          return result
        } catch (error) {
          console.error('删除索引失败:', error)
          throw error
        }
      },
      
      refreshIndices: async () => {
        await get().fetchIndices()
      },
      
      // 查询历史
      addToHistory: (query, index, results) => {
        const historyItem = {
          id: generateId(),
          query,
          timestamp: new Date().toISOString(),
          index,
          results,
        }
        
        set((state) => ({
          queryHistory: [historyItem, ...state.queryHistory.slice(0, 99)] // 保留最近100条
        }))
      },
      
      executeQuery: async (index, queryBody) => {
        try {
          const connection = get().currentConnection
          if (!connection) {
            throw new Error('未连接到 Elasticsearch')
          }
          
          const elasticsearchAPI = getElasticsearchAPI()
          const result = await elasticsearchAPI.executeQuery(connection, index, queryBody)
          
          // 添加到查询历史
          get().addToHistory(JSON.stringify(queryBody, null, 2), index, result)
          
          return result
        } catch (error) {
          console.error('执行查询失败:', error)
          throw error
        }
      },
      
      clearHistory: () => {
        set({ queryHistory: [] })
      },
      
      // 错误处理
      setConnectionError: (error) => {
        set({ connectionError: error })
      },
      
      clearError: () => {
        set({ connectionError: null })
      },
    }),
    {
      name: 'magic-cube-elasticsearch-store',
      // 持久化连接配置、当前连接、连接状态和查询历史
      partialize: (state) => ({
        connections: state.connections,
        currentConnection: state.currentConnection,
        isConnected: state.isConnected,
        queryHistory: state.queryHistory,
      }),
    }
  )
)