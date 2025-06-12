/**
 * 全局类型定义
 */

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

// 扩展Window接口，添加electronAPI属性
declare global {
  interface Window {
    electronAPI: {
      getAppVersion: () => Promise<string>;
      getPlatform: () => Promise<string>;
      getAssetPath: (...paths: string[]) => Promise<string>;
      
      // Elasticsearch API
      elasticsearch: {
        testConnection: (connection: ElasticsearchConnection) => Promise<{
          success: boolean
          version?: string
          nodeCount?: number
          clusterName?: string
          error?: string
        }>
        getNodesInfo: (connection: ElasticsearchConnection) => Promise<any>
        getClusterInfo: (connection: ElasticsearchConnection) => Promise<any>
        getIndices: (connection: ElasticsearchConnection) => Promise<any[]>
        executeQuery: (connection: ElasticsearchConnection, index: string, queryBody: any) => Promise<any>
        createIndex: (connection: ElasticsearchConnection, name: string, settings?: any) => Promise<any>
        deleteIndex: (connection: ElasticsearchConnection, name: string) => Promise<any>
        getIndexSettings: (connection: ElasticsearchConnection, indexName: string) => Promise<any>
        getIndexMapping: (connection: ElasticsearchConnection, indexName: string) => Promise<any>
        ping: (connection: ElasticsearchConnection) => Promise<boolean>
      }
    };
  }
}

// 确保这个文件被视为模块
export {};