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
/**
 * 节点信息
 */
export interface NodesInfo {
  _nodes: {
    total: number
    successful: number
    failed: number
  }
  cluster_name: string
  nodes: {
    [key: string]: {
      name: string
      version: string
      ip: string
      transport_address?: string
      roles: string[]
      settings?: {
        node?: {
          master?: string
        }
      }
      os?: {
        name?: string
        version?: string
      }
      jvm?: {
        version?: string
        mem?: {
          heap_used_in_bytes?: number
          heap_max_in_bytes?: number
        }
      }
      stats?: {
        process?: {
          cpu?: {
            percent?: number
          }
          mem?: {
            resident_in_bytes?: number
          }
        }
        fs?: {
          total?: {
            total_in_bytes?: number
            free_in_bytes?: number
          }
        }
      }
    }
  }
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
  currentConnection: (ElasticsearchConnection & { status: 'connected' | 'disconnected' | 'error' | 'testing' }) | null

  // 连接状态
  isConnecting: boolean
  isLoading: boolean
  connectionError: string | null

  // 集群信息
  clusterInfo: ClusterInfo | null

  // 节点信息
  nodesInfo: NodesInfo | null

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
  switchCluster: (connection: ElasticsearchConnection) => Promise<boolean>

  // 集群操作
  fetchClusterInfo: () => Promise<void>
  fetchIndices: () => Promise<void>
  fetchNodesInfo: () => Promise<void>

  // 索引操作
  setSelectedIndex: (index: string | null) => void
  executeQuery: (index: string, queryBody: any) => Promise<any>
  createIndex: (name: string, settings?: any) => Promise<any>
  deleteIndex: (name: string) => Promise<any>
  getIndexSettings: (indexName: string) => Promise<any>
  getIndexMapping: (indexName: string) => Promise<any>
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
  isConnecting: false,
  isLoading: false,
  connectionError: null,
  clusterInfo: null,
  nodesInfo: null,
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
          }
        })
      },

      setCurrentConnection: (connection: ElasticsearchConnection | null) => {
        set({ currentConnection: connection ? { ...connection, status: 'disconnected' } : null })
      },

      // 连接操作
      connect: async (connection) => {
        // 如果当前已有连接，先断开
        if (get().currentConnection?.status === 'connected') {
          get().disconnect()
        }

        set({ isConnecting: true, connectionError: null })

        try {
          // 使用 Electron API 测试连接
          const elasticsearchAPI = getElasticsearchAPI()
          const pingResult = await elasticsearchAPI.ping(connection)

          if (!pingResult) {
            throw new Error('无法连接到 Elasticsearch 服务器')
          }

          set({
            currentConnection: { ...connection, status: 'connected' },
            isConnecting: false,
            connectionError: null,
          })

          // 连接成功后获取集群信息
          await get().fetchClusterInfo()
          await get().fetchIndices()
          await get().fetchNodesInfo()

        } catch (error) {
          set({
            isConnecting: false,
            connectionError: error instanceof Error ? error.message : '连接失败',
          })
          // 连接失败时清除当前连接
          set({
            currentConnection: { ...connection, status: 'error' },
          })
          throw error
        }
      },

      disconnect: () => {
        set(state => ({
          currentConnection: state.currentConnection ? { ...state.currentConnection, status: 'disconnected' } : null,
          clusterInfo: null,
          nodesInfo: null,
          indices: [],
          selectedIndex: null,
          connectionError: null,
        }))
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

      /**
       * 切换到指定集群
       * 先断开当前连接，然后连接到新集群
       */
      switchCluster: async (connection: ElasticsearchConnection) => {
        const { currentConnection, disconnect, connect } = get();
        
        // 如果当前有连接，先断开
        if (currentConnection?.status === 'connected') {
          disconnect();
        }
        
        // 连接到新集群
        try {
          await connect(connection);
          
          // 保存当前集群ID到本地存储
          localStorage.setItem('current-cluster-id', connection.id);
          
          // 更新本地集群状态
          const savedClusters = localStorage.getItem('elasticsearch-clusters');
          if (savedClusters) {
            const clusters = JSON.parse(savedClusters);
            const updatedClusters = clusters.map((c: any) => 
              c.id === connection.id ? { ...c, status: 'connected', lastConnected: new Date() } : c
            );
            localStorage.setItem('elasticsearch-clusters', JSON.stringify(updatedClusters));
          }
          
          return true;
        } catch (error) {
          // 更新失败状态
          const savedClusters = localStorage.getItem('elasticsearch-clusters');
          if (savedClusters) {
            const clusters = JSON.parse(savedClusters);
            const updatedClusters = clusters.map((c: any) => 
              c.id === connection.id ? { ...c, status: 'disconnected' } : c
            );
            localStorage.setItem('elasticsearch-clusters', JSON.stringify(updatedClusters));
          }
          
          throw error;
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

      fetchNodesInfo: async () => {
        try {
          const connection = get().currentConnection
          if (!connection) {
            throw new Error('未连接到 Elasticsearch')
          }

          const elasticsearchAPI = getElasticsearchAPI()
          const response = await elasticsearchAPI.getNodesInfo(connection) as unknown as { nodes: { [key: string]: any } }

          // 确保节点信息中包含 CPU 和内存使用率
          if (response && response.nodes) {
            Object.values(response.nodes).forEach((node: any) => {
              if (!node.stats?.process?.cpu?.percent) {
                node.stats = {
                  ...node.stats,
                  process: {
                    ...node.stats?.process,
                    cpu: { percent: 0 }
                  }
                }
              }
              if (!node.stats?.process?.mem?.resident_in_bytes) {
                node.stats = {
                  ...node.stats,
                  process: {
                    ...node.stats?.process,
                    mem: { resident_in_bytes: 0 }
                  }
                }
              }
            })
          }

          set({ nodesInfo: response as NodesInfo })
        } catch (error) {
          console.error('获取节点信息失败:', error)
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

      /**
       * 获取索引设置
       */
      getIndexSettings: async (indexName) => {
        try {
          const connection = get().currentConnection
          if (!connection) {
            throw new Error('未连接到 Elasticsearch')
          }

          const elasticsearchAPI = getElasticsearchAPI()
          const result = await elasticsearchAPI.getIndexSettings(connection, indexName)

          return result
        } catch (error) {
          console.error('获取索引设置失败:', error)
          throw error
        }
      },

      /**
       * 获取索引映射
       */
      getIndexMapping: async (indexName) => {
        try {
          const connection = get().currentConnection
          if (!connection) {
            throw new Error('未连接到 Elasticsearch')
          }

          const elasticsearchAPI = getElasticsearchAPI()
          const result = await elasticsearchAPI.getIndexMapping(connection, indexName)

          return result
        } catch (error) {
          console.error('获取索引映射失败:', error)
          throw error
        }
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

          // 确保 queryBody 是对象类型
          const queryObject = typeof queryBody === 'string' ? JSON.parse(queryBody) : queryBody

          const elasticsearchAPI = getElasticsearchAPI()
          const result = await elasticsearchAPI.executeQuery(connection, index, queryObject)

          // 添加到查询历史
          get().addToHistory(JSON.stringify(queryObject, null, 2), index, result)

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
        queryHistory: state.queryHistory,
      }),
    }
  )
)