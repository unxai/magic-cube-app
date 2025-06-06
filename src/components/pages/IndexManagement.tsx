import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Database, Plus, Trash2, RefreshCw, Settings, MoreHorizontal, Search, ChevronDown, ChevronRight } from 'lucide-react'
import { useElasticsearchStore } from '@/stores/elasticsearch-store'

/**
 * 索引管理页面组件
 * 提供 Elasticsearch 索引的创建、删除、查看等管理功能
 */
export function IndexManagement() {
  const [newIndexName, setNewIndexName] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState<string | null>(null)
  const [indexSettings, setIndexSettings] = useState<any>(null)
  const [indexMapping, setIndexMapping] = useState<any>(null)
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false)
  const [isMappingDialogOpen, setIsMappingDialogOpen] = useState(false)
  const [isLoadingSettings, setIsLoadingSettings] = useState(false)
  const [isLoadingMapping, setIsLoadingMapping] = useState(false)
  
  // 创建索引高级设置
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [numberOfShards, setNumberOfShards] = useState('1')
  const [numberOfReplicas, setNumberOfReplicas] = useState('0')
  const [customSettings, setCustomSettings] = useState('')
  const [customMapping, setCustomMapping] = useState('')
  const [isAdvancedSettingsOpen, setIsAdvancedSettingsOpen] = useState(false)
  
  const { indices, isLoading, createIndex, deleteIndex, refreshIndices, getIndexSettings, getIndexMapping } = useElasticsearchStore()

  /**
   * 创建新索引（简单模式）
   */
  const handleCreateIndex = async () => {
    if (!newIndexName.trim()) {
      return
    }

    setIsCreating(true)
    try {
      await createIndex(newIndexName.trim())
      setNewIndexName('')
    } catch (error) {
      console.error('Failed to create index:', error)
    } finally {
      setIsCreating(false)
    }
  }

  /**
   * 创建新索引（高级模式）
   */
  const handleCreateIndexAdvanced = async () => {
    if (!newIndexName.trim()) {
      return
    }

    setIsCreating(true)
    try {
      // 构建索引设置
      const settings: any = {
        settings: {
          number_of_shards: parseInt(numberOfShards) || 1,
          number_of_replicas: parseInt(numberOfReplicas) || 0
        }
      }

      // 添加自定义设置
      if (customSettings.trim()) {
        try {
          const parsedSettings = JSON.parse(customSettings)
          settings.settings = { ...settings.settings, ...parsedSettings }
        } catch (error) {
          throw new Error('自定义设置 JSON 格式错误')
        }
      }

      // 添加自定义映射
      if (customMapping.trim()) {
        try {
          const parsedMapping = JSON.parse(customMapping)
          settings.mappings = parsedMapping
        } catch (error) {
          throw new Error('自定义映射 JSON 格式错误')
        }
      }

      await createIndex(newIndexName.trim(), settings)
      
      // 重置表单
      setNewIndexName('')
      setNumberOfShards('1')
      setNumberOfReplicas('0')
      setCustomSettings('')
      setCustomMapping('')
      setIsCreateDialogOpen(false)
      setIsAdvancedSettingsOpen(false)
    } catch (error) {
      console.error('Failed to create index:', error)
      alert(error instanceof Error ? error.message : '创建索引失败')
    } finally {
      setIsCreating(false)
    }
  }

  /**
   * 删除索引
   */
  const handleDeleteIndex = async (indexName: string) => {
    try {
      await deleteIndex(indexName)
    } catch (error) {
      console.error('Failed to delete index:', error)
    }
  }

  /**
   * 刷新索引列表
   */
  const handleRefresh = () => {
    refreshIndices()
  }

  /**
   * 查看索引设置
   */
  const handleViewSettings = async (indexName: string) => {
    setSelectedIndex(indexName)
    setIsLoadingSettings(true)
    setIsSettingsDialogOpen(true)
    
    try {
      const settings = await getIndexSettings(indexName)
      setIndexSettings(settings)
    } catch (error) {
      console.error('获取索引设置失败:', error)
      setIndexSettings({ error: '获取设置失败: ' + (error instanceof Error ? error.message : '未知错误') })
    } finally {
      setIsLoadingSettings(false)
    }
  }

  /**
   * 查看索引映射
   */
  const handleViewMapping = async (indexName: string) => {
    setSelectedIndex(indexName)
    setIsLoadingMapping(true)
    setIsMappingDialogOpen(true)
    
    try {
      const mapping = await getIndexMapping(indexName)
      setIndexMapping(mapping)
    } catch (error) {
      console.error('获取索引映射失败:', error)
      setIndexMapping({ error: '获取映射失败: ' + (error instanceof Error ? error.message : '未知错误') })
    } finally {
      setIsLoadingMapping(false)
    }
  }

  /**
   * 过滤索引列表
   */
  const filteredIndices = indices.filter(index =>
    index.index.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // formatSize 函数已移除，因为 storeSize 已经是格式化后的字符串

  /**
   * 获取索引状态颜色
   */
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'green':
        return 'bg-green-500'
      case 'yellow':
        return 'bg-yellow-500'
      case 'red':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <div className="h-full p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">索引管理</h1>
          <p className="text-muted-foreground">
            管理 Elasticsearch 索引和数据
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
      </div>

      {/* 创建索引卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Plus className="h-5 w-5 mr-2" />
            创建新索引
          </CardTitle>
          <CardDescription>
            创建一个新的 Elasticsearch 索引
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <div className="flex-1">
              <Label htmlFor="index-name" className="sr-only">
                索引名称
              </Label>
              <Input
                id="index-name"
                placeholder="输入索引名称..."
                value={newIndexName}
                onChange={(e) => setNewIndexName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateIndex()}
              />
            </div>
            <Button 
              onClick={handleCreateIndex}
              disabled={!newIndexName.trim() || isCreating}
            >
              {isCreating ? '创建中...' : '快速创建'}
            </Button>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" disabled={isCreating}>
                  <Settings className="h-4 w-4 mr-2" />
                  高级设置
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh]">
                <DialogHeader>
                  <DialogTitle>创建索引 - 高级设置</DialogTitle>
                  <DialogDescription>
                    配置索引的详细设置，包括分片数、副本数、映射等
                  </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[70vh] pr-4">
                  <div className="space-y-6">
                    {/* 基本设置 */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">基本设置</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="advanced-index-name">索引名称 *</Label>
                          <Input
                            id="advanced-index-name"
                            placeholder="输入索引名称..."
                            value={newIndexName}
                            onChange={(e) => setNewIndexName(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="shards">分片数</Label>
                          <Input
                            id="shards"
                            type="number"
                            min="1"
                            max="1000"
                            value={numberOfShards}
                            onChange={(e) => setNumberOfShards(e.target.value)}
                            placeholder="1"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="replicas">副本数</Label>
                          <Input
                            id="replicas"
                            type="number"
                            min="0"
                            max="10"
                            value={numberOfReplicas}
                            onChange={(e) => setNumberOfReplicas(e.target.value)}
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 高级设置 */}
                    <Collapsible open={isAdvancedSettingsOpen} onOpenChange={setIsAdvancedSettingsOpen}>
                      <CollapsibleTrigger className="flex items-center space-x-2 text-lg font-semibold hover:text-primary">
                        {isAdvancedSettingsOpen ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <span>高级配置</span>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-4 mt-4">
                        <Tabs defaultValue="settings" className="w-full">
                          <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="settings">自定义设置</TabsTrigger>
                            <TabsTrigger value="mappings">字段映射</TabsTrigger>
                          </TabsList>
                          <TabsContent value="settings" className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="custom-settings">自定义设置 (JSON)</Label>
                              <Textarea
                                id="custom-settings"
                                placeholder={`{
  "analysis": {
    "analyzer": {
      "my_analyzer": {
        "type": "standard"
      }
    }
  }
}`}
                                value={customSettings}
                                onChange={(e) => setCustomSettings(e.target.value)}
                                className="min-h-[200px] font-mono text-sm"
                              />
                              <p className="text-sm text-muted-foreground">
                                输入有效的 JSON 格式的索引设置。这些设置将与基本设置合并。
                              </p>
                            </div>
                          </TabsContent>
                          <TabsContent value="mappings" className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="custom-mapping">字段映射 (JSON)</Label>
                              <Textarea
                                id="custom-mapping"
                                placeholder={`{
  "properties": {
    "title": {
      "type": "text",
      "analyzer": "standard"
    },
    "created_at": {
      "type": "date"
    }
  }
}`}
                                value={customMapping}
                                onChange={(e) => setCustomMapping(e.target.value)}
                                className="min-h-[200px] font-mono text-sm"
                              />
                              <p className="text-sm text-muted-foreground">
                                定义索引的字段映射结构。留空将使用动态映射。
                              </p>
                            </div>
                          </TabsContent>
                        </Tabs>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                </ScrollArea>
                <div className="flex justify-end space-x-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                    disabled={isCreating}
                  >
                    取消
                  </Button>
                  <Button
                    onClick={handleCreateIndexAdvanced}
                    disabled={!newIndexName.trim() || isCreating}
                  >
                    {isCreating ? '创建中...' : '创建索引'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* 索引列表 */}
      <Card className="flex-1">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Database className="h-5 w-5 mr-2" />
                索引列表
              </CardTitle>
              <CardDescription>
                当前 Elasticsearch 集群中的所有索引
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索索引..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
              <Badge variant="secondary">
                {filteredIndices.length} 个索引
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {filteredIndices.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                {searchTerm ? '未找到匹配的索引' : '暂无索引'}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>索引名称</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>文档数量</TableHead>
                    <TableHead>存储大小</TableHead>
                    <TableHead>分片数</TableHead>
                    <TableHead>副本数</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredIndices.map((index) => (
                    <TableRow key={index.index}>
                      <TableCell className="font-medium">
                        {index.index}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(index.health)}`} />
                          <span className="capitalize">{index.health}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {index.docsCount?.toLocaleString() || '0'}
                      </TableCell>
                      <TableCell>
                        {index.storeSize || '0'}
                      </TableCell>
                      <TableCell>{index.pri || 1}</TableCell>
                      <TableCell>{index.rep || 0}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">打开菜单</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>操作</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleViewSettings(index.index)}>
                              <Settings className="mr-2 h-4 w-4" />
                              查看设置
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleViewMapping(index.index)}>
                              <Search className="mr-2 h-4 w-4" />
                              查看映射
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onSelect={(e) => e.preventDefault()}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  删除索引
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>确认删除索引</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    您确定要删除索引 "{index.index}" 吗？此操作不可撤销，所有数据将被永久删除。
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>取消</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteIndex(index.index)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    删除
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* 索引设置对话框 */}
      <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>索引设置 - {selectedIndex}</DialogTitle>
            <DialogDescription>
              查看索引的详细配置设置
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh] w-full">
            {isLoadingSettings ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-muted-foreground">加载中...</div>
              </div>
            ) : indexSettings?.error ? (
              <div className="text-red-600 p-4 bg-red-50 rounded-md">
                {indexSettings.error}
              </div>
            ) : (
              <pre className="text-sm bg-muted p-4 rounded-md overflow-auto">
                {JSON.stringify(indexSettings, null, 2)}
              </pre>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* 索引映射对话框 */}
      <Dialog open={isMappingDialogOpen} onOpenChange={setIsMappingDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>索引映射 - {selectedIndex}</DialogTitle>
            <DialogDescription>
              查看索引的字段映射配置
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh] w-full">
            {isLoadingMapping ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-muted-foreground">加载中...</div>
              </div>
            ) : indexMapping?.error ? (
              <div className="text-red-600 p-4 bg-red-50 rounded-md">
                {indexMapping.error}
              </div>
            ) : (
              <pre className="text-sm bg-muted p-4 rounded-md overflow-auto">
                {JSON.stringify(indexMapping, null, 2)}
              </pre>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}