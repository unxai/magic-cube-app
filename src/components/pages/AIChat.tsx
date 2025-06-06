import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Send, Bot, User, Trash2, Download, Copy, ChevronDown, ArrowUp, ArrowDown } from 'lucide-react'
import { useAIStore } from '@/stores/ai-store'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { toast } from '@/hooks/use-toast'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  metadata?: {
    thinkContent?: string
    isStreaming?: boolean
    executionTime?: number
  }
}

/**
 * Think内容折叠组件
 */
function ThinkSection({ thinkContent }: { thinkContent: string }) {
  return (
    <ReactMarkdown
      components={{
        code({ node, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '')
          return match ? (
            <SyntaxHighlighter
              style={tomorrow}
              language={match[1]}
              PreTag="div"
              className="text-xs"
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          ) : (
            <code className={className} {...props}>
              {children}
            </code>
          )
        }
      }}
    >
      {thinkContent}
    </ReactMarkdown>
  )
}

/**
 * Markdown渲染组件
 */
function MarkdownMessage({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <ReactMarkdown
        components={{
          code({ node, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '')
            return match ? (
              <SyntaxHighlighter
                style={tomorrow}
                language={match[1]}
                PreTag="div"
                className="text-sm"
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            )
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

/**
 * AI 聊天页面组件
 * 提供与 AI 助手的对话功能
 */
export function AIChat() {
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showScrollButtons, setShowScrollButtons] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const {
    streamMessage,
    ollamaConnected,
    availableModels,
    currentModel,
    setCurrentModel,
    fetchAvailableModels,
    isModelLoading,
    currentSession,
    createSession,
    sessions,
    setCurrentSession,
    isGenerating
  } = useAIStore()

  // 确保有当前会话
  useEffect(() => {
    if (!currentSession) {
      // 如果有历史会话，恢复最近的会话
      if (sessions.length > 0) {
        const latestSession = sessions[0] // sessions 按创建时间倒序排列
        setCurrentSession(latestSession.id)
      } else {
        // 如果没有历史会话，创建新会话
        createSession('AI 助手对话')
      }
    }
  }, [currentSession, sessions, setCurrentSession, createSession])

  // 同步会话消息到本地状态
  useEffect(() => {
    if (currentSession?.messages) {
      const convertedMessages: Message[] = currentSession.messages.map(msg => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: new Date(msg.timestamp),
        metadata: {
          thinkContent: msg.thinkContent,
          isStreaming: msg.isStreaming,
          executionTime: msg.executionTime
        }
      }))
      setMessages(convertedMessages)
      // 如果正在生成回复，自动滚动到底部
      if (isGenerating) {
        scrollToBottom()
      }
    }
  }, [currentSession?.messages, currentSession?.updatedAt, isGenerating])

  // 当连接到Ollama时获取可用模型
  useEffect(() => {
    if (ollamaConnected) {
      fetchAvailableModels()
    }
  }, [ollamaConnected, fetchAvailableModels])

  // 保存对话历史到本地存储（可选，因为store已经持久化）
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('ai-chat-history', JSON.stringify(messages))
    }
  }, [messages])

  /**
   * 滚动到消息底部
   */
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  /**
   * 滚动到消息顶部
   */
  const scrollToTop = () => {
    if (scrollAreaRef.current) {
      const scrollableElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement
      if (scrollableElement) {
        scrollableElement.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }
  }

  /**
   * 检查是否需要显示滚动按钮
   */
  const checkScrollButtons = () => {
    if (scrollAreaRef.current) {
      // ScrollArea 组件内部的可滚动元素通常是第一个子元素
      const scrollableElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement
      if (scrollableElement) {
        const { scrollHeight, clientHeight } = scrollableElement
        setShowScrollButtons(scrollHeight > clientHeight + 100)
      }
    }
  }

  useEffect(() => {
    scrollToBottom()
    checkScrollButtons()
  }, [messages])

  useEffect(() => {
    const scrollElement = scrollAreaRef.current
    if (scrollElement) {
      const scrollableElement = scrollElement.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement
      if (scrollableElement) {
        scrollableElement.addEventListener('scroll', checkScrollButtons)
        return () => scrollableElement.removeEventListener('scroll', checkScrollButtons)
      }
    }
  }, [])

  /**
   * 发送消息
   */
  const handleSendMessage = async () => {
    if (!message.trim() || isLoading || isGenerating) {
      return
    }

    const messageContent = message.trim()
    setMessage('')
    setIsLoading(true)

    try {
      // 使用 streamMessage 实现流式输出
      await streamMessage(messageContent, currentSession?.id, (_content) => scrollToBottom())
    } catch (error) {
      console.error('Failed to send message:', error)
      toast({
        title: '发送失败',
        description: error instanceof Error ? error.message : '未知错误',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  /**
   * 清空聊天记录
   */
  const handleClearChat = () => {
    if (currentSession) {
      // 使用 store 的清空方法
      const { clearMessages } = useAIStore.getState()
      clearMessages(currentSession.id)
    }
    localStorage.removeItem('ai-chat-history')
  }

  /**
   * 复制消息内容
   */
  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content)
    toast({
      title: '复制成功',
      description: '消息内容已复制到剪贴板'
    })
  }

  /**
   * 导出聊天记录
   */
  const handleExportChat = () => {
    const chatData = {
      exportTime: new Date().toISOString(),
      messages: messages
    }

    const blob = new Blob([JSON.stringify(chatData, null, 2)], {
      type: 'application/json'
    })

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chat-export-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  /**
   * 格式化时间
   */
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="h-full flex flex-col relative">
      {/* 页面标题 */}
      <div className="flex-shrink-0 p-6 pb-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">AI 助手</h1>
            <p className="text-muted-foreground">
              与 AI 助手对话，获取 Elasticsearch 相关帮助
            </p>
          </div>
          <div className="flex items-center space-x-2">
            

            {/* 模型选择器 */}
            {ollamaConnected && availableModels.length > 0 && (
              <div className="flex items-center space-x-2">
                <Label htmlFor="model-select" className="text-sm text-muted-foreground">
                  模型:
                </Label>
                <Select
                  value={currentModel?.id || ''}
                  onValueChange={(value) => {
                    const model = availableModels.find(m => m.id === value)
                    if (model) {
                      setCurrentModel(model)
                    }
                  }}
                  disabled={isModelLoading}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder={isModelLoading ? "加载中..." : "选择模型"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableModels
                      .filter(model => model.isAvailable)
                      .map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {messages.length > 0 && (
              <>
                <Button variant="outline" size="sm" onClick={handleExportChat}>
                  <Download className="h-4 w-4 mr-2" />
                  导出
                </Button>
                <Button variant="outline" size="sm" onClick={handleClearChat}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  清空
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 聊天区域 */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* 消息列表 */}
        <ScrollArea className="flex-1 px-6" ref={scrollAreaRef}>
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center space-y-2">
                <Bot className="h-12 w-12 mx-auto opacity-50" />
                <p>开始与 AI 助手对话</p>
                <p className="text-sm">您可以询问 Elasticsearch 相关的问题</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6 py-4">
              {messages.map((msg, index) => {
                const showAvatar = index === 0 || messages[index - 1].role !== msg.role
                return (
                  <div key={msg.id} className="group">
                    <div className={`flex items-start space-x-3 ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                      }`}>
                      {/* 头像 - 只在角色切换时显示 */}
                      {showAvatar ? (
                        <Avatar className="w-8 h-8 flex-shrink-0">
                          <AvatarFallback>
                            {msg.role === 'user' ? (
                              <User className="h-4 w-4" />
                            ) : (
                              <Bot className="h-4 w-4" />
                            )}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="w-8 h-8 flex-shrink-0" />
                      )}

                      <div className={`flex flex-col flex-1 ${msg.role === 'user' ? 'items-end' : 'items-start'
                        }`}>
                        <div className={`max-w-[85%] space-y-2 ${msg.role === 'user' ? 'min-w-[200px]' : 'min-w-[300px]'
                          }`}>
                          {/* Think 内容区域 */}
                          {msg.role === 'assistant' && msg.metadata?.thinkContent && (
                            <div className="group relative">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="h-px flex-1 bg-muted-foreground/20" />
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                                onClick={() => {
                                  const thinkEl = document.getElementById(`think-${msg.id}`);
                                  if (thinkEl) {
                                    thinkEl.classList.toggle('hidden');
                                  }
                                }}
                              >
                                <ChevronDown className="h-3 w-3 mr-1" />
                                思考过程
                              </Button>
                              <div className="h-px flex-1 bg-muted-foreground/20" />
                            </div>
                            <div id={`think-${msg.id}`} className="rounded-lg bg-secondary/50 p-3 text-sm text-muted-foreground">
                              <ThinkSection thinkContent={msg.metadata.thinkContent} />
                            </div>
                          </div>
                          )}

                          {/* 主要回答内容 */}
                          <div className={`rounded-lg p-4 ${msg.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                            }`}>
                            {msg.role === 'user' ? (
                              <p className="whitespace-pre-wrap break-words leading-relaxed">
                                {msg.content}
                              </p>
                            ) : (
                              <div className="prose prose-sm max-w-none dark:prose-invert">
                                <div className="relative">
                                  <MarkdownMessage content={msg.content} />
                                </div>
                              </div>
                            )}

                          </div>
                        </div>

                        {/* 消息元信息 */}
                        <div className={`flex items-center mt-2 space-x-2 ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                          }`}>
                          <span className="text-xs text-muted-foreground">
                            {formatTime(msg.timestamp)}
                          </span>
                          {msg.metadata?.executionTime && (
                            <span className="text-xs text-muted-foreground">
                              {msg.metadata.executionTime}ms
                            </span>
                          )}
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
                )
              })}

              {/* 加载状态 */}
              {(isLoading || isGenerating) && (
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
          )}
        </ScrollArea>

        {/* 滚动按钮 */}
        {showScrollButtons && (
          <div className="absolute right-6 bottom-24 flex flex-col space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 rounded-full shadow-lg"
              onClick={scrollToTop}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 rounded-full shadow-lg"
              onClick={scrollToBottom}
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* 固定输入区域 */}
      <div className="flex-shrink-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="p-6">
          <div className="flex items-center space-x-2">
            <Input
              ref={inputRef}
              placeholder="输入您的问题..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              disabled={isLoading || isGenerating || !ollamaConnected}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!message.trim() || isLoading || isGenerating || !ollamaConnected}
              size="sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          {!ollamaConnected && (
            <p className="text-sm text-muted-foreground mt-2">
              请检查 AI 服务连接状态
            </p>
          )}
        </div>
      </div>
    </div>
  )
}