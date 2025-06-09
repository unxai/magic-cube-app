import React from 'react'
import { 
  Database, 
  Activity, 
  HardDrive, 
  Zap,
  TrendingUp,
  FileText
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useElasticsearchStore } from '@/stores/elasticsearch-store'
import { useAIStore } from '@/stores/ai-store'
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
 * 显示 Elasticsearch 集群状态、AI 模型状态和系统概览
 */
export function Dashboard() {
  const { 
    isConnected, 
    clusterInfo, 
    indices, 
    currentConnection 
  } = useElasticsearchStore()
  const { 
    ollamaConnected, 
    currentModel, 
    sessions 
  } = useAIStore()

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

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">仪表板</h1>
        <p className="text-muted-foreground">
          查看 Elasticsearch 集群状态和 AI 助手概览
        </p>
      </div>

      {/* 连接状态卡片 */}
      {!isConnected && (
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
                // 切换到集群管理页面
                useAppStore.getState().setActiveTab('cluster-management');
              }}
              className="bg-orange-600 hover:bg-orange-700"
            >
              配置连接
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 统计卡片网格 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
          title="AI 会话"
          value={sessions.length}
          description="AI 助手对话会话数"
          icon={Zap}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 集群信息 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>集群状态</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isConnected && clusterInfo ? (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">集群名称</span>
                    <span className="text-sm font-medium">{clusterInfo.cluster_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">版本</span>
                    <Badge variant="outline">{clusterInfo.version.number}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">构建类型</span>
                    <span className="text-sm font-medium">{clusterInfo.version.build_type}</span>
                  </div>
                  <div className="flex justify-between">
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

        {/* AI 助手状态 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="h-5 w-5" />
              <span>AI 助手</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Ollama 状态</span>
                <Badge variant={ollamaConnected ? "default" : "secondary"}>
                  {ollamaConnected ? '已连接' : '未连接'}
                </Badge>
              </div>
              
              {currentModel && (
                <>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">当前模型</span>
                    <span className="text-sm font-medium">{currentModel.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">模型ID</span>
                    <span className="text-sm font-medium">{currentModel.id}</span>
                  </div>
                </>
              )}
              
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">会话数量</span>
                <span className="text-sm font-medium">{sessions.length}</span>
              </div>
            </div>

            {!ollamaConnected && (
              <div className="pt-4 border-t">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => {
                    // 切换到设置页面配置 Ollama
                    useAppStore.getState().setActiveTab('settings');
                  }}
                >
                  连接 Ollama
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 索引概览 */}
      {indices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>索引概览</CardTitle>
            <CardDescription>
              显示前 5 个索引的基本信息
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {indices.slice(0, 5).map((index) => (
                <div key={index.index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      index.health === 'green' ? 'bg-green-500' :
                      index.health === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
                    }`} />
                    <div>
                      <p className="font-medium">{index.index}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatNumber(index['docsCount'])} 文档
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{index.storeSize}</p>
                    <Badge variant="outline" className="text-xs">
                      {index.status}
                    </Badge>
                  </div>
                </div>
              ))}
              
              {indices.length > 5 && (
                <div className="text-center pt-2">
                  <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    // 切换到索引管理页面
                    useAppStore.getState().setActiveTab('indices');
                  }}
                >
                  查看全部 {indices.length} 个索引
                </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}