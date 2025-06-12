import React, { useState, useRef, useEffect } from 'react'
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
  const { toast: _toast } = useToast()
  const {
    isGenerating: _isGenerating,
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
  // 为每个功能独立管理loading状态
  const [isSmartQueryLoading, setIsSmartQueryLoading] = useState(false)
  const [isPerformanceLoading, setIsPerformanceLoading] = useState(false)
  const [isErrorDiagnosisLoading, setIsErrorDiagnosisLoading] = useState(false)
  const [_smartQueryResult, setSmartQueryResult] = useState<any>(null)
  const [_performanceAnalysis, setPerformanceAnalysis] = useState<any>(null)
  const [_errorDiagnosis, setErrorDiagnosis] = useState<any>(null)
  const [localCurrentQuery, setLocalCurrentQuery] = useState<any>(null)
  
  // 同步外部查询状态
  useEffect(() => {
    setLocalCurrentQuery(currentQuery)
  }, [currentQuery])

  // 自动滚动到底部
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }
  
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // 添加消息到历史记录
  const addMessage = (role: 'user' | 'assistant', content: string, type?: 'smart_query' | 'performance' | 'error_diagnosis') => {
    const newMessage: Message = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role,
      content,
      timestamp: new Date(),
      type
    }
    setMessages(prev => [...prev, newMessage])
  }

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
    if (!localCurrentQuery) return
    
    setIsPerformanceLoading(true)
    
    // 添加用户消息
    const userMessage = `请分析以下查询的性能:\n\`\`\`json\n${JSON.stringify(localCurrentQuery, null, 2)}\n\`\`\`\n`
    addMessage('user', userMessage, 'performance')
    
    // 创建一个空的助手消息用于流式更新
    const assistantMessageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      type: 'performance'
    }
    setMessages(prev => [...prev, assistantMessage])
    
    try {
      const result = await analyzeQueryPerformance(localCurrentQuery, queryResults)
      setPerformanceAnalysis(result)
      
      // 最终格式化内容
      if (result) {
        const { optimizations, indexSuggestions, report } = result
        const finalContent = `## 性能分析报告\n${report}\n\n## 优化建议\n${optimizations?.map((o: string) => `- ${o}`).join('\n') || '暂无建议'}\n\n## 索引建议\n${indexSuggestions?.map((s: string) => `- ${s}`).join('\n') || '暂无建议'}`
        
        setMessages(prev => 
          prev.map(msg => 
            msg.id === assistantMessageId 
              ? { ...msg, content: finalContent }
              : msg
          )
        )
      }
    } catch (error) {
      console.error('性能分析生成失败:', error)
      const errorContent = '抱歉，性能分析生成失败，请稍后重试。'
      setMessages(prev => 
        prev.map(msg => 
          msg.id === assistantMessageId 
            ? { ...msg, content: errorContent }
            : msg
        )
      )
    } finally {
      setIsPerformanceLoading(false)
    }
  }
  
  /**
   * 处理错误诊断
   */
  const handleErrorDiagnosis = async () => {
    if (!lastError) return
    
    setIsErrorDiagnosisLoading(true)
    
    // 添加用户消息
    const userMessage = `请诊断以下错误:\n\`\`\`\n${lastError}\n\`\`\`\n`
    addMessage('user', userMessage, 'error_diagnosis')
    
    // 创建一个空的助手消息用于流式更新
    const assistantMessageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      type: 'error_diagnosis'
    }
    setMessages(prev => [...prev, assistantMessage])
    
    try {
      const result = await diagnoseError(lastError)
      setErrorDiagnosis(result)
      
      // 最终格式化内容
      if (result) {
        const { diagnosis, solutions, prevention } = result
        const finalContent = `## 错误诊断\n${diagnosis}\n\n## 解决方案\n${solutions?.map((s: string) => `- ${s}`).join('\n') || '暂无建议'}\n\n## 预防措施\n${prevention?.map((p: string) => `- ${p}`).join('\n') || '暂无建议'}`
        
        setMessages(prev => 
          prev.map(msg => 
            msg.id === assistantMessageId 
              ? { ...msg, content: finalContent }
              : msg
          )
        )
      }
    } catch (error) {
      console.error('错误诊断生成失败:', error)
      const errorContent = '抱歉，错误诊断生成失败，请稍后重试。'
      setMessages(prev => 
        prev.map(msg => 
          msg.id === assistantMessageId 
            ? { ...msg, content: errorContent }
            : msg
        )
      )
    } finally {
      setIsErrorDiagnosisLoading(false)
    }
  }
  
  
  /**
   * 处理智能查询生成 - 使用流式输出
   */
  const handleSmartQuery = async () => {
    if (!naturalLanguageInput.trim()) return
    
    const context = await getCurrentIndexContext()
    setIsSmartQueryLoading(true)
    
    // 添加用户消息
    const userInput = naturalLanguageInput
    addMessage('user', userInput, 'smart_query')
    setNaturalLanguageInput('')
    
    // 创建一个空的助手消息用于流式更新
    const assistantMessageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      type: 'smart_query'
    }
    setMessages(prev => [...prev, assistantMessage])
    
    try {
      // 智能查询流式更新回调函数
      const handleSmartQueryStreamUpdate = (streamContent: string) => {
        // 直接使用AI返回的内容，不显示调试信息
        
        // 使用函数式更新确保获取最新状态
        setMessages(prev => {
          const updated = prev.map(msg => 
            msg.id === assistantMessageId 
              ? { ...msg, content: streamContent }
              : msg
          )
          return updated
        })
      }
      
      const result = await buildSmartQueryStream(userInput, context, handleSmartQueryStreamUpdate)
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
      setIsSmartQueryLoading(false)
    }
  }
  
  return (
    <div className="flex flex-col h-[900px] overflow-hidden">
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
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {!ollamaConnected ? (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              AI服务未连接，请先在设置中配置并连接Ollama服务
            </AlertDescription>
          </Alert>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1">
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
            
            {/* Tab内容区域 */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden pt-4">
              <TabsContent value="smart-query" className="flex-1 flex flex-col min-h-0 m-0">
                {/* 消息历史区域 */}
                <ScrollArea className="flex-1 min-h-[300px] pr-4 -mr-4">
                  <div className="space-y-4 pb-4">
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
                    {/* 加载状态不变 */}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
                
                {/* 智能查询输入区域 */}
                <div className="flex-shrink-0 pt-4 border-t">
                  <div className="space-y-3">
                    <Textarea
                      placeholder="请用自然语言描述您想要查询的内容，例如：查找最近7天内状态为error的日志"
                      value={naturalLanguageInput}
                      onChange={(e) => setNaturalLanguageInput(e.target.value)}
                      className="min-h-[80px] resize-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleSmartQuery()
                        }
                      }}
                    />
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <Sparkles className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {selectedIndex ? `当前索引: ${selectedIndex}` : '请先选择索引'}
                        </span>
                      </div>
                      <Button
                        onClick={handleSmartQuery}
                        disabled={!naturalLanguageInput.trim() || isSmartQueryLoading || !selectedIndex}
                        className="min-w-[80px]"
                      >
                        {isSmartQueryLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            生成中
                          </>
                        ) : (
                          '生成查询'
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="performance" className="flex-1 flex flex-col min-h-0 m-0">
                {/* 消息历史区域 */}
                <ScrollArea className="flex-1 min-h-[300px] pr-4 -mr-4">
                  <div className="space-y-4 pb-4">
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
                    {/* 加载状态不变 */}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
                
                {/* 性能分析操作区域 */}
                <div className="flex-shrink-0 pt-4 border-t">
                  <div className="flex justify-center">
                    <Button
                      onClick={handlePerformanceAnalysis}
                      disabled={!localCurrentQuery || isPerformanceLoading}
                      className="min-w-[120px]"
                    >
                      {isPerformanceLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          分析中
                        </>
                      ) : (
                        <>
                          <TrendingUp className="mr-2 h-4 w-4" />
                          开始分析
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="error-diagnosis" className="flex-1 flex flex-col min-h-0 m-0">
                {/* 消息历史区域 */}
                <ScrollArea className="flex-1 min-h-[300px] pr-4 -mr-4">
                  <div className="space-y-4 pb-4">
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
                    {/* 加载状态不变 */}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
                
                {/* 错误诊断操作区域 */}
                <div className="flex-shrink-0 pt-4 border-t">
                  <div className="flex justify-center">
                    <Button
                      onClick={handleErrorDiagnosis}
                      disabled={!lastError || isErrorDiagnosisLoading}
                      className="min-w-[120px]"
                    >
                      {isErrorDiagnosisLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          诊断中
                        </>
                      ) : (
                        <>
                          <Target className="mr-2 h-4 w-4" />
                          开始诊断
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        )}
      </div>
    </div>
  )
}