import { useState } from 'react'
import { ChevronDown, Database, Check, Plus, Trash2, TestTube, Edit } from 'lucide-react'
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'

import { ElasticsearchConnection } from '@/stores/elasticsearch-store'

interface Cluster extends Omit<ElasticsearchConnection, 'port' | 'protocol' | 'apiKey' | 'isDefault' | 'createdAt' | 'updatedAt'> {
  status: 'connected' | 'disconnected' | 'error' | 'testing'
  clusterName?: string
  version?: string
  nodeCount?: number
}

interface ClusterSelectorProps {
  currentCluster?: Cluster
  clusters: Cluster[]
  onClusterChange: (connection: ElasticsearchConnection) => Promise<void>
  onTestConnection?: (connection: ElasticsearchConnection) => Promise<{
    success: boolean
    version?: string
    nodeCount?: number
    clusterName?: string
    error?: string
  }>
}

/**
 * 集群选择器组件
 * 用于在顶部显示当前集群并支持切换、新增、删除和测试连接
 */
export function ClusterSelector({ currentCluster, clusters, onClusterChange, onTestConnection }: ClusterSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null)
  const [newCluster, setNewCluster] = useState({
    name: '',
    host: '',
    username: '',
    password: ''
  })
  const [editingCluster, setEditingCluster] = useState<Cluster | null>(null)
  const { toast } = useToast()

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
      case 'testing':
        return 'text-yellow-500'
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
      case 'testing':
        return '测试中...'
      default:
        return '未知状态'
    }
  }

  /**
   * 处理集群切换
   * 如果选择的是当前已连接的集群，则不触发切换
   * 如果选择的是未连接的集群，则显示确认对话框
   */
  const handleClusterSelect = async (cluster: Cluster) => {
    // 如果选择的是当前集群，直接关闭下拉菜单
    if (currentCluster?.id === cluster.id) {
      setIsOpen(false)
      return
    }

    // 如果当前有连接的集群，先确认是否要切换
    if (currentCluster?.status === 'connected') {
      if (!window.confirm(`确定要切换到集群 ${cluster.name} 吗？当前连接将被断开。`)) {
        return
      }
    }

    try {
      // 解析主机地址
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
      await onClusterChange(connectionConfig)
      setIsOpen(false)
    } catch (error) {
      console.error('切换集群失败:', error)
      toast({
        title: '切换失败',
        description: '无法连接到集群，请稍后重试',
        variant: 'destructive'
      })
    }
  }

  /**
   * 解析主机地址、端口和协议
   */
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

  /**
   * 处理添加新集群
   */
  const handleAddCluster = () => {
    if (!newCluster.name || !newCluster.host) {
      toast({
        title: '输入错误',
        description: '请填写集群名称和主机地址',
        variant: 'destructive'
      })
      return
    }

    // 生成唯一ID
    const id = Date.now().toString()

    // 创建新集群对象
    const cluster: Cluster = {
      id,
      name: newCluster.name,
      host: newCluster.host,
      username: newCluster.username || undefined,
      password: newCluster.password || undefined,
      status: 'disconnected'
    }

    // 获取当前集群列表
    const savedClusters = localStorage.getItem('elasticsearch-clusters')
    let updatedClusters = []
    
    if (savedClusters) {
      updatedClusters = [...JSON.parse(savedClusters), cluster]
    } else {
      updatedClusters = [cluster]
    }

    // 保存到本地存储
    localStorage.setItem('elasticsearch-clusters', JSON.stringify(updatedClusters))

    // 重置表单并关闭对话框
    setNewCluster({ name: '', host: '', username: '', password: '' })
    setIsAddDialogOpen(false)
    
    toast({
      title: '集群已添加',
      description: `${cluster.name} 已成功添加到集群列表`
    })

    // 刷新页面以显示新集群
    window.location.reload()
  }

  /**
   * 处理编辑集群
   */
  const handleEditCluster = (cluster: Cluster, e: React.MouseEvent) => {
    e.stopPropagation() // 阻止事件冒泡，避免触发选择集群
    setEditingCluster(cluster)
    setIsEditDialogOpen(true)
  }

  /**
   * 保存编辑的集群
   */
  const handleSaveEditCluster = () => {
    if (!editingCluster) return

    // 获取当前集群列表
    const savedClusters = localStorage.getItem('elasticsearch-clusters')
    if (!savedClusters) return

    // 更新集群信息
    const clusters = JSON.parse(savedClusters)
    const updatedClusters = clusters.map((c: any) => 
      c.id === editingCluster.id ? editingCluster : c
    )

    // 保存到本地存储
    localStorage.setItem('elasticsearch-clusters', JSON.stringify(updatedClusters))
    
    // 重置表单并关闭对话框
    setEditingCluster(null)
    setIsEditDialogOpen(false)
    
    toast({
      title: '集群已更新',
      description: `${editingCluster.name} 的配置已更新`
    })

    // 刷新页面以显示更新后的集群
    window.location.reload()
  }

  /**
   * 处理删除集群
   */
  const handleDeleteClick = (cluster: Cluster, e: React.MouseEvent) => {
    e.stopPropagation() // 阻止事件冒泡，避免触发选择集群
    setSelectedCluster(cluster)
    setIsDeleteDialogOpen(true)
  }

  /**
   * 确认删除集群
   */
  const confirmDeleteCluster = () => {
    if (!selectedCluster) return

    // 获取当前集群列表
    const savedClusters = localStorage.getItem('elasticsearch-clusters')
    if (!savedClusters) return

    // 过滤掉要删除的集群
    const clusters = JSON.parse(savedClusters)
    const updatedClusters = clusters.filter((c: any) => c.id !== selectedCluster.id)

    // 保存到本地存储
    localStorage.setItem('elasticsearch-clusters', JSON.stringify(updatedClusters))
    
    // 如果删除的是当前集群，清除当前集群ID
    if (currentCluster?.id === selectedCluster.id) {
      localStorage.removeItem('current-cluster-id')
    }
    
    // 关闭对话框
    setIsDeleteDialogOpen(false)
    setSelectedCluster(null)
    
    toast({
      title: '集群已删除',
      description: '集群已从列表中移除'
    })

    // 刷新页面以更新集群列表
    window.location.reload()
  }

  /**
   * 测试集群连接
   */
  const handleTestConnection = async (cluster: Cluster, e: React.MouseEvent) => {
    if (!onTestConnection) return
    e.stopPropagation() // 阻止事件冒泡，避免触发选择集群

    // 更新集群状态为测试中
    const savedClusters = localStorage.getItem('elasticsearch-clusters')
    if (savedClusters) {
      const clusters = JSON.parse(savedClusters)
      const updatedClusters = clusters.map((c: any) => 
        c.id === cluster.id ? { ...c, status: 'testing' } : c
      )
      localStorage.setItem('elasticsearch-clusters', JSON.stringify(updatedClusters))
    }

    try {
      // 解析主机地址
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

      // 测试连接
      const result = await onTestConnection(connectionConfig)
      
      // 更新集群状态
      if (savedClusters) {
        const clusters = JSON.parse(savedClusters)
        const updatedClusters = clusters.map((c: any) => {
          if (c.id === cluster.id) {
            return {
              ...c,
              status: result.success ? 'connected' : 'disconnected',
              version: result.success ? result.version : undefined,
              nodeCount: result.success ? result.nodeCount : undefined,
              clusterName: result.success ? result.clusterName : undefined,
              lastConnected: result.success ? new Date() : c.lastConnected
            }
          }
          return c
        })
        localStorage.setItem('elasticsearch-clusters', JSON.stringify(updatedClusters))
      }
      
      toast({
        title: result.success ? '连接成功' : '连接失败',
        description: result.success ? `成功连接到 ${cluster.name}` : result.error,
        variant: result.success ? 'default' : 'destructive'
      })

      // 刷新页面以更新集群状态
      window.location.reload()
    } catch (error) {
      // 更新集群状态为连接失败
      if (savedClusters) {
        const clusters = JSON.parse(savedClusters)
        const updatedClusters = clusters.map((c: any) => 
          c.id === cluster.id ? { ...c, status: 'disconnected' } : c
        )
        localStorage.setItem('elasticsearch-clusters', JSON.stringify(updatedClusters))
      }
      
      toast({
        title: '连接失败',
        description: '无法连接到集群',
        variant: 'destructive'
      })

      // 刷新页面以更新集群状态
      window.location.reload()
    }
  }

  if (!currentCluster && clusters.length === 0) {
    return (
      <div className="flex items-center space-x-2 text-muted-foreground">
        <Database className="h-4 w-4" />
        <span className="text-sm">未配置集群</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4" />
        </Button>

        {/* 添加集群对话框 */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>添加新集群</DialogTitle>
              <DialogDescription>
                添加一个新的 Elasticsearch 集群连接
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cluster-name">集群名称</Label>
                <Input
                  id="cluster-name"
                  placeholder="例如：生产环境"
                  value={newCluster.name}
                  onChange={(e) => setNewCluster({ ...newCluster, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cluster-host">主机地址</Label>
                <Input
                  id="cluster-host"
                  placeholder="localhost:9200 或 192.168.1.100:9200"
                  value={newCluster.host}
                  onChange={(e) => setNewCluster({ ...newCluster, host: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  可以输入主机名或IP地址，支持带端口号（如 localhost:9200）或不带端口号（默认9200）
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cluster-username">用户名（可选）</Label>
                <Input
                  id="cluster-username"
                  placeholder="elastic"
                  value={newCluster.username}
                  onChange={(e) => setNewCluster({ ...newCluster, username: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cluster-password">密码（可选）</Label>
                <Input
                  id="cluster-password"
                  type="password"
                  placeholder="密码"
                  value={newCluster.password}
                  onChange={(e) => setNewCluster({ ...newCluster, password: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>取消</Button>
              <Button onClick={handleAddCluster}>添加</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return (
    <>
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
        <DropdownMenuContent align="start" className="w-80">
          <DropdownMenuLabel className="flex justify-between items-center">
            <span>选择集群</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4" />
            </Button>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {clusters.map((cluster) => (
            <DropdownMenuItem
              key={cluster.id}
              onClick={() => handleClusterSelect(cluster)}
              className="flex flex-col items-start p-3 h-auto space-y-1 w-full"
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-2">
                  <Database className={`h-4 w-4 ${getStatusColor(cluster.status)}`} />
                  <span className="text-sm font-medium">{cluster.name}</span>
                  {currentCluster?.id === cluster.id && (
                    <Check className="h-4 w-4 text-green-600 ml-1" />
                  )}
                </div>
                <Badge 
                  variant={cluster.status === 'connected' ? 'default' : 'destructive'}
                  className="text-xs whitespace-nowrap"
                >
                  {getStatusText(cluster.status)}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between w-full">
                <span className="text-xs text-muted-foreground pl-6">{cluster.host}</span>
                <div className="flex items-center space-x-0.5">
                  {/* 测试连接按钮 */}
                  {onTestConnection && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-5 w-5" 
                      onClick={(e) => handleTestConnection(cluster, e)}
                      disabled={cluster.status === 'testing'}
                    >
                      <TestTube className="h-3 w-3" />
                    </Button>
                  )}
                  
                  {/* 编辑按钮 */}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-5 w-5" 
                    onClick={(e) => handleEditCluster(cluster, e)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  
                  {/* 删除按钮 */}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-5 w-5" 
                    onClick={(e) => handleDeleteClick(cluster, e)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              
              {cluster.clusterName && (
                <span className="text-xs text-muted-foreground pl-6">
                  {cluster.clusterName}
                </span>
              )}
            </DropdownMenuItem>
          ))}
          {clusters.length === 0 && (
            <DropdownMenuItem disabled>
              <span className="text-sm text-muted-foreground">暂无可用集群</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 添加集群对话框 */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加新集群</DialogTitle>
            <DialogDescription>
              添加一个新的 Elasticsearch 集群连接
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cluster-name">集群名称</Label>
              <Input
                id="cluster-name"
                placeholder="例如：生产环境"
                value={newCluster.name}
                onChange={(e) => setNewCluster({ ...newCluster, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cluster-host">主机地址</Label>
              <Input
                id="cluster-host"
                placeholder="localhost:9200 或 192.168.1.100:9200"
                value={newCluster.host}
                onChange={(e) => setNewCluster({ ...newCluster, host: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                可以输入主机名或IP地址，支持带端口号（如 localhost:9200）或不带端口号（默认9200）
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cluster-username">用户名（可选）</Label>
              <Input
                id="cluster-username"
                placeholder="elastic"
                value={newCluster.username}
                onChange={(e) => setNewCluster({ ...newCluster, username: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cluster-password">密码（可选）</Label>
              <Input
                id="cluster-password"
                type="password"
                placeholder="密码"
                value={newCluster.password}
                onChange={(e) => setNewCluster({ ...newCluster, password: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>取消</Button>
            <Button onClick={handleAddCluster}>添加</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑集群对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑集群</DialogTitle>
            <DialogDescription>
              修改 Elasticsearch 集群连接配置
            </DialogDescription>
          </DialogHeader>
          {editingCluster && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-cluster-name">集群名称</Label>
                <Input
                  id="edit-cluster-name"
                  value={editingCluster.name}
                  onChange={(e) => setEditingCluster({ ...editingCluster, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-cluster-host">主机地址</Label>
                <Input
                  id="edit-cluster-host"
                  value={editingCluster.host}
                  onChange={(e) => setEditingCluster({ ...editingCluster, host: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-cluster-username">用户名（可选）</Label>
                <Input
                  id="edit-cluster-username"
                  value={editingCluster.username || ''}
                  onChange={(e) => setEditingCluster({ ...editingCluster, username: e.target.value || undefined })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-cluster-password">密码（可选）</Label>
                <Input
                  id="edit-cluster-password"
                  type="password"
                  placeholder="保持不变或输入新密码"
                  value={editingCluster.password || ''}
                  onChange={(e) => setEditingCluster({ ...editingCluster, password: e.target.value || undefined })}
                />
                <p className="text-xs text-muted-foreground">
                  如果不需要修改密码，请留空
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>取消</Button>
            <Button onClick={handleSaveEditCluster}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除集群确认对话框 */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除集群 {selectedCluster?.name} 吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteCluster}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}