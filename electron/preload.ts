import { contextBridge, ipcRenderer } from 'electron'

/**
 * Elasticsearch 连接配置
 */
interface ElasticsearchConnection {
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
 * Electron API 接口定义
 */
/**
 * 节点信息接口
 */
interface NodeInfo {
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

/**
 * 节点信息响应接口
 */
interface NodesResponse {
  _nodes: {
    total: number
    successful: number
    failed: number
  }
  nodes: {
    [key: string]: NodeInfo
  }
}

interface ElectronAPI {
  getAppVersion: () => Promise<string>
  getPlatform: () => Promise<string>
  getAssetPath: (...paths: string[]) => Promise<string>
  
  // Elasticsearch API
  elasticsearch: {
    testConnection: (connection: ElasticsearchConnection) => Promise<{
      success: boolean
      version?: string
      nodeCount?: number
      clusterName?: string
      error?: string
    }>
    getClusterInfo: (connection: ElasticsearchConnection) => Promise<{
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
    }>
    getIndices: (connection: ElasticsearchConnection) => Promise<Array<{
      index: string
      health: 'green' | 'yellow' | 'red'
      status: 'open' | 'close'
      pri: number
      rep: number
      docsCount: number
      docsDeleted: number
      storeSize: string
      priStoreSize: string
    }>>
    executeQuery: (connection: ElasticsearchConnection, index: string, queryBody: any) => Promise<{
      hits: any[]
      total: any
      took: number
    }>
    createIndex: (connection: ElasticsearchConnection, name: string, settings?: any) => Promise<{
      acknowledged: boolean
      shards_acknowledged: boolean
      index: string
    }>
    deleteIndex: (connection: ElasticsearchConnection, name: string) => Promise<{
      acknowledged: boolean
    }>
    getIndexSettings: (connection: ElasticsearchConnection, indexName: string) => Promise<any>
    getIndexMapping: (connection: ElasticsearchConnection, indexName: string) => Promise<any>
    ping: (connection: ElasticsearchConnection) => Promise<boolean>
    getNodesInfo: (connection: ElasticsearchConnection) => Promise<NodesResponse>
  }
}

/**
 * 向渲染进程暴露安全的 API
 */
contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * 获取应用版本号
   */
  getAppVersion: (): Promise<string> => {
    return ipcRenderer.invoke('get-version')
  },

  /**
   * 获取操作系统平台
   */
  getPlatform: (): Promise<string> => {
    return ipcRenderer.invoke('get-platform')
  },
  
  /**
   * Elasticsearch API
   */
  elasticsearch: {
    testConnection: (connection: ElasticsearchConnection) => {
      return ipcRenderer.invoke('elasticsearch:test-connection', connection)
    },
    getClusterInfo: (connection: ElasticsearchConnection) => {
      return ipcRenderer.invoke('elasticsearch:get-cluster-info', connection)
    },
    getIndices: (connection: ElasticsearchConnection) => {
      return ipcRenderer.invoke('elasticsearch:get-indices', connection)
    },
    executeQuery: (connection: ElasticsearchConnection, index: string, queryBody: any) => {
      return ipcRenderer.invoke('elasticsearch:execute-query', connection, index, queryBody)
    },
    createIndex: (connection: ElasticsearchConnection, name: string, settings?: any) => {
      return ipcRenderer.invoke('elasticsearch:create-index', connection, name, settings)
    },
    deleteIndex: (connection: ElasticsearchConnection, name: string) => {
      return ipcRenderer.invoke('elasticsearch:delete-index', connection, name)
    },
    getIndexSettings: (connection: ElasticsearchConnection, indexName: string) => {
      return ipcRenderer.invoke('elasticsearch:get-index-settings', connection, indexName)
    },
    getIndexMapping: (connection: ElasticsearchConnection, indexName: string) => {
      return ipcRenderer.invoke('elasticsearch:get-index-mapping', connection, indexName)
    },
    ping: (connection: ElasticsearchConnection) => {
      return ipcRenderer.invoke('elasticsearch:ping', connection)
    },
    getNodesInfo: (connection: ElasticsearchConnection) => {
      return ipcRenderer.invoke('elasticsearch:get-nodes-info', connection)
    }
  }
} as ElectronAPI)