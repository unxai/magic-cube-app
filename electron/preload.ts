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
    getClusterInfo: (connection: ElasticsearchConnection) => Promise<any>
    getIndices: (connection: ElasticsearchConnection) => Promise<any[]>
    executeQuery: (connection: ElasticsearchConnection, index: string, queryBody: any) => Promise<any>
    createIndex: (connection: ElasticsearchConnection, name: string, settings?: any) => Promise<any>
    deleteIndex: (connection: ElasticsearchConnection, name: string) => Promise<any>
    getIndexSettings: (connection: ElasticsearchConnection, indexName: string) => Promise<any>
    getIndexMapping: (connection: ElasticsearchConnection, indexName: string) => Promise<any>
    ping: (connection: ElasticsearchConnection) => Promise<boolean>
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
    }
  }
} as ElectronAPI)