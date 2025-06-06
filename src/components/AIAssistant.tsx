import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Sparkles, AlertTriangle,  Copy,  Target, TrendingUp, Bot, User } from 'lucide-react'
import { useAIStore } from '@/stores/ai-store'
import { useElasticsearchStore } from '@/stores/elasticsearch-store'
import { useToast } from '@/hooks/use-toast'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

// 消息接口
interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  type?: 'smart_query' | 'performance' | 'error_diagnosis'
}

// Markdown消息组件
const MarkdownMessage: React.FC<{ content: string }> = ({ content }) => {
  return (
    <ReactMarkdown
      components={{
        code({ node,  className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '')
          return  match ? (
            <SyntaxHighlighter
              style={tomorrow}
              language={match[1]}
              PreTag="div"
              className="rounded-md"
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          ) : (
            <code className={className} {...props}>
              {children}
            </code>
          )
        },
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
        li: ({ children }) => <li className="text-sm">{children}</li>,
        h1: ({ children }) => <h1 className="text-lg font-semibold mb-2">{children}</h1>,
        h2: ({ children }) => <h2 className="text-base font-semibold mb-2">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-semibold mb-1">{children}</h3>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-muted pl-4 italic my-2">
            {children}
          </blockquote>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  )
}

/**
 * AI助手组件属性接口
 */
interface AIAssistantProps {
  currentQuery?: any
  queryResults?: any[]
  onQueryOptimized?: (query: string) => void
  lastError?: string
  showPerformanceAnalysis?: boolean
  showErrorDiagnosis?: boolean
  selectedIndex?: string
}

/**
 * AI助手组件
 * 提供智能查询构建、性能分析、错误诊断等AI赋能功能
 */
export function AIAssistant({ 
  currentQuery, 
  queryResults, 
  selectedIndex,
  lastError, 
  showPerformanceAnalysis = false, 
  showErrorDiagnosis = false
}: AIAssistantProps) {
  const { toast } = useToast()
  const {
    isGenerating,
    currentModel,
    ollamaConnected,
    buildSmartQueryStream,
    analyzeQueryPerformance,
    diagnoseError
  } = useAIStore()
  
  const { getIndexMapping } = useElasticsearchStore()
  
  // 组件状态
  const [activeTab, setActiveTab] = useState('smart-query')
  const [naturalLanguageInput, setNaturalLanguageInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [_smartQueryResult, setSmartQueryResult] = useState<any>(null)
  const [_performanceAnalysis, setPerformanceAnalysis] = useState<any>(null)
  const [_errorDiagnosis, setErrorDiagnosis] = useState<any>(null)
  
  // 添加消息到历史记录
  const addMessage = (role: 'user' | 'assistant', content: string, type?: 'smart_query' | 'performance' | 'error_diagnosis') => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: new Date(),
      type
    }
    setMessages(prev => [...prev, newMessage])
  }

  // 自动滚动到底部
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }
  
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // 复制消息内容
  const handleCopyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
    } catch (err) {
      console.error('复制失败:', err)
    }
  }

  // 格式化时间
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  
  /**
   * 获取当前索引上下文信息
   */
  const getCurrentIndexContext = async () => {
    if (!selectedIndex) return null
    
    try {
      const mapping = await getIndexMapping(selectedIndex)
      return {
        indexName: selectedIndex,
        mapping: mapping,
        settings: {},
        sampleDoc: {}
      }
    } catch (error) {
      console.error('获取索引上下文失败:', error)
      return null
    }
  }
  
 
  
  /**
   * 处理性能分析
   */
  const handlePerformanceAnalysis = async () => {
    if (!currentQuery) {
      toast({
        title: '没有查询可分析',
        description: '请先执行一个查询',
        variant: 'destructive'
      })
      return
    }
    
    if (!ollamaConnected) {
      toast({
        title: 'AI服务未连接',
        description: '请先连接Ollama服务',
        variant: 'destructive'
      })
      return
    }
    
    setIsLoading(true)
    addMessage('user', '请分析当前查询的性能', 'performance')
    
    try {
      const result = await analyzeQueryPerformance(currentQuery, queryResults)
      setPerformanceAnalysis(result)
      
      if (result) {
        const responseContent = `## 性能分析报告\n${result.report}\n\n## 优化建议\n${result.optimizations?.map((o: string) => `- ${o}`).join('\n') || '暂无优化建议'}\n\n## 索引建议\n${result.indexSuggestions?.map((i: string) => `- ${i}`).join('\n') || '暂无索引建议'}`
        addMessage('assistant', responseContent, 'performance')
      }
      
      toast({
        title: '性能分析完成',
        description: '已生成查询性能分析报告'
      })
    } catch (error: any) {
      console.error('性能分析失败:', error)
      addMessage('assistant', '抱歉，性能分析失败，请稍后重试。', 'performance')
      toast({
        title: '性能分析失败',
        description: error.message || '请检查网络连接和AI服务状态',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  /**
   * 处理错误诊断
   */
  const handleErrorDiagnosis = async () => {
    if (!lastError) {
      toast({
        title: '没有错误可诊断',
        description: '当前没有错误信息',
        variant: 'destructive'
      })
      return
    }
    
    if (!ollamaConnected) {
      toast({
        title: 'AI服务未连接',
        description: '请先连接Ollama服务',
        variant: 'destructive'
      })
      return
    }
    
    setIsLoading(true)
    addMessage('user', `请诊断以下错误：${lastError}`, 'error_diagnosis')
    
    try {
      const result = await diagnoseError(lastError, currentQuery)
      setErrorDiagnosis(result)
      
      if (result) {
        const responseContent = `## 错误诊断\n${result.diagnosis}\n\n## 解决方案\n${result.solutions?.map((s: string) => `- ${s}`).join('\n') || '暂无解决方案'}\n\n## 预防措施\n${result.prevention?.map((p: string) => `- ${p}`).join('\n') || '暂无预防措施'}`
        addMessage('assistant', responseContent, 'error_diagnosis')
      }
      
      toast({
        title: '错误诊断完成',
        description: '已生成错误诊断报告'
      })
    } catch (error: any) {
      console.error('错误诊断失败:', error)
      addMessage('assistant', '抱歉，错误诊断失败，请稍后重试。', 'error_diagnosis')
      toast({
        title: '错误诊断失败',
        description: error.message || '请检查网络连接和AI服务状态',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  
  /**
   * 处理智能查询生成 - 使用流式输出
   */
  const handleSmartQuery = async () => {
    if (!naturalLanguageInput.trim()) return
    
    const context = getCurrentIndexContext()
    setIsLoading(true)
    
    // 添加用户消息
    const userInput = naturalLanguageInput
    addMessage('user', userInput, 'smart_query')
    setNaturalLanguageInput('')
    
    // 创建一个空的助手消息用于流式更新
    const assistantMessageId = Date.now().toString()
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      type: 'smart_query'
    }
    setMessages(prev => [...prev, assistantMessage])
    
    try {
      let fullContent = ''
      
      // 流式更新回调函数
      const handleStreamUpdate = (streamContent: string) => {
        console.log('AIAssistant收到流式更新:', streamContent.substring(0, 50) + '...')
        fullContent = streamContent
        
        // 使用函数式更新确保获取最新状态
        setMessages(prev => {
          const updated = prev.map(msg => 
            msg.id === assistantMessageId 
              ? { ...msg, content: streamContent }
              : msg
          )
          console.log('更新消息状态，消息数量:', updated.length, '内容长度:', streamContent.length)
          return updated
        })
        
        // 强制触发重新渲染
        setTimeout(() => {
          console.log('延迟检查消息状态')
        }, 0)
      }
      
      const result = await buildSmartQueryStream(userInput, context, handleStreamUpdate)
      
      setSmartQueryResult(result)
      
      // 最终格式化内容
      if (result) {
        const finalContent = `## 生成的查询\n\`\`\`json\n${JSON.stringify(result.query, null, 2)}\n\`\`\`\n\n## 查询说明\n${result.explanation}\n\n## 优化建议\n${result.suggestions?.map((s: string) => `- ${s}`).join('\n') || '暂无建议'}`
        
        setMessages(prev => 
          prev.map(msg => 
            msg.id === assistantMessageId 
              ? { ...msg, content: finalContent }
              : msg
          )
        )
      }
    } catch (error) {
      console.error('智能查询生成失败:', error)
      const errorContent = '抱歉，智能查询生成失败，请稍后重试。'
      setMessages(prev => 
        prev.map(msg => 
          msg.id === assistantMessageId 
            ? { ...msg, content: errorContent }
            : msg
        )
      )
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* 头部信息 */}
      <div className="flex-shrink-0 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bot className="h-5 w-5" />
            <span className="font-semibold">AI智能助手</span>
            {currentModel && (
              <Badge variant="secondary">
                {currentModel.displayName}
              </Badge>
            )}
          </div>
          {!ollamaConnected && (
            <Badge variant="destructive">AI服务未连接</Badge>
          )}
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="flex-1 flex flex-col min-h-0">
        {!ollamaConnected ? (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              AI服务未连接，请先在设置中配置并连接Ollama服务
            </AlertDescription>
          </Alert>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
            <TabsList className="grid w-full grid-cols-3 flex-shrink-0">
              <TabsTrigger value="smart-query">智能查询</TabsTrigger>
              <TabsTrigger 
                value="performance" 
                disabled={!showPerformanceAnalysis}
              >
                性能分析
              </TabsTrigger>
              <TabsTrigger 
                value="error-diagnosis" 
                disabled={!showErrorDiagnosis}
              >
                错误诊断
              </TabsTrigger>
            </TabsList>
            
            {/* 智能查询构建 */}
            <TabsContent value="smart-query" className="flex flex-col h-full space-y-4">
              {/* 消息历史区域 */}
              <ScrollArea className="flex-1 min-h-0">
                <div className="space-y-4 pr-4">
                  {messages.filter(msg => !msg.type || msg.type === 'smart_query').map((msg) => (
                    <div key={msg.id} className="group">
                      <div className={`flex items-start space-x-3 ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                        <Avatar className="w-8 h-8 flex-shrink-0">
                          <AvatarFallback>
                            {msg.role === 'user' ? (
                              <User className="h-4 w-4" />
                            ) : (
                              <Bot className="h-4 w-4" />
                            )}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className={`flex flex-col flex-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                          <div className={`max-w-[85%] space-y-2 ${msg.role === 'user' ? 'min-w-[200px]' : 'min-w-[300px]'}`}>
                            <div className={`rounded-lg p-4 ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                              {msg.role === 'user' ? (
                                <p className="whitespace-pre-wrap break-words leading-relaxed">
                                  {msg.content}
                                </p>
                              ) : (
                                <div className="prose prose-sm max-w-none dark:prose-invert">
                                  <MarkdownMessage content={msg.content} />
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className={`flex items-center mt-2 space-x-2 ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                            <span className="text-xs text-muted-foreground">
                              {formatTime(msg.timestamp)}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleCopyMessage(msg.content)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* 加载状态 */}
                  {(isLoading || isGenerating) && activeTab === 'smart-query' && (
                    <div className="flex items-start space-x-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback>
                          <Bot className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="bg-muted rounded-lg p-4">
                          <div className="flex items-center space-x-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm text-muted-foreground">AI正在生成查询中...</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
              
              {/* 输入区域 */}
              <div className="flex-shrink-0 border-t pt-4">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      自然语言描述
                    </label>
                    <Textarea
                      placeholder="请用自然语言描述您想要查询的内容，例如：查找最近7天内状态为error的日志记录"
                      value={naturalLanguageInput}
                      onChange={(e) => setNaturalLanguageInput(e.target.value)}
                      className="min-h-[80px]"
                      disabled={isLoading || isGenerating}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                          e.preventDefault()
                          handleSmartQuery()
                        }
                      }}
                    />
                  </div>
                  
                  {selectedIndex && (
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        目标索引
                      </label>
                      <Badge variant="secondary">{selectedIndex}</Badge>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Button 
                      onClick={handleSmartQuery}
                      disabled={isLoading || isGenerating || !naturalLanguageInput.trim() || !selectedIndex || !ollamaConnected}
                      className="w-full"
                    >
                      {(isLoading || isGenerating) ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          生成中...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          生成智能查询 (Ctrl+Enter)
                        </>
                      )}
                    </Button>
                    
                    {(!selectedIndex || !naturalLanguageInput.trim()) && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        <span>
                          {!selectedIndex && !naturalLanguageInput.trim() 
                            ? '请选择索引并输入查询描述'
                            : !selectedIndex 
                            ? '请先选择一个索引'
                            : '请输入查询描述'
                          }
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
            
            {/* 性能分析 */}
            <TabsContent value="performance" className="flex flex-col h-full space-y-4">
              {/* 消息历史区域 */}
              <ScrollArea className="flex-1 min-h-0">
                <div className="space-y-4 pr-4">
                  {messages.filter(msg => !msg.type || msg.type === 'performance').map((msg) => (
                    <div key={msg.id} className="group">
                      <div className={`flex items-start space-x-3 ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                        <Avatar className="w-8 h-8 flex-shrink-0">
                          <AvatarFallback>
                            {msg.role === 'user' ? (
                              <User className="h-4 w-4" />
                            ) : (
                              <Bot className="h-4 w-4" />
                            )}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className={`flex flex-col flex-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                          <div className={`max-w-[85%] space-y-2 ${msg.role === 'user' ? 'min-w-[200px]' : 'min-w-[300px]'}`}>
                            <div className={`rounded-lg p-4 ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                              {msg.role === 'user' ? (
                                <p className="whitespace-pre-wrap break-words leading-relaxed">
                                  {msg.content}
                                </p>
                              ) : (
                                <div className="prose prose-sm max-w-none dark:prose-invert">
                                  <MarkdownMessage content={msg.content} />
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className={`flex items-center mt-2 space-x-2 ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                            <span className="text-xs text-muted-foreground">
                              {formatTime(msg.timestamp)}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleCopyMessage(msg.content)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* 加载状态 */}
                  {(isLoading || isGenerating) && activeTab === 'performance' && (
                    <div className="flex items-start space-x-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback>
                          <Bot className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="bg-muted rounded-lg p-4 max-w-[300px]">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-current rounded-full animate-bounce" />
                            <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                            <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
              
              {/* 操作区域 */}
              <div className="flex-shrink-0 border-t pt-4">
                <div className="space-y-4">
                  {currentQuery && (
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        当前查询
                      </label>
                      <SyntaxHighlighter
                        language="json"
                        style={tomorrow}
                        className="rounded-md text-xs"
                      >
                        {typeof currentQuery === 'string' ? currentQuery : JSON.stringify(currentQuery, null, 2)}
                      </SyntaxHighlighter>
                    </div>
                  )}
                  
                  <Button 
                    onClick={handlePerformanceAnalysis}
                    disabled={isLoading || isGenerating || !currentQuery || !ollamaConnected}
                    className="w-full"
                  >
                    {(isLoading || isGenerating) ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        分析中...
                      </>
                    ) : (
                      <>
                        <TrendingUp className="mr-2 h-4 w-4" />
                        开始性能分析
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            {/* 错误诊断 */}
            <TabsContent value="error-diagnosis" className="flex flex-col h-full space-y-4">
              {/* 消息历史区域 */}
              <ScrollArea className="flex-1 min-h-0">
                <div className="space-y-4 pr-4">
                  {messages.filter(msg => !msg.type || msg.type === 'error_diagnosis').map((msg) => (
                    <div key={msg.id} className="group">
                      <div className={`flex items-start space-x-3 ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                        <Avatar className="w-8 h-8 flex-shrink-0">
                          <AvatarFallback>
                            {msg.role === 'user' ? (
                              <User className="h-4 w-4" />
                            ) : (
                              <Bot className="h-4 w-4" />
                            )}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className={`flex flex-col flex-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                          <div className={`max-w-[85%] space-y-2 ${msg.role === 'user' ? 'min-w-[200px]' : 'min-w-[300px]'}`}>
                            <div className={`rounded-lg p-4 ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                              {msg.role === 'user' ? (
                                <p className="whitespace-pre-wrap break-words leading-relaxed">
                                  {msg.content}
                                </p>
                              ) : (
                                <div className="prose prose-sm max-w-none dark:prose-invert">
                                  <MarkdownMessage content={msg.content} />
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className={`flex items-center mt-2 space-x-2 ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                            <span className="text-xs text-muted-foreground">
                              {formatTime(msg.timestamp)}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleCopyMessage(msg.content)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* 加载状态 */}
                  {(isLoading || isGenerating) && activeTab === 'error-diagnosis' && (
                    <div className="flex items-start space-x-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback>
                          <Bot className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="bg-muted rounded-lg p-4 max-w-[300px]">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-current rounded-full animate-bounce" />
                            <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                            <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
              
              {/* 操作区域 */}
              <div className="flex-shrink-0 border-t pt-4">
                <div className="space-y-4">
                  {lastError && (
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        当前错误信息
                      </label>
                      <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
                        {lastError}
                      </div>
                    </div>
                  )}

                  <Button 
                    onClick={handleErrorDiagnosis}
                    disabled={isLoading || isGenerating || !lastError || !ollamaConnected}
                    className="w-full"
                  >
                    {(isLoading || isGenerating) ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        诊断中...
                      </>
                    ) : (
                      <>
                        <Target className="mr-2 h-4 w-4" />
                        开始错误诊断
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  )
}