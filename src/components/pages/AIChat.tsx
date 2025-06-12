import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Send, Bot, User, Trash2, Download, Copy, ChevronDown, ArrowUp, ArrowDown, Brain } from 'lucide-react'
import { useAIStore } from '@/stores/ai-store'

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
    <div className="relative">
      <div className="absolute top-0 right-0 p-1 opacity-30">
        <Brain className="h-4 w-4" />
      </div>
      <ReactMarkdown
        components={{
          code({ node, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '')
            return match ? (
              <SyntaxHighlighter
                style={tomorrow}
                language={match[1]}
                PreTag="div"
                className="text-xs my-2"
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code className={`${className} bg-secondary/70 px-1 py-0.5 rounded`} {...props}>
                {children}
              </code>
            )
          },
          table({ children, ...props }) {
            return (
              <div className="overflow-x-auto my-4">
                <table className="min-w-full border-collapse border border-border" {...props}>
                  {children}
                </table>
              </div>
            )
          },
          thead({ children, ...props }) {
            return (
              <thead className="bg-muted" {...props}>
                {children}
              </thead>
            )
          },
          tbody({ children, ...props }) {
            return (
              <tbody {...props}>
                {children}
              </tbody>
            )
          },
          tr({ children, ...props }) {
            return (
              <tr className="border-b border-border hover:bg-muted/50" {...props}>
                {children}
              </tr>
            )
          },
          th({ children, ...props }) {
            return (
              <th className="border border-border px-3 py-2 text-left font-semibold" {...props}>
                {children}
              </th>
            )
          },
          td({ children, ...props }) {
            return (
              <td className="border border-border px-3 py-2" {...props}>
                {children}
              </td>
            )
          },
          blockquote({ children, ...props }) {
            return (
              <blockquote className="border-l-4 border-primary/50 pl-4 my-4 italic text-muted-foreground" {...props}>
                {children}
              </blockquote>
            )
          },
          ul({ children, ...props }) {
            return (
              <ul className="list-disc list-inside my-2 space-y-1" {...props}>
                {children}
              </ul>
            )
          },
          ol({ children, ...props }) {
            return (
              <ol className="list-decimal list-inside my-2 space-y-1" {...props}>
                {children}
              </ol>
            )
          },
          li({ children, ...props }) {
            return (
              <li className="ml-2" {...props}>
                {children}
              </li>
            )
          }
        }}
      >
        {thinkContent}
      </ReactMarkdown>
    </div>
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
                className="text-xs my-2"
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code className={`${className} bg-secondary/70 px-1 py-0.5 rounded`} {...props}>
                {children}
              </code>
            )
          },
          table({ children, ...props }) {
            return (
              <div className="overflow-x-auto my-4">
                <table className="min-w-full border-collapse border border-border" {...props}>
                  {children}
                </table>
              </div>
            )
          },
          thead({ children, ...props }) {
            return (
              <thead className="bg-muted" {...props}>
                {children}
              </thead>
            )
          },
          tbody({ children, ...props }) {
            return (
              <tbody {...props}>
                {children}
              </tbody>
            )
          },
          tr({ children, ...props }) {
            return (
              <tr className="border-b border-border hover:bg-muted/50" {...props}>
                {children}
              </tr>
            )
          },
          th({ children, ...props }) {
            return (
              <th className="border border-border px-3 py-2 text-left font-semibold" {...props}>
                {children}
              </th>
            )
          },
          td({ children, ...props }) {
            return (
              <td className="border border-border px-3 py-2" {...props}>
                {children}
              </td>
            )
          },
          blockquote({ children, ...props }) {
            return (
              <blockquote className="border-l-4 border-primary/50 pl-4 my-4 italic text-muted-foreground" {...props}>
                {children}
              </blockquote>
            )
          },
          ul({ children, ...props }) {
            return (
              <ul className="list-disc list-inside my-2 space-y-1" {...props}>
                {children}
              </ul>
            )
          },
          ol({ children, ...props }) {
            return (
              <ol className="list-decimal list-inside my-2 space-y-1" {...props}>
                {children}
              </ol>
            )
          },
          li({ children, ...props }) {
            return (
              <li className="ml-2" {...props}>
                {children}
              </li>
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
  const [expandedThinks, setExpandedThinks] = useState<Record<string, boolean>>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const {
    streamMessage,
    ollamaConnected,
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
      
      // 初始化新消息的思考过程为展开状态
      const newExpandedState = { ...expandedThinks }
      convertedMessages.forEach(msg => {
        if (msg.role === 'assistant' && msg.metadata?.thinkContent && !Object.prototype.hasOwnProperty.call(expandedThinks, msg.id)) {
          newExpandedState[msg.id] = true // 默认展开新消息的思考过程
        }
      })
      setExpandedThinks(newExpandedState)
      
      // 如果正在生成回复，自动滚动到底部
      if (isGenerating) {
        scrollToBottom()
      }
    }
  }, [currentSession?.messages, currentSession?.updatedAt, isGenerating, expandedThinks])

  // AI连接状态检查
  useEffect(() => {
    // 这里可以添加其他初始化逻辑
  }, [ollamaConnected])

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

  /**
   * 切换思考过程的展开/折叠状态
   */
  const toggleThink = (id: string) => {
    setExpandedThinks(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
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
                    <div className={`flex items-start space-x-3 ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
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

                      <div className={`flex flex-col flex-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[85%] space-y-2 ${msg.role === 'user' ? 'min-w-[200px]' : 'min-w-[300px]'}`}>
                          {/* Think 内容区域 */}
                          {msg.role === 'assistant' && msg.metadata?.thinkContent && (
                            <div className="group relative">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="h-px flex-1 bg-muted-foreground/20" />
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 px-2 text-xs bg-secondary/30 hover:bg-secondary/50 border-secondary"
                                onClick={() => toggleThink(msg.id)}
                              >
                                {expandedThinks[msg.id] ? (
                                  <ChevronDown className="h-3 w-3 mr-1 transition-transform duration-200" />
                                ) : (
                                  <ChevronDown className="h-3 w-3 mr-1 -rotate-90 transition-transform duration-200" />
                                )}
                                思考过程
                              </Button>
                              <div className="h-px flex-1 bg-muted-foreground/20" />
                            </div>
                            <div 
                              className={`rounded-lg bg-secondary/50 p-3 text-sm text-muted-foreground border border-secondary/70 shadow-inner border-l-4 border-l-primary/70 overflow-hidden transition-all duration-300 ${expandedThinks[msg.id] ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0 p-0 border-0'}`}
                            >
                              <ThinkSection thinkContent={msg.metadata.thinkContent} />
                            </div>
                          </div>
                          )}

                          {/* 主要回答内容 */}
                          <div className={`rounded-lg p-4 ${msg.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted border border-secondary/70 shadow-inner border-l-4 border-l-primary/70'
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
                          
                          {/* 加载状态 - 放在文字下方 */}
                          {(isLoading || isGenerating) && msg.role === 'assistant' && index === messages.length - 1 && (
                            <div className="mt-2 p-2 max-w-[100px]">
                              <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-current rounded-full animate-bounce" />
                                <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                                <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* 消息元信息 */}
                        <div className={`flex items-center mt-2 space-x-2 ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
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