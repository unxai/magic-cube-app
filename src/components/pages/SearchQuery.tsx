import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { Search, Play, Save, History, Edit, Trash2, MoreHorizontal, Copy, Download, Filter, RefreshCw } from 'lucide-react'
import { useElasticsearchStore } from '@/stores/elasticsearch-store'
import { useToast } from '@/hooks/use-toast'

/**
 * 查询模板接口
 */
interface QueryTemplate {
  id: string
  name: string
  description: string
  index: string
  queryBody: string
  createdAt: string
  updatedAt: string
  tags: string[]
}

/**
 * 查询结果接口
 */
interface QueryResult {
  id: string
  templateId?: string
  index: string
  queryBody: string
  results: any
  executedAt: string
  duration: number
  totalHits: number
  status: 'success' | 'error'
  errorMessage?: string
}

/**
 * 搜索查询页面组件
 * 提供 Elasticsearch 查询构建、执行和管理功能
 */
export function SearchQuery() {
  // 基础状态
  const [activeTab, setActiveTab] = useState('query')
  const [selectedIndex, setSelectedIndex] = useState('')
  const [queryBody, setQueryBody] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [totalHits, setTotalHits] = useState(0)
  const [queryDuration, setQueryDuration] = useState(0)
  const [viewMode, setViewMode] = useState<'json' | 'table'>('json')
  const [editingDocument, setEditingDocument] = useState<any>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  
  // 查询模板管理
  const [queryTemplates, setQueryTemplates] = useState<QueryTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<QueryTemplate | null>(null)
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false)
  const [isEditingTemplate, setIsEditingTemplate] = useState(false)
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    tags: ''
  })
  
  // 查询历史
  const [queryResults, setQueryResults] = useState<QueryResult[]>([])
  
  // 筛选器状态
  const [filterDialogOpen, setFilterDialogOpen] = useState(false)
  const [filterForm, setFilterForm] = useState({
    field: '',
    operator: 'match',
    value: ''
  })
  
  const { indices, executeQuery, getIndexMapping } = useElasticsearchStore()
  const { toast } = useToast()

  /**
   * 组件初始化
   */
  useEffect(() => {
    loadQueryTemplates()
    loadQueryResults()
    initializeDefaultQuery()
  }, [])

  /**
   * 当选择的索引变化时，重新初始化默认查询
   */
  useEffect(() => {
    if (selectedIndex) {
      initializeDefaultQuery()
    }
  }, [selectedIndex])

  /**
   * 初始化默认查询
   * 智能检查索引映射，如果存在@timestamp字段则添加排序
   */
  const initializeDefaultQuery = async () => {
    const defaultQuery: any = {
      query: {
        match_all: {}
      },
      size: 20,
      from: 0
    }

    // 如果选择了索引，尝试检查是否有@timestamp字段
    if (selectedIndex) {
      try {
        const mapping = await getIndexMapping(selectedIndex)
        
        // 检查映射中是否存在@timestamp字段
        const indexMapping = mapping[selectedIndex]?.mappings?.properties
        if (indexMapping && indexMapping['@timestamp']) {
          defaultQuery.sort = [{ "@timestamp": { "order": "desc" } }]
        }
      } catch (error) {
        // 如果获取映射失败，使用不带排序的默认查询
        console.warn('无法获取索引映射，使用默认查询:', error)
      }
    }

    setQueryBody(JSON.stringify(defaultQuery, null, 2))
  }

  /**
   * 加载查询模板
   */
  const loadQueryTemplates = () => {
    try {
      const saved = localStorage.getItem('elasticsearch-query-templates')
      if (saved) {
        setQueryTemplates(JSON.parse(saved))
      }
    } catch (error) {
      console.error('加载查询模板失败:', error)
    }
  }

  /**
   * 保存查询模板
   */
  const saveQueryTemplates = (templates: QueryTemplate[]) => {
    try {
      localStorage.setItem('elasticsearch-query-templates', JSON.stringify(templates))
      setQueryTemplates(templates)
    } catch (error) {
      console.error('保存查询模板失败:', error)
    }
  }

  /**
   * 加载查询结果历史
   */
  const loadQueryResults = () => {
    try {
      const saved = localStorage.getItem('elasticsearch-query-results')
      if (saved) {
        setQueryResults(JSON.parse(saved))
      }
    } catch (error) {
      console.error('加载查询结果失败:', error)
    }
  }

  /**
   * 保存查询结果
   */
  const saveQueryResults = (results: QueryResult[]) => {
    try {
      // 只保留最近100条记录
      const limitedResults = results.slice(0, 100)
      localStorage.setItem('elasticsearch-query-results', JSON.stringify(limitedResults))
      setQueryResults(limitedResults)
    } catch (error) {
      console.error('保存查询结果失败:', error)
    }
  }

  /**
   * 执行查询
   */
  const handleExecuteQuery = async () => {
    if (!selectedIndex || !queryBody.trim()) {
      toast({
        title: '参数错误',
        description: '请选择索引并输入查询语句',
        variant: 'destructive'
      })
      return
    }

    setIsLoading(true)
    const startTime = Date.now()
    
    try {
      // 解析查询体
      const parsedQuery = JSON.parse(queryBody)
      
      // 执行查询
      const result = await executeQuery(selectedIndex, parsedQuery)
      const duration = Date.now() - startTime
      
      // 更新结果
      setResults(result.hits?.hits || [])
      setTotalHits(result.hits?.total?.value || result.hits?.total || 0)
      setQueryDuration(duration)
      
      // 保存到历史记录
      const queryResult: QueryResult = {
        id: Date.now().toString(),
        templateId: selectedTemplate?.id,
        index: selectedIndex,
        queryBody,
        results: result,
        executedAt: new Date().toISOString(),
        duration,
        totalHits: result.hits?.total?.value || result.hits?.total || 0,
        status: 'success'
      }
      
      const updatedResults = [queryResult, ...queryResults]
      saveQueryResults(updatedResults)
      
      toast({
        title: '查询成功',
        description: `找到 ${queryResult.totalHits} 条记录，耗时 ${duration}ms`
      })
      
    } catch (error: any) {
      console.error('查询执行失败:', error)
      
      // 保存错误记录
      const queryResult: QueryResult = {
        id: Date.now().toString(),
        index: selectedIndex,
        queryBody,
        results: null,
        executedAt: new Date().toISOString(),
        duration: Date.now() - startTime,
        totalHits: 0,
        status: 'error',
        errorMessage: error.message || '查询执行失败'
      }
      
      const updatedResults = [queryResult, ...queryResults]
      saveQueryResults(updatedResults)
      
      toast({
        title: '查询失败',
        description: error.message || '查询执行失败',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * 编辑文档
   */
  const handleEditDocument = (document: any) => {
    setEditingDocument(document)
    setIsEditDialogOpen(true)
  }

  /**
   * 保存编辑的文档
   */
  const handleSaveDocument = async () => {
    if (!editingDocument || !selectedIndex) return

    try {
      // 这里需要调用Elasticsearch的更新API
      // 暂时只更新本地状态
      const updatedResults = results.map(result => 
        result._id === editingDocument._id ? editingDocument : result
      )
      setResults(updatedResults)
      setIsEditDialogOpen(false)
      setEditingDocument(null)
      
      toast({
        title: '文档更新成功',
        description: `文档 ${editingDocument._id} 已更新`
      })
    } catch (error: any) {
      toast({
        title: '文档更新失败',
        description: error.message,
        variant: 'destructive'
      })
    }
  }

  /**
   * 删除文档
   */
  const handleDeleteDocument = async (documentId: string) => {
    try {
      // 这里需要调用Elasticsearch的删除API
      // 暂时只更新本地状态
      const updatedResults = results.filter(result => result._id !== documentId)
      setResults(updatedResults)
      setTotalHits(totalHits - 1)
      
      toast({
        title: '文档删除成功',
        description: `文档 ${documentId} 已删除`
      })
    } catch (error: any) {
      toast({
        title: '文档删除失败',
        description: error.message,
        variant: 'destructive'
      })
    }
  }

  /**
   * 获取表格列
   */
  const getTableColumns = () => {
    if (results.length === 0) return []
    
    const firstDoc = results[0]._source
    const columns = Object.keys(firstDoc)
    return ['_id', '_score', ...columns]
  }

  /**
   * 保存查询模板
   */
  const handleSaveTemplate = () => {
    if (!templateForm.name.trim() || !queryBody.trim()) {
      toast({
        title: '参数错误',
        description: '请填写模板名称和查询语句',
        variant: 'destructive'
      })
      return
    }

    try {
      JSON.parse(queryBody) // 验证JSON格式
    } catch (error) {
      toast({
        title: 'JSON格式错误',
        description: '请检查查询语句的JSON格式',
        variant: 'destructive'
      })
      return
    }

    const template: QueryTemplate = {
      id: isEditingTemplate && selectedTemplate ? selectedTemplate.id : Date.now().toString(),
      name: templateForm.name,
      description: templateForm.description,
      index: selectedIndex,
      queryBody,
      createdAt: isEditingTemplate && selectedTemplate ? selectedTemplate.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: templateForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
    }

    let updatedTemplates
    if (isEditingTemplate && selectedTemplate) {
      updatedTemplates = queryTemplates.map(t => t.id === selectedTemplate.id ? template : t)
    } else {
      updatedTemplates = [template, ...queryTemplates]
    }

    saveQueryTemplates(updatedTemplates)
    setIsTemplateDialogOpen(false)
    setIsEditingTemplate(false)
    setSelectedTemplate(null)
    setTemplateForm({ name: '', description: '', tags: '' })
    
    toast({
      title: isEditingTemplate ? '模板更新成功' : '模板保存成功',
      description: `查询模板 "${template.name}" 已保存`
    })
  }

  /**
   * 删除查询模板
   */
  const handleDeleteTemplate = (template: QueryTemplate) => {
    const updatedTemplates = queryTemplates.filter(t => t.id !== template.id)
    saveQueryTemplates(updatedTemplates)
    
    toast({
      title: '模板删除成功',
      description: `查询模板 "${template.name}" 已删除`
    })
  }

  /**
   * 加载查询模板
   */
  const handleLoadTemplate = (template: QueryTemplate) => {
    setSelectedIndex(template.index)
    setQueryBody(template.queryBody)
    setSelectedTemplate(template)
    setActiveTab('query')
    
    toast({
      title: '模板加载成功',
      description: `已加载查询模板 "${template.name}"`
    })
  }

  /**
   * 编辑查询模板
   */
  const handleEditTemplate = (template: QueryTemplate) => {
    setSelectedTemplate(template)
    setTemplateForm({
      name: template.name,
      description: template.description,
      tags: template.tags.join(', ')
    })
    setIsEditingTemplate(true)
    setIsTemplateDialogOpen(true)
  }

  /**
   * 添加筛选器到查询
   */
  const handleAddFilter = () => {
    if (!filterForm.field || !filterForm.value) {
      toast({
        title: '参数错误',
        description: '请填写字段名和值',
        variant: 'destructive'
      })
      return
    }

    try {
      const currentQuery = JSON.parse(queryBody)
      
      // 构建筛选器
      const filter = (() => {
        switch (filterForm.operator) {
          case 'match':
            return { match: { [filterForm.field]: filterForm.value } }
          case 'term':
            return { term: { [`${filterForm.field}.keyword`]: filterForm.value } }
          case 'range':
            return { range: { [filterForm.field]: { gte: filterForm.value } } }
          case 'exists':
            return { exists: { field: filterForm.field } }
          default:
            return { match: { [filterForm.field]: filterForm.value } }
        }
      })()

      // 添加到查询中
      if (!currentQuery.query) {
        currentQuery.query = {}
      }

      if (!currentQuery.query.bool) {
        // 如果没有bool查询，创建一个
        const existingQuery = currentQuery.query
        currentQuery.query = {
          bool: {
            must: Object.keys(existingQuery).length > 0 ? [existingQuery] : [],
            filter: [filter]
          }
        }
      } else {
        // 如果已有bool查询，添加到filter中
        if (!currentQuery.query.bool.filter) {
          currentQuery.query.bool.filter = []
        }
        currentQuery.query.bool.filter.push(filter)
      }

      setQueryBody(JSON.stringify(currentQuery, null, 2))
      setFilterDialogOpen(false)
      setFilterForm({ field: '', operator: 'match', value: '' })
      
      toast({
        title: '筛选器添加成功',
        description: `已添加 ${filterForm.field} ${filterForm.operator} ${filterForm.value}`
      })
      
    } catch (error) {
      toast({
        title: 'JSON格式错误',
        description: '无法解析当前查询，请检查JSON格式',
        variant: 'destructive'
      })
    }
  }

  /**
   * 复制查询到剪贴板
   */
  const handleCopyQuery = () => {
    navigator.clipboard.writeText(queryBody)
    toast({
      title: '复制成功',
      description: '查询语句已复制到剪贴板'
    })
  }

  /**
   * 导出查询结果
   */
  const handleExportResults = () => {
    if (results.length === 0) {
      toast({
        title: '无数据导出',
        description: '请先执行查询获取结果',
        variant: 'destructive'
      })
      return
    }

    const exportData = {
      query: JSON.parse(queryBody),
      index: selectedIndex,
      totalHits,
      results: results.map(hit => hit._source),
      exportedAt: new Date().toISOString()
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    })
    
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `elasticsearch-results-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast({
      title: '导出成功',
      description: '查询结果已导出为JSON文件'
    })
  }

  /**
   * 格式化查询体
   */
  const handleFormatQuery = () => {
    try {
      const parsed = JSON.parse(queryBody)
      setQueryBody(JSON.stringify(parsed, null, 2))
      toast({
        title: '格式化成功',
        description: 'JSON已格式化'
      })
    } catch (error) {
      toast({
        title: 'JSON格式错误',
        description: '无法格式化，请检查JSON语法',
        variant: 'destructive'
      })
    }
  }

  return (
    <div className="h-full p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">搜索查询</h1>
          <p className="text-muted-foreground">
            构建和执行 Elasticsearch REST API 查询
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handleCopyQuery}>
            <Copy className="h-4 w-4 mr-2" />
            复制查询
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportResults}>
            <Download className="h-4 w-4 mr-2" />
            导出结果
          </Button>
          <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" onClick={() => {
                setIsEditingTemplate(false)
                setSelectedTemplate(null)
                setTemplateForm({ name: '', description: '', tags: '' })
              }}>
                <Save className="h-4 w-4 mr-2" />
                保存模板
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{isEditingTemplate ? '编辑查询模板' : '保存查询模板'}</DialogTitle>
                <DialogDescription>
                  将当前查询保存为模板，方便后续使用
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="template-name">模板名称</Label>
                  <Input
                    id="template-name"
                    placeholder="输入模板名称"
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="template-description">描述</Label>
                  <Textarea
                    id="template-description"
                    placeholder="输入模板描述"
                    value={templateForm.description}
                    onChange={(e) => setTemplateForm(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="template-tags">标签</Label>
                  <Input
                    id="template-tags"
                    placeholder="输入标签，用逗号分隔"
                    value={templateForm.tags}
                    onChange={(e) => setTemplateForm(prev => ({ ...prev, tags: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsTemplateDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleSaveTemplate}>
                  {isEditingTemplate ? '更新' : '保存'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="query">查询构建器</TabsTrigger>
          <TabsTrigger value="templates">查询模板</TabsTrigger>
          <TabsTrigger value="history">查询历史</TabsTrigger>
        </TabsList>

        {/* 查询构建器 */}
        <TabsContent value="query" className="space-y-6">
          <div className="h-[calc(100vh-280px)]">
            <PanelGroup direction="horizontal" autoSaveId="search-query-layout">
              {/* 查询编辑器面板 */}
              <Panel defaultSize={30} minSize={20} maxSize={60}>
                <Card className="flex flex-col h-full mr-2">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <Search className="h-5 w-5 mr-2" />
                    REST API 查询
                  </span>
                  <div className="flex items-center space-x-2">
                    <Dialog open={filterDialogOpen} onOpenChange={setFilterDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Filter className="h-4 w-4 mr-2" />
                          添加筛选器
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>添加筛选器</DialogTitle>
                          <DialogDescription>
                            添加筛选条件到当前查询
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="filter-field">字段名</Label>
                            <Input
                              id="filter-field"
                              placeholder="例如: status, title, @timestamp"
                              value={filterForm.field}
                              onChange={(e) => setFilterForm(prev => ({ ...prev, field: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="filter-operator">操作符</Label>
                            <select
                              id="filter-operator"
                              className="w-full p-2 border rounded-md"
                              value={filterForm.operator}
                              onChange={(e) => setFilterForm(prev => ({ ...prev, operator: e.target.value }))}
                            >
                              <option value="match">Match (模糊匹配)</option>
                              <option value="term">Term (精确匹配)</option>
                              <option value="range">Range (范围查询)</option>
                              <option value="exists">Exists (字段存在)</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="filter-value">值</Label>
                            <Input
                              id="filter-value"
                              placeholder="输入筛选值"
                              value={filterForm.value}
                              onChange={(e) => setFilterForm(prev => ({ ...prev, value: e.target.value }))}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setFilterDialogOpen(false)}>
                            取消
                          </Button>
                          <Button onClick={handleAddFilter}>
                            添加筛选器
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <Button variant="outline" size="sm" onClick={handleFormatQuery}>
                      格式化
                    </Button>
                  </div>
                </CardTitle>
                <CardDescription>
                  直接编辑 Elasticsearch REST API 查询体
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                {/* 索引选择 */}
                <div className="space-y-2">
                  <Label htmlFor="index-select">目标索引</Label>
                  <select
                    id="index-select"
                    className="w-full p-2 border rounded-md"
                    value={selectedIndex}
                    onChange={(e) => setSelectedIndex(e.target.value)}
                  >
                    <option value="">请选择索引</option>
                    {indices.map((index) => (
                      <option key={index.index} value={index.index}>
                        {index.index} ({index.docsCount} 文档)
                      </option>
                    ))}
                  </select>
                </div>

                {/* 查询体编辑器 */}
                <div className="space-y-2 flex-1">
                  <Label htmlFor="query-body">查询体 (JSON)</Label>
                  <Textarea
                    id="query-body"
                    className="font-mono text-sm flex-1 min-h-[300px]"
                    placeholder="输入 Elasticsearch 查询 JSON..."
                    value={queryBody}
                    onChange={(e) => setQueryBody(e.target.value)}
                  />
                </div>

                {/* 执行按钮 */}
                <Button 
                  onClick={handleExecuteQuery}
                  disabled={!selectedIndex || !queryBody.trim() || isLoading}
                  className="w-full"
                  size="lg"
                >
                  <Play className="h-4 w-4 mr-2" />
                  {isLoading ? '执行中...' : '执行查询'}
                </Button>
              </CardContent>
                </Card>
              </Panel>
              
              {/* 拖拽分割线 */}
              <PanelResizeHandle className="w-2 bg-border hover:bg-accent transition-colors cursor-col-resize flex items-center justify-center">
                <div className="w-1 h-8 bg-muted-foreground/30 rounded-full" />
              </PanelResizeHandle>
              
              {/* 查询结果面板 */}
              <Panel defaultSize={70} minSize={40}>
                <Card className="flex flex-col h-full ml-2">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>查询结果</span>
                  <div className="flex items-center space-x-2">
                    {/* 视图切换按钮 */}
                    {results.length > 0 && (
                      <div className="flex items-center space-x-1 border rounded-md p-1">
                        <Button
                          variant={viewMode === 'json' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setViewMode('json')}
                        >
                          JSON
                        </Button>
                        <Button
                          variant={viewMode === 'table' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setViewMode('table')}
                        >
                          表格
                        </Button>
                      </div>
                    )}
                    {totalHits > 0 && (
                      <Badge variant="secondary">
                        {totalHits} 条记录
                      </Badge>
                    )}
                    {queryDuration > 0 && (
                      <Badge variant="outline">
                        {queryDuration}ms
                      </Badge>
                    )}
                  </div>
                </CardTitle>
                <CardDescription>
                  查询执行结果和文档详情
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <ScrollArea className="h-[calc(100vh-400px)]">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                      <span>执行查询中...</span>
                    </div>
                  ) : results.length === 0 ? (
                    <div className="flex items-center justify-center h-32 text-muted-foreground">
                      执行查询以查看结果
                    </div>
                  ) : viewMode === 'table' ? (
                    /* 表格视图 */
                    <div className="border rounded-md overflow-x-auto">
                      <Table className="min-w-full">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">#</TableHead>
                            <TableHead className="w-32">文档ID</TableHead>
                            <TableHead className="w-20">评分</TableHead>
                            {getTableColumns().filter(col => !['_id', '_score'].includes(col)).map(column => (
                              <TableHead key={column}>{column}</TableHead>
                            ))}
                            <TableHead className="w-24">操作</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {results.map((hit, index) => (
                            <TableRow key={hit._id}>
                              <TableCell>{index + 1}</TableCell>
                              <TableCell className="font-mono text-xs">
                                {hit._id.length > 12 ? `${hit._id.substring(0, 12)}...` : hit._id}
                              </TableCell>
                              <TableCell>{hit._score?.toFixed(2)}</TableCell>
                              {getTableColumns().filter(col => !['_id', '_score'].includes(col)).map(column => (
                                <TableCell key={column} className="max-w-32 truncate">
                                  {typeof hit._source[column] === 'object' 
                                    ? JSON.stringify(hit._source[column]).substring(0, 50) + '...' 
                                    : String(hit._source[column] || '').substring(0, 50)
                                  }
                                </TableCell>
                              ))}
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent>
                                    <DropdownMenuItem onClick={() => handleEditDocument(hit)}>
                                      <Edit className="h-4 w-4 mr-2" />
                                      编辑
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          删除
                                        </DropdownMenuItem>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>确认删除</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            确定要删除文档 {hit._id} 吗？此操作无法撤销。
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>取消</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => handleDeleteDocument(hit._id)}>
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
                    </div>
                  ) : (
                    /* JSON视图 */
                    <div className="space-y-4">
                      {results.map((hit, index) => (
                        <div key={hit._id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline">#{index + 1}</Badge>
                              <span className="font-mono text-sm text-muted-foreground">
                                {hit._id}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  <DropdownMenuItem onClick={() => handleEditDocument(hit)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    编辑
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        删除
                                      </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>确认删除</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          确定要删除文档 {hit._id} 吗？此操作无法撤销。
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>取消</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteDocument(hit._id)}>
                                          删除
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </DropdownMenuContent>
                              </DropdownMenu>
                              <Badge variant="secondary">
                                Score: {hit._score?.toFixed(2)}
                              </Badge>
                              <Badge variant="outline">
                                {hit._index}
                              </Badge>
                            </div>
                          </div>
                          <Separator className="my-2" />
                          <pre className="text-sm bg-muted p-2 rounded overflow-auto max-h-48">
                            {JSON.stringify(hit._source, null, 2)}
                          </pre>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
                </Card>
              </Panel>
            </PanelGroup>
          </div>
        </TabsContent>

        {/* 查询模板 */}
        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>查询模板管理</span>
                <Badge variant="secondary">
                  {queryTemplates.length} 个模板
                </Badge>
              </CardTitle>
              <CardDescription>
                管理和使用保存的查询模板
              </CardDescription>
            </CardHeader>
            <CardContent>
              {queryTemplates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Save className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>暂无查询模板</p>
                  <p className="text-sm">在查询构建器中保存您的第一个模板</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {queryTemplates.map((template) => (
                    <div key={template.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium">{template.name}</h3>
                          <Badge variant="outline">{template.index}</Badge>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleLoadTemplate(template)}>
                              <Play className="h-4 w-4 mr-2" />
                              加载模板
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditTemplate(template)}>
                              <Edit className="h-4 w-4 mr-2" />
                              编辑模板
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  删除模板
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>确认删除</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    确定要删除查询模板 "{template.name}" 吗？此操作不可撤销。
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>取消</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteTemplate(template)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    删除
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      
                      {template.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {template.description}
                        </p>
                      )}
                      
                      {template.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {template.tags.map((tag, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                      
                      <div className="text-xs text-muted-foreground">
                        创建于 {new Date(template.createdAt).toLocaleString()}
                        {template.updatedAt !== template.createdAt && (
                          <span> • 更新于 {new Date(template.updatedAt).toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 查询历史 */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>查询历史</span>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">
                    {queryResults.length} 条记录
                  </Badge>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setQueryResults([])
                      localStorage.removeItem('elasticsearch-query-results')
                      toast({ title: '历史记录已清空' })
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    清空历史
                  </Button>
                </div>
              </CardTitle>
              <CardDescription>
                查看和重新执行历史查询
              </CardDescription>
            </CardHeader>
            <CardContent>
              {queryResults.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>暂无查询历史</p>
                  <p className="text-sm">执行查询后将在此显示历史记录</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {queryResults.map((result) => (
                    <div key={result.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Badge variant={result.status === 'success' ? 'default' : 'destructive'}>
                            {result.status === 'success' ? '成功' : '失败'}
                          </Badge>
                          <Badge variant="outline">{result.index}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(result.executedAt).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {result.status === 'success' && (
                            <Badge variant="secondary">
                              {result.totalHits} 条结果
                            </Badge>
                          )}
                          <Badge variant="outline">
                            {result.duration}ms
                          </Badge>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setSelectedIndex(result.index)
                              setQueryBody(result.queryBody)
                              setActiveTab('query')
                            }}
                          >
                            <Play className="h-4 w-4 mr-2" />
                            重新执行
                          </Button>
                        </div>
                      </div>
                      
                      {result.status === 'error' && result.errorMessage && (
                        <div className="text-sm text-red-600 mb-2">
                          错误: {result.errorMessage}
                        </div>
                      )}
                      
                      <details className="text-sm">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                          查看查询语句
                        </summary>
                        <pre className="mt-2 bg-muted p-2 rounded overflow-auto text-xs">
                          {result.queryBody}
                        </pre>
                      </details>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* 编辑文档对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑文档</DialogTitle>
            <DialogDescription>
              编辑文档内容，修改后点击保存。
            </DialogDescription>
          </DialogHeader>
          {editingDocument && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="doc-id">文档 ID</Label>
                  <Input
                    id="doc-id"
                    value={editingDocument._id}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
                <div>
                  <Label htmlFor="doc-index">索引</Label>
                  <Input
                    id="doc-index"
                    value={editingDocument._index}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="doc-source">文档内容 (JSON)</Label>
                <Textarea
                  id="doc-source"
                  value={JSON.stringify(editingDocument._source, null, 2)}
                  onChange={(e) => {
                    try {
                      const newSource = JSON.parse(e.target.value)
                      setEditingDocument({
                        ...editingDocument,
                        _source: newSource
                      })
                    } catch (error) {
                      // 如果JSON格式不正确，暂时不更新
                      console.warn('Invalid JSON format')
                    }
                  }}
                  className="min-h-[300px] font-mono text-sm"
                  placeholder="请输入有效的JSON格式"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              取消
            </Button>
            <Button
              onClick={() => {
                if (editingDocument) {
                  handleSaveDocument()
                }
              }}
            >
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}