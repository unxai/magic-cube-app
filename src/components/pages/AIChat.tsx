import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Send, Bot, User, Trash2, Download, Copy } from 'lucide-react'
import { useAIStore } from '@/stores/ai-store'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

/**
 * AI 聊天页面组件
 * 提供与 AI 助手的对话功能
 */
export function AIChat() {
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  
  const { 
    sendMessage, 
    ollamaConnected, 
    availableModels, 
    currentModel, 
    setCurrentModel,
    fetchAvailableModels,
    isModelLoading 
  } = useAIStore()

  // 从本地存储加载历史对话
  useEffect(() => {
    const savedMessages = localStorage.getItem('ai-chat-history')
    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages)
        // 将timestamp字符串转换回Date对象
        const messagesWithDateObjects = parsedMessages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
        setMessages(messagesWithDateObjects)
      } catch (error) {
        console.error('Failed to load chat history:', error)
      }
    }
  }, [])

  // 当连接到Ollama时获取可用模型
  useEffect(() => {
    if (ollamaConnected) {
      fetchAvailableModels()
    }
  }, [ollamaConnected, fetchAvailableModels])

  // 保存对话历史到本地存储
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

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  /**
   * 发送消息
   */
  const handleSendMessage = async () => {
    if (!message.trim() || isLoading) {
      return
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: message.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setMessage('')
    setIsLoading(true)

    try {
      await sendMessage(userMessage.content)
      
      // sendMessage 会自动添加消息到 store，这里不需要手动添加
    } catch (error) {
      console.error('Failed to send message:', error)
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '抱歉，发送消息时出现错误。请检查网络连接或稍后重试。',
        timestamp: new Date()
      }

      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  /**
   * 清空聊天记录
   */
  const handleClearChat = () => {
    setMessages([])
    localStorage.removeItem('ai-chat-history')
  }

  /**
   * 复制消息内容
   */
  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content)
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
    <div className="h-full p-6 flex flex-col space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI 助手</h1>
          <p className="text-muted-foreground">
            与 AI 助手对话，获取 Elasticsearch 相关帮助
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={ollamaConnected ? 'default' : 'destructive'}>
            {ollamaConnected ? '已连接' : '未连接'}
          </Badge>
          
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

      {/* 聊天区域 */}
      <Card className="flex-1 flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bot className="h-5 w-5 mr-2" />
            对话
          </CardTitle>
          <CardDescription>
            您可以询问关于 Elasticsearch 的任何问题
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-0">
          {/* 消息列表 */}
          <ScrollArea className="flex-1 p-4">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center space-y-2">
                  <Bot className="h-12 w-12 mx-auto opacity-50" />
                  <p>开始与 AI 助手对话</p>
                  <p className="text-sm">您可以询问 Elasticsearch 相关的问题</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex items-start space-x-3 ${
                      msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                    }`}
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarFallback>
                        {msg.role === 'user' ? (
                          <User className="h-4 w-4" />
                        ) : (
                          <Bot className="h-4 w-4" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={`flex-1 max-w-[80%] ${
                        msg.role === 'user' ? 'text-right' : ''
                      }`}
                    >
                      <div
                        className={`rounded-lg p-3 ${
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground ml-auto'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-muted-foreground">
                          {formatTime(msg.timestamp)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                          onClick={() => handleCopyMessage(msg.content)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex items-start space-x-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback>
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="bg-muted rounded-lg p-3">
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

          <Separator />

          {/* 输入区域 */}
          <div className="p-4">
            <div className="flex items-center space-x-2">
              <Input
                ref={inputRef}
                placeholder="输入您的问题..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                disabled={isLoading || !ollamaConnected}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!message.trim() || isLoading || !ollamaConnected}
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
        </CardContent>
      </Card>
    </div>
  )
}