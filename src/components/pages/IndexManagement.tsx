import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Database, Plus, Trash2, RefreshCw, Settings, MoreHorizontal, Search } from 'lucide-react'
import { useElasticsearchStore } from '@/stores/elasticsearch-store'

/**
 * 索引管理页面组件
 * 提供 Elasticsearch 索引的创建、删除、查看等管理功能
 */
export function IndexManagement() {
  const [newIndexName, setNewIndexName] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  
  const { indices, isLoading, createIndex, deleteIndex, refreshIndices } = useElasticsearchStore()

  /**
   * 创建新索引
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
              {isCreating ? '创建中...' : '创建索引'}
            </Button>
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
                            <DropdownMenuItem>
                              <Settings className="mr-2 h-4 w-4" />
                              查看设置
                            </DropdownMenuItem>
                            <DropdownMenuItem>
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
    </div>
  )
}