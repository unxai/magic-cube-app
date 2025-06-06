import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Database, Plus, Edit, Trash2, TestTube, CheckCircle, XCircle, Clock } from 'lucide-react'
import { useElasticsearchStore } from '@/stores/elasticsearch-store'
import { useToast } from '@/hooks/use-toast'

/**
 * 集群信息接口
 */
interface ClusterInfo {
  id: string
  name: string
  host: string
  username?: string
  password?: string
  status: 'connected' | 'disconnected' | 'testing'
  version?: string
  nodeCount?: number
  lastConnected?: Date
}

/**
 * 集群管理页面组件
 * 支持多个 Elasticsearch 集群的管理和切换
 */
export function ClusterManagement() {
  const [clusters, setClusters] = useState<ClusterInfo[]>([])
  const [currentCluster, setCurrentCluster] = useState<string | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingCluster, setEditingCluster] = useState<ClusterInfo | null>(null)
  const [newCluster, setNewCluster] = useState({
    name: '',
    host: '',
    username: '',
    password: ''
  })
  
  const { testConnection, addConnection, connect, setCurrentConnection } = useElasticsearchStore()
  const { toast } = useToast()

  /**
   * 加载集群列表
   */
  useEffect(() => {
    loadClusters()
  }, [])

  /**
   * 从本地存储加载集群列表
   */
  const loadClusters = () => {
    const savedClusters = localStorage.getItem('elasticsearch-clusters')
    if (savedClusters) {
      const parsedClusters = JSON.parse(savedClusters)
      setClusters(parsedClusters)
    }
    
    const currentClusterId = localStorage.getItem('current-cluster-id')
    if (currentClusterId) {
      setCurrentCluster(currentClusterId)
    }
  }

  /**
   * 保存集群列表到本地存储
   */
  const saveClusters = (updatedClusters: ClusterInfo[]) => {
    localStorage.setItem('elasticsearch-clusters', JSON.stringify(updatedClusters))
    setClusters(updatedClusters)
  }

  /**
   * 解析主机地址、端口和协议
   * @param hostInput 用户输入的主机地址，可能包含协议和端口号
   * @returns 解析后的主机名、端口号和协议
   */
  const parseHostAndPort = (hostInput: string): { host: string; port: number; protocol: 'http' | 'https' } => {
    // 检测协议
    let protocol: 'http' | 'https' = 'http'
    let cleanInput = hostInput
    
    if (hostInput.startsWith('https://')) {
      protocol = 'https'
      cleanInput = hostInput.replace(/^https:\/\//, '')
    } else if (hostInput.startsWith('http://')) {
      protocol = 'http'
      cleanInput = hostInput.replace(/^http:\/\//, '')
    }
    
    // 检查是否包含端口号
    const portMatch = cleanInput.match(/^(.+):(\d+)$/)
    if (portMatch) {
      return {
        host: portMatch[1],
        port: parseInt(portMatch[2], 10),
        protocol
      }
    }
    
    // 如果没有端口号，根据协议使用默认端口
    return {
      host: cleanInput,
      port: protocol === 'https' ? 9243 : 9200,
      protocol
    }
  }

  /**
   * 测试集群连接
   */
  const handleTestConnection = async (cluster: ClusterInfo) => {
    const updatedClusters = clusters.map(c => 
      c.id === cluster.id ? { ...c, status: 'testing' as const } : c
    )
    setClusters(updatedClusters)

    try {
      const { host, port, protocol } = parseHostAndPort(cluster.host)
      
      const result = await testConnection({
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
      })
      
      const finalClusters = clusters.map(c => {
        if (c.id === cluster.id) {
          return {
            ...c,
            status: result.success ? 'connected' as const : 'disconnected' as const,
            version: result.success ? result.version : undefined,
            nodeCount: result.success ? result.nodeCount : undefined,
            lastConnected: result.success ? new Date() : c.lastConnected
          }
        }
        return c
      })
      
      saveClusters(finalClusters)
      
      toast({
        title: result.success ? '连接成功' : '连接失败',
        description: result.success ? `成功连接到 ${cluster.name}` : result.error,
        variant: result.success ? 'default' : 'destructive'
      })
    } catch (error) {
      const finalClusters = clusters.map(c => 
        c.id === cluster.id ? { ...c, status: 'disconnected' as const } : c
      )
      saveClusters(finalClusters)
      
      toast({
        title: '连接失败',
        description: '无法连接到集群',
        variant: 'destructive'
      })
    }
  }

  /**
   * 添加新集群
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

    const cluster: ClusterInfo = {
      id: Date.now().toString(),
      name: newCluster.name,
      host: newCluster.host,
      username: newCluster.username || undefined,
      password: newCluster.password || undefined,
      status: 'disconnected'
    }

    const updatedClusters = [...clusters, cluster]
    saveClusters(updatedClusters)
    
    setNewCluster({ name: '', host: '', username: '', password: '' })
    setIsAddDialogOpen(false)
    
    toast({
      title: '集群已添加',
      description: `${cluster.name} 已成功添加到集群列表`
    })
  }

  /**
   * 编辑集群
   */
  const handleEditCluster = (cluster: ClusterInfo) => {
    setEditingCluster(cluster)
    setIsEditDialogOpen(true)
  }

  /**
   * 保存编辑的集群
   */
  const handleSaveEditCluster = () => {
    if (!editingCluster) return

    const updatedClusters = clusters.map(c => 
      c.id === editingCluster.id ? editingCluster : c
    )
    saveClusters(updatedClusters)
    
    setEditingCluster(null)
    setIsEditDialogOpen(false)
    
    toast({
      title: '集群已更新',
      description: `${editingCluster.name} 的配置已更新`
    })
  }

  /**
   * 删除集群
   */
  const handleDeleteCluster = (clusterId: string) => {
    const updatedClusters = clusters.filter(c => c.id !== clusterId)
    saveClusters(updatedClusters)
    
    if (currentCluster === clusterId) {
      setCurrentCluster(null)
      localStorage.removeItem('current-cluster-id')
    }
    
    toast({
      title: '集群已删除',
      description: '集群已从列表中移除'
    })
  }

  /**
   * 切换当前集群
   */
  const handleSwitchCluster = async (clusterId: string) => {
    const cluster = clusters.find(c => c.id === clusterId)
    if (!cluster) return

    try {
      setCurrentCluster(clusterId)
      localStorage.setItem('current-cluster-id', clusterId)
      
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
      
      // 保存连接配置到 Elasticsearch Store
      addConnection(connectionConfig)
      
      // 设置为当前连接并连接到集群
      setCurrentConnection(connectionConfig)
      await connect(connectionConfig)
      
      // 更新本地集群状态
      const updatedClusters = clusters.map(c => 
        c.id === clusterId ? { ...c, status: 'connected' as const, lastConnected: new Date() } : c
      )
      saveClusters(updatedClusters)
      
      toast({
        title: '集群已切换',
        description: `当前集群已切换到 ${cluster.name} 并成功连接`
      })
    } catch (error) {
      // 连接失败时更新状态
      const updatedClusters = clusters.map(c => 
        c.id === clusterId ? { ...c, status: 'disconnected' as const } : c
      )
      saveClusters(updatedClusters)
      
      toast({
        title: '切换失败',
        description: `无法连接到集群 ${cluster.name}`,
        variant: 'destructive'
      })
    }
  }

  /**
   * 获取状态图标
   */
  const getStatusIcon = (status: ClusterInfo['status']) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'disconnected':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'testing':
        return <Clock className="h-4 w-4 text-yellow-500 animate-spin" />
      default:
        return <XCircle className="h-4 w-4 text-gray-400" />
    }
  }

  /**
   * 获取状态文本
   */
  const getStatusText = (status: ClusterInfo['status']) => {
    switch (status) {
      case 'connected':
        return '已连接'
      case 'disconnected':
        return '未连接'
      case 'testing':
        return '测试中...'
      default:
        return '未知'
    }
  }

  return (
    <div className="h-full p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">集群管理</h1>
          <p className="text-muted-foreground">
            管理和切换 Elasticsearch 集群连接
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              添加集群
            </Button>
          </DialogTrigger>
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
                  placeholder="••••••••"
                  value={newCluster.password}
                  onChange={(e) => setNewCluster({ ...newCluster, password: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleAddCluster}>
                添加集群
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* 集群列表 */}
      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="space-y-4">
          {clusters.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Database className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">暂无集群</h3>
                <p className="text-muted-foreground text-center mb-4">
                  还没有添加任何 Elasticsearch 集群。
                  <br />
                  点击上方的"添加集群"按钮开始。
                </p>
              </CardContent>
            </Card>
          ) : (
            clusters.map((cluster) => (
              <Card key={cluster.id} className={currentCluster === cluster.id ? 'ring-2 ring-primary' : ''}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Database className="h-5 w-5" />
                      <div>
                        <CardTitle className="flex items-center space-x-2">
                          <span>{cluster.name}</span>
                          {currentCluster === cluster.id && (
                            <Badge variant="default">当前</Badge>
                          )}
                        </CardTitle>
                        <CardDescription>{cluster.host}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(cluster.status)}
                      <span className="text-sm text-muted-foreground">
                        {getStatusText(cluster.status)}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      {cluster.version && (
                        <p className="text-sm text-muted-foreground">
                          版本: {cluster.version}
                        </p>
                      )}
                      {cluster.nodeCount && (
                        <p className="text-sm text-muted-foreground">
                          节点数: {cluster.nodeCount}
                        </p>
                      )}
                      {cluster.lastConnected && (
                        <p className="text-sm text-muted-foreground">
                          最后连接: {cluster.lastConnected.toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestConnection(cluster)}
                        disabled={cluster.status === 'testing'}
                      >
                        <TestTube className="h-4 w-4 mr-2" />
                        测试连接
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditCluster(cluster)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        编辑
                      </Button>
                      {currentCluster !== cluster.id && (
                        <Button
                          size="sm"
                          onClick={() => handleSwitchCluster(cluster.id)}
                        >
                          切换到此集群
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>确认删除</AlertDialogTitle>
                            <AlertDialogDescription>
                              确定要删除集群 "{cluster.name}" 吗？此操作无法撤销。
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>取消</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteCluster(cluster.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              删除
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      {/* 编辑集群对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑集群</DialogTitle>
            <DialogDescription>
              修改集群连接信息
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
                  placeholder="localhost:9200 或 192.168.1.100:9200"
                  value={editingCluster.host}
                  onChange={(e) => setEditingCluster({ ...editingCluster, host: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  可以输入主机名或IP地址，支持带端口号（如 localhost:9200）或不带端口号（默认9200）
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-cluster-username">用户名（可选）</Label>
                <Input
                  id="edit-cluster-username"
                  value={editingCluster.username || ''}
                  onChange={(e) => setEditingCluster({ ...editingCluster, username: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-cluster-password">密码（可选）</Label>
                <Input
                  id="edit-cluster-password"
                  type="password"
                  value={editingCluster.password || ''}
                  onChange={(e) => setEditingCluster({ ...editingCluster, password: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSaveEditCluster}>
              保存更改
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}