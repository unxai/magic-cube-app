import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Textarea } from '@/components/ui/textarea'
import { History, Search, Play, Save, Trash2, MoreHorizontal, Clock, Database, Filter } from 'lucide-react'
import { useElasticsearchStore } from '@/stores/elasticsearch-store'

interface QueryHistoryItem {
  id: string
  query: string
  index: string
  timestamp: Date
  duration: number
  resultCount: number
  status: 'success' | 'error'
  errorMessage?: string
}

/**
 * 查询历史页面组件
 * 显示和管理 Elasticsearch 查询历史记录
 */
export function QueryHistory() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedQuery, setSelectedQuery] = useState<QueryHistoryItem | null>(null)
  const [filterStatus, setFilterStatus] = useState<'all' | 'success' | 'error'>('all')
  
  // 查询历史数据（从本地存储加载）
  const [queryHistory, setQueryHistory] = useState<QueryHistoryItem[]>([])
  
  // 示例查询数据（作为参考）
  const exampleQueries: QueryHistoryItem[] = [
    {
      id: 'example-1',
      query: '{"query":{"match":{"title":"elasticsearch"}}}',
      index: '示例索引',
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      duration: 125,
      resultCount: 42,
      status: 'success'
    },
    {
      id: 'example-2',
      query: '{"query":{"range":{"@timestamp":{"gte":"now-1d"}}}}',
      index: '示例索引',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
      duration: 89,
      resultCount: 156,
      status: 'success'
    }
  ]

  // 从本地存储加载查询历史
  useEffect(() => {
    const savedHistory = localStorage.getItem('elasticsearch-query-history')
    if (savedHistory) {
      try {
        const parsedHistory = JSON.parse(savedHistory)
        setQueryHistory(parsedHistory)
      } catch (error) {
        console.error('Failed to load query history:', error)
      }
    }
  }, [])
  
  const { executeQuery } = useElasticsearchStore()

  /**
   * 重新执行查询
   */
  const handleRerunQuery = async (item: QueryHistoryItem) => {
    try {
      const queryObj = JSON.parse(item.query)
      await executeQuery(item.index, queryObj)
    } catch (error) {
      console.error('Failed to rerun query:', error)
    }
  }

  /**
   * 删除查询记录
   */
  const handleDeleteQuery = (id: string) => {
    // 这里应该调用实际的删除逻辑
    console.log('Delete query:', id)
  }

  /**
   * 保存查询为模板
   */
  const handleSaveAsTemplate = (item: QueryHistoryItem) => {
    // 这里应该调用保存模板的逻辑
    console.log('Save as template:', item)
  }

  /**
   * 过滤查询历史
   */
  const filteredHistory = (() => {
    // 合并真实历史和示例数据
    const allHistory = [...queryHistory]
    
    // 如果没有真实历史数据，显示示例数据
    if (queryHistory.length === 0) {
      allHistory.push(...exampleQueries)
    }
    
    return allHistory.filter(item => {
      const matchesSearch = item.query.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.index.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = filterStatus === 'all' || item.status === filterStatus
      return matchesSearch && matchesStatus
    })
  })()

  /**
   * 格式化时间
   */
  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days > 0) {
      return `${days}天前`
    } else if (hours > 0) {
      return `${hours}小时前`
    } else if (minutes > 0) {
      return `${minutes}分钟前`
    } else {
      return '刚刚'
    }
  }

  /**
   * 格式化查询字符串
   */
  const formatQuery = (query: string, maxLength: number = 100) => {
    if (query.length <= maxLength) {
      return query
    }
    return query.substring(0, maxLength) + '...'
  }

  return (
    <div className="h-full p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">查询历史</h1>
          <p className="text-muted-foreground">
            查看和管理您的 Elasticsearch 查询历史记录
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary">
            {filteredHistory.length} 条记录
          </Badge>
        </div>
      </div>

      {/* 搜索和过滤 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            搜索和过滤
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索查询或索引名称..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant={filterStatus === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('all')}
              >
                全部
              </Button>
              <Button
                variant={filterStatus === 'success' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('success')}
              >
                成功
              </Button>
              <Button
                variant={filterStatus === 'error' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('error')}
              >
                失败
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-300px)]">
        {/* 查询列表 */}
        <Card className="lg:col-span-2 flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center">
              <History className="h-5 w-5 mr-2" />
              查询记录
            </CardTitle>
            <CardDescription>
              点击查询记录查看详细信息
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <ScrollArea className="h-full">
              {filteredHistory.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  {searchTerm || filterStatus !== 'all' ? '未找到匹配的记录' : '暂无查询历史'}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>查询</TableHead>
                      <TableHead>索引</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>结果数</TableHead>
                      <TableHead>耗时</TableHead>
                      <TableHead>时间</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredHistory.map((item) => (
                      <TableRow
                        key={item.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedQuery(item)}
                      >
                        <TableCell className="font-mono text-sm max-w-[200px]">
                          {formatQuery(item.query)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Database className="h-4 w-4 mr-1" />
                            {item.index}
                            {item.id.startsWith('example-') && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                示例
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.status === 'success' ? 'default' : 'destructive'}>
                            {item.status === 'success' ? '成功' : '失败'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {item.status === 'success' ? item.resultCount.toLocaleString() : '-'}
                        </TableCell>
                        <TableCell>
                          {item.status === 'success' ? `${item.duration}ms` : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center text-muted-foreground">
                            <Clock className="h-4 w-4 mr-1" />
                            {formatTime(item.timestamp)}
                          </div>
                        </TableCell>
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
                              <DropdownMenuItem onClick={() => handleRerunQuery(item)}>
                                <Play className="mr-2 h-4 w-4" />
                                重新执行
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleSaveAsTemplate(item)}>
                                <Save className="mr-2 h-4 w-4" />
                                保存为模板
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem
                                    className="text-red-600"
                                    onSelect={(e) => e.preventDefault()}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    删除记录
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>确认删除</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      您确定要删除这条查询记录吗？此操作不可撤销。
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>取消</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteQuery(item.id)}
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

        {/* 查询详情 */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>查询详情</CardTitle>
            <CardDescription>
              {selectedQuery ? '查看选中查询的详细信息' : '选择一个查询记录查看详情'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            {selectedQuery ? (
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">基本信息</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">索引:</span>
                      <span>{selectedQuery.index}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">状态:</span>
                      <Badge variant={selectedQuery.status === 'success' ? 'default' : 'destructive'}>
                        {selectedQuery.status === 'success' ? '成功' : '失败'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">执行时间:</span>
                      <span>{selectedQuery.timestamp.toLocaleString('zh-CN')}</span>
                    </div>
                    {selectedQuery.status === 'success' && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">结果数量:</span>
                          <span>{selectedQuery.resultCount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">耗时:</span>
                          <span>{selectedQuery.duration}ms</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-2">查询语句</h4>
                  <Textarea
                    className="font-mono text-sm"
                    rows={8}
                    readOnly
                    value={JSON.stringify(JSON.parse(selectedQuery.query), null, 2)}
                  />
                </div>

                {selectedQuery.status === 'error' && selectedQuery.errorMessage && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-medium mb-2 text-red-600">错误信息</h4>
                      <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
                        {selectedQuery.errorMessage}
                      </div>
                    </div>
                  </>
                )}

                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    onClick={() => handleRerunQuery(selectedQuery)}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    重新执行
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSaveAsTemplate(selectedQuery)}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    保存模板
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                <div className="text-center">
                  <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>选择查询记录查看详情</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}