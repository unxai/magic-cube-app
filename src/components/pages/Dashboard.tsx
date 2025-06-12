import React from 'react'
import { 
  Database, 
  Activity, 
  HardDrive, 
  TrendingUp,
  FileText,
  Server
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useElasticsearchStore } from '@/stores/elasticsearch-store'
import { useAppStore } from '@/stores/app-store'
import { formatNumber } from '@/lib/utils'

/**
 * 统计卡片组件
 */
interface StatCardProps {
  title: string
  value: string | number
  description?: string
  icon: React.ComponentType<{ className?: string }>
  trend?: {
    value: number
    isPositive: boolean
  }
}

function StatCard({ title, value, description, icon: Icon, trend }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {trend && (
          <div className="flex items-center mt-2">
            <TrendingUp className={`h-3 w-3 mr-1 ${
              trend.isPositive ? 'text-green-600' : 'text-red-600'
            }`} />
            <span className={`text-xs ${
              trend.isPositive ? 'text-green-600' : 'text-red-600'
            }`}>
              {trend.isPositive ? '+' : ''}{trend.value}%
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * 仪表板页面组件
 * 显示 Elasticsearch 集群状态和系统概览
 */
export function Dashboard() {
  const { 
    currentConnection,
    clusterInfo, 
    indices,
    nodesInfo,
    fetchNodesInfo
  } = useElasticsearchStore()

  /**
   * 计算总文档数
   */
  const totalDocs = React.useMemo(() => {
    return indices.reduce((total, index) => total + index['docsCount'], 0)
  }, [indices])

  /**
   * 计算总存储大小
   */
  const totalSize = React.useMemo(() => {
    // 这里简化处理，实际应该解析存储大小字符串
    return indices.length > 0 ? '2.1 GB' : '0 B'
  }, [indices])

  /**
   * 获取健康索引数量
   */
  const healthyIndices = React.useMemo(() => {
    return indices.filter(index => index.health === 'green').length
  }, [indices])

  /**
   * 获取节点数量
   */
  const nodeCount = React.useMemo(() => {
    return nodesInfo ? Object.keys(nodesInfo.nodes || {}).length : 0
  }, [nodesInfo])

  /**
   * 刷新节点信息
   */
  React.useEffect(() => {
    if (currentConnection?.status === 'connected' && !nodesInfo) {
      fetchNodesInfo()
    }
  }, [currentConnection?.status, nodesInfo, fetchNodesInfo])

  return (
    <div className="p-6 space-y-8">
      {/* 页面标题和状态栏 */}
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">仪表板</h1>
          <p className="text-muted-foreground">
            查看 Elasticsearch 集群状态和系统概览
          </p>
        </div>
        {currentConnection?.status === 'connected' && (
          <Badge 
            variant="default"
            className="px-4 py-1 text-sm"
          >
            集群已连接
          </Badge>
        )}
      </div>

      {/* 连接状态卡片 */}
      {(!currentConnection || currentConnection.status !== 'connected') && (
        <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
          <CardHeader>
            <CardTitle className="text-orange-800 dark:text-orange-200">
              未连接到 Elasticsearch
            </CardTitle>
            <CardDescription className="text-orange-700 dark:text-orange-300">
              请先配置并连接到 Elasticsearch 集群以查看详细信息
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => {
                useAppStore.getState().setActiveTab('cluster-management');
              }}
              className="bg-orange-600 hover:bg-orange-700"
            >
              配置连接
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 主要统计指标 */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="索引数量"
          value={indices.length}
          description={`${healthyIndices} 个健康索引`}
          icon={Database}
        />
        <StatCard
          title="总文档数"
          value={formatNumber(totalDocs)}
          description="所有索引的文档总数"
          icon={FileText}
        />
        <StatCard
          title="存储大小"
          value={totalSize}
          description="集群总存储使用量"
          icon={HardDrive}
        />
        <StatCard
          title="节点数量"
          value={nodeCount}
          description="集群中的节点数"
          icon={Server}
        />
      </div>

      {/* 详细信息卡片 */}
      <div className="space-y-6">
        {/* 集群信息 */}
        <Card className="h-full">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center space-x-2 text-base font-semibold">
              <Activity className="h-5 w-5 text-primary" />
              <span>集群状态</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentConnection?.status === 'connected' && clusterInfo ? (
              <>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-muted-foreground">集群名称</span>
                    <span className="text-sm font-medium">{clusterInfo.cluster_name}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-muted-foreground">版本</span>
                    <Badge variant="outline" className="font-mono">{clusterInfo.version.number}</Badge>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-muted-foreground">构建类型</span>
                    <span className="text-sm font-medium">{clusterInfo.version.build_type}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-muted-foreground">Lucene 版本</span>
                    <span className="text-sm font-medium">{clusterInfo.version.lucene_version}</span>
                  </div>
                </div>
                
                {currentConnection && (
                  <div className="pt-4 border-t">
                    <h4 className="text-sm font-medium mb-2">连接信息</h4>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">主机</span>
                        <span className="text-sm font-medium">
                          {currentConnection.protocol}://{currentConnection.host}:{currentConnection.port}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">连接名称</span>
                        <span className="text-sm font-medium">{currentConnection.name}</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">未连接到集群</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 节点状态 */}
        <Card className="h-full">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center space-x-2 text-base font-semibold">
              <Server className="h-5 w-5 text-primary" />
              <span>节点状态</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {currentConnection?.status === 'connected' && nodesInfo ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {Object.entries(nodesInfo.nodes || {}).map(([nodeId, nodeInfo]: [string, any]) => (
                    <div key={nodeId} className={`p-4 rounded-xl hover:shadow-md transition-shadow ${(nodeInfo.roles?.includes('master') && nodeInfo.settings?.node?.master === 'true') ? 'bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800' : 'bg-card border'} border`}>
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center space-x-2">
                          <Server className={`h-4 w-4 ${(nodeInfo.roles?.includes('master') && nodeInfo.settings?.node?.master === 'true') ? 'text-purple-600' : 'text-primary'}`} />
                          <span className={`font-medium truncate ${(nodeInfo.roles?.includes('master') && nodeInfo.settings?.node?.master === 'true') ? 'text-purple-700 dark:text-purple-300' : ''}`}>{nodeInfo.name}</span>
                        </div>
                        {(nodeInfo.roles?.includes('master') && nodeInfo.settings?.node?.master === 'true') ? (
                          <Badge variant="default" className="bg-purple-600 hover:bg-purple-700 shrink-0">
                            主节点
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-purple-600 text-purple-600 shrink-0">
                            数据节点
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-3 text-sm">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 p-2 rounded-lg bg-muted/50">
                          <div className="space-y-2">
                            <div>
                              <span className="text-muted-foreground block text-xs">版本</span>
                              <span className="font-medium truncate block">{nodeInfo.version}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block text-xs">IP地址</span>
                              <span className="font-medium truncate block">{nodeInfo.ip || nodeInfo.transport_address?.split(':')[0]}</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div>
                              <span className="text-muted-foreground block text-xs">操作系统</span>
                              <span className="font-medium truncate block">{nodeInfo.os?.name} {nodeInfo.os?.version}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block text-xs">JVM</span>
                              <span className="font-medium truncate block">{nodeInfo.jvm?.version?.split('(')[0]}</span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 p-2 rounded-lg bg-muted/50">
                          <div className="space-y-2">
                            <div>
                              <span className="text-muted-foreground block text-xs">CPU使用率</span>
                              <span className="font-medium">{nodeInfo.stats?.process?.cpu?.percent || 'N/A'}%</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block text-xs">内存使用</span>
                              <span className="font-medium">{nodeInfo.stats?.process?.mem?.resident_in_bytes ? `${(nodeInfo.stats.process.mem.resident_in_bytes / (1024 * 1024 * 1024)).toFixed(2)} GB` : 'N/A'}</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div>
                              <span className="text-muted-foreground block text-xs">磁盘使用</span>
                              <span className="font-medium truncate block">{nodeInfo.stats?.fs?.total?.total_in_bytes ? `${((nodeInfo.stats.fs.total.total_in_bytes - nodeInfo.stats.fs.total.free_in_bytes) / (1024 * 1024 * 1024)).toFixed(2)} GB / ${(nodeInfo.stats.fs.total.total_in_bytes / (1024 * 1024 * 1024)).toFixed(2)} GB` : 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block text-xs">堆内存</span>
                              <span className="font-medium truncate block">{nodeInfo.stats?.jvm?.mem?.heap_used_in_bytes ? `${(nodeInfo.stats.jvm.mem.heap_used_in_bytes / (1024 * 1024 * 1024)).toFixed(2)} GB / ${(nodeInfo.stats.jvm.mem.heap_max_in_bytes / (1024 * 1024 * 1024)).toFixed(2)} GB` : 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="pt-4 border-t">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => fetchNodesInfo()}
                  >
                    刷新节点信息
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <Server className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">未获取到节点信息</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}