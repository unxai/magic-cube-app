import { useState } from 'react'
import { ChevronDown, Database, Check } from 'lucide-react'
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

interface Cluster {
  id: string
  name: string
  host: string
  username?: string
  status: 'connected' | 'disconnected' | 'error'
  clusterName?: string
}

interface ClusterSelectorProps {
  currentCluster?: Cluster
  clusters: Cluster[]
  onClusterChange: (cluster: Cluster) => void
}

/**
 * 集群选择器组件
 * 用于在顶部显示当前集群并支持切换
 */
export function ClusterSelector({ currentCluster, clusters, onClusterChange }: ClusterSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  /**
   * 获取状态颜色
   */
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'text-green-600'
      case 'disconnected':
        return 'text-gray-500'
      case 'error':
        return 'text-red-600'
      default:
        return 'text-gray-500'
    }
  }

  /**
   * 获取状态文本
   */
  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected':
        return '已连接'
      case 'disconnected':
        return '未连接'
      case 'error':
        return '连接错误'
      default:
        return '未知状态'
    }
  }

  /**
   * 处理集群切换
   */
  const handleClusterSelect = (cluster: Cluster) => {
    onClusterChange(cluster)
    setIsOpen(false)
  }

  if (!currentCluster && clusters.length === 0) {
    return (
      <div className="flex items-center space-x-2 text-muted-foreground">
        <Database className="h-4 w-4" />
        <span className="text-sm">未配置集群</span>
      </div>
    )
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-auto p-2 justify-start">
          <div className="flex items-center space-x-2">
            <Database className="h-4 w-4" />
            <div className="flex flex-col items-start">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">
                  {currentCluster?.name || '选择集群'}
                </span>
                {currentCluster && (
                  <Badge 
                    variant={currentCluster.status === 'connected' ? 'default' : 'destructive'}
                    className="text-xs px-2 py-0.5 whitespace-nowrap"
                  >
                    {getStatusText(currentCluster.status)}
                  </Badge>
                )}
              </div>
              {currentCluster?.clusterName && (
                <span className="text-xs text-muted-foreground">
                  {currentCluster.clusterName}
                </span>
              )}
            </div>
            <ChevronDown className="h-3 w-3 ml-1" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>选择集群</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {clusters.map((cluster) => (
          <DropdownMenuItem
            key={cluster.id}
            onClick={() => handleClusterSelect(cluster)}
            className="flex items-center justify-between p-3"
          >
            <div className="flex items-center space-x-3">
              <Database className={`h-4 w-4 ${getStatusColor(cluster.status)}`} />
              <div className="flex flex-col">
                <span className="text-sm font-medium">{cluster.name}</span>
                <span className="text-xs text-muted-foreground">{cluster.host}</span>
                {cluster.clusterName && (
                  <span className="text-xs text-muted-foreground">
                    {cluster.clusterName}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge 
                variant={cluster.status === 'connected' ? 'default' : 'destructive'}
                className="text-xs whitespace-nowrap"
              >
                {getStatusText(cluster.status)}
              </Badge>
              {currentCluster?.id === cluster.id && (
                <Check className="h-4 w-4 text-green-600" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
        {clusters.length === 0 && (
          <DropdownMenuItem disabled>
            <span className="text-sm text-muted-foreground">暂无可用集群</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}