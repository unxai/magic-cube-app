import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * AI 模型配置
 */
export interface AIModel {
  id: string
  name: string
  description: string
  provider: 'ollama' | 'openai' | 'anthropic'
  modelName: string
  isAvailable: boolean
  parameters?: {
    temperature?: number
    maxTokens?: number
    topP?: number
    topK?: number
  }
}

/**
 * 聊天消息
 */
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  metadata?: {
    query?: string
    generatedDSL?: string
    executionTime?: number
    error?: string
    isStreaming?: boolean
    thinkContent?: string
  }
}

/**
 * 聊天会话
 */
export interface ChatSession {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
  model: string
}

/**
 * AI 功能类型
 */
export type AIFeature =
  | 'query-generation'    // 查询生成
  | 'data-analysis'       // 数据分析
  | 'query-optimization'  // 查询优化
  | 'error-explanation'   // 错误解释
  | 'general-chat'        // 通用聊天

/**
 * AI 状态接口
 */
interface AIState {
  // 模型管理
  availableModels: AIModel[]
  currentModel: AIModel | null
  isModelLoading: boolean

  // 聊天会话
  sessions: ChatSession[]
  currentSession: ChatSession | null

  // 当前对话状态
  isGenerating: boolean
  currentFeature: AIFeature

  // Ollama 连接状态
  ollamaConnected: boolean
  ollamaHost: string
  ollamaPort: number

  // 错误状态
  error: string | null
}

/**
 * AI 操作接口
 */
interface AIActions {
  // 模型管理
  setAvailableModels: (models: AIModel[]) => void
  setCurrentModel: (model: AIModel | null) => void
  fetchAvailableModels: () => Promise<void>

  // 会话管理
  createSession: (title?: string, model?: string) => ChatSession
  deleteSession: (sessionId: string) => void
  setCurrentSession: (session: ChatSession | null) => void
  updateSessionTitle: (sessionId: string, title: string) => void

  // 消息管理
  addMessage: (sessionId: string, message: Omit<ChatMessage, 'timestamp'>) => void
  updateMessage: (sessionId: string, messageId: string, updates: Partial<ChatMessage>) => void
  clearMessages: (sessionId: string) => void

  // AI 交互
  sendMessage: (content: string, feature?: AIFeature) => Promise<void>
  generateDSLQuery: (naturalLanguage: string, context?: any) => Promise<string>
  analyzeData: (data: any, question: string) => Promise<string>
  optimizeQuery: (query: string) => Promise<string>
  explainError: (error: string, context?: any) => Promise<string>

  // Ollama 连接
  connectToOllama: (host?: string, port?: number) => Promise<void>
  disconnectFromOllama: () => void
  testOllamaConnection: () => Promise<boolean>

  // 功能设置
  setCurrentFeature: (feature: AIFeature) => void

  // 错误处理
  setError: (error: string | null) => void
  clearError: () => void
}

/**
 * AI Store 类型
 */
export type AIStore = AIState & AIActions

/**
 * 初始状态
 */
const initialState: AIState = {
  availableModels: [],
  currentModel: null,
  isModelLoading: false,
  sessions: [],
  currentSession: null,
  isGenerating: false,
  currentFeature: 'general-chat',
  ollamaConnected: false,
  ollamaHost: 'localhost',
  ollamaPort: 11434,
  error: null,
}

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 11)
}

/**
 * 默认可用模型
 */
const defaultModels: AIModel[] = [
  {
    id: 'llama2',
    name: 'Llama 2',
    description: '强大的开源大语言模型，适合通用对话和代码生成',
    provider: 'ollama',
    modelName: 'llama2',
    isAvailable: false,
    parameters: {
      temperature: 0.7,
      maxTokens: 2048,
    },
  },
  {
    id: 'mistral',
    name: 'Mistral',
    description: '高效的开源模型，在代码和推理任务上表现优秀',
    provider: 'ollama',
    modelName: 'mistral',
    isAvailable: false,
    parameters: {
      temperature: 0.5,
      maxTokens: 4096,
    },
  },
  {
    id: 'codellama',
    name: 'Code Llama',
    description: '专门针对代码生成和理解优化的模型',
    provider: 'ollama',
    modelName: 'codellama',
    isAvailable: false,
    parameters: {
      temperature: 0.3,
      maxTokens: 4096,
    },
  },
]

/**
 * AI 状态管理 Store
 */
export const useAIStore = create<AIStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      availableModels: defaultModels,

      // 模型管理
      setAvailableModels: (models) => {
        set({ availableModels: models })
      },

      setCurrentModel: (model) => {
        set({ currentModel: model })
      },

      fetchAvailableModels: async () => {
        set({ isModelLoading: true })

        try {
          const { ollamaHost, ollamaPort } = get()
          const response = await fetch(`http://${ollamaHost}:${ollamaPort}/api/tags`)
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }

          const data = await response.json()
          const ollamaModels = data.models || []

          // 将 Ollama 模型转换为我们的模型格式
          const availableModels: AIModel[] = ollamaModels.map((model: any) => ({
            id: model.name,
            name: model.name,
            description: `Ollama 模型: ${model.name}`,
            provider: 'ollama' as const,
            modelName: model.name,
            isAvailable: true,
            parameters: {
              temperature: 0.7,
              maxTokens: 2048,
            },
          }))

          // 如果没有获取到模型，使用默认模型但标记为不可用
          const modelsToSet = availableModels.length > 0 
            ? availableModels 
            : defaultModels.map(model => ({ ...model, isAvailable: false }))

          set({
            availableModels: modelsToSet,
            isModelLoading: false,
            error: null
          })

        } catch (error) {
          console.error('获取 Ollama 模型失败:', error)
          
          // 连接失败时使用默认模型但标记为不可用
          const unavailableModels = defaultModels.map(model => ({
            ...model,
            isAvailable: false
          }))

          set({
            availableModels: unavailableModels,
            isModelLoading: false,
            error: `获取模型列表失败: ${error instanceof Error ? error.message : '未知错误'}`,
            ollamaConnected: false
          })
        }
      },

      // 会话管理
      createSession: (title, model) => {
        const session: ChatSession = {
          id: generateId(),
          title: title || `会话 ${new Date().toLocaleString()}`,
          messages: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          model: model || get().currentModel?.id || 'llama2',
        }

        set((state) => ({
          sessions: [session, ...state.sessions],
          currentSession: session,
        }))

        return session
      },

      deleteSession: (sessionId) => {
        set((state) => {
          const newSessions = state.sessions.filter(s => s.id !== sessionId)
          const newCurrentSession = state.currentSession?.id === sessionId
            ? (newSessions[0] || null)
            : state.currentSession

          return {
            sessions: newSessions,
            currentSession: newCurrentSession,
          }
        })
      },

      setCurrentSession: (session) => {
        set({ currentSession: session })
      },

      updateSessionTitle: (sessionId, title) => {
        set((state) => ({
          sessions: state.sessions.map(session =>
            session.id === sessionId
              ? { ...session, title, updatedAt: new Date().toISOString() }
              : session
          ),
          currentSession: state.currentSession?.id === sessionId
            ? { ...state.currentSession, title, updatedAt: new Date().toISOString() }
            : state.currentSession,
        }))
      },

      // 消息管理
      /**
       * 添加消息到指定会话
       * @param sessionId 会话ID
       * @param messageData 消息数据（可选包含id，不包含timestamp）
       */
      addMessage: (sessionId, messageData) => {
        const message: ChatMessage = {
          ...messageData,
          id: messageData.id || generateId(),
          timestamp: new Date().toISOString(),
        }

        set((state) => ({
          sessions: state.sessions.map(session =>
            session.id === sessionId
              ? {
                ...session,
                messages: [...session.messages, message],
                updatedAt: new Date().toISOString(),
              }
              : session
          ),
          currentSession: state.currentSession?.id === sessionId
            ? {
              ...state.currentSession,
              messages: [...state.currentSession.messages, message],
              updatedAt: new Date().toISOString(),
            }
            : state.currentSession,
        }))
      },

      updateMessage: (sessionId, messageId, updates) => {
        set((state) => ({
          sessions: state.sessions.map(session =>
            session.id === sessionId
              ? {
                ...session,
                messages: session.messages.map(msg =>
                  msg.id === messageId ? { ...msg, ...updates } : msg
                ),
                updatedAt: new Date().toISOString(),
              }
              : session
          ),
          currentSession: state.currentSession?.id === sessionId
            ? {
              ...state.currentSession,
              messages: state.currentSession.messages.map(msg =>
                msg.id === messageId ? { ...msg, ...updates } : msg
              ),
              updatedAt: new Date().toISOString(),
            }
            : state.currentSession,
        }))
      },

      clearMessages: (sessionId) => {
        set((state) => ({
          sessions: state.sessions.map(session =>
            session.id === sessionId
              ? {
                ...session,
                messages: [],
                updatedAt: new Date().toISOString(),
              }
              : session
          ),
          currentSession: state.currentSession?.id === sessionId
            ? {
              ...state.currentSession,
              messages: [],
              updatedAt: new Date().toISOString(),
            }
            : state.currentSession,
        }))
      },

      // AI 交互
      sendMessage: async (content, feature = 'general-chat') => {
        const { currentSession, currentModel, ollamaConnected, ollamaHost, ollamaPort } = get()

        if (!currentSession) {
          get().createSession()
        }

        const sessionId = get().currentSession!.id

        // 添加用户消息
        get().addMessage(sessionId, {
          id:generateId(),
          role: 'user',
          content,
        })

        set({ isGenerating: true, currentFeature: feature })

        try {
          if (!ollamaConnected || !currentModel) {
            throw new Error('AI 服务未连接或未选择模型')
          }

          // 创建一个空的助手消息用于流式更新
          const assistantMessageId = generateId()
          get().addMessage(sessionId, {
            id: assistantMessageId,
            role: 'assistant',
            content: '',
            metadata: {
              query: content,
              isStreaming: true,
            },
          })

          // 调用 Ollama API 流式输出
          const response = await fetch(`http://${ollamaHost}:${ollamaPort}/api/generate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: currentModel.modelName,
              prompt: content,
              stream: true,
              options: {
                temperature: currentModel.parameters?.temperature || 0.7,
                num_predict: currentModel.parameters?.maxTokens || 2048,
              }
            })
          })

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }

          const reader = response.body?.getReader()
          if (!reader) {
            throw new Error('无法获取响应流')
          }

          const decoder = new TextDecoder()
          let fullResponse = ''
          let isThinking = false
          let thinkContent = ''
          let displayContent = ''

          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value)
            const lines = chunk.split('\n').filter(line => line.trim())

            for (const line of lines) {
              try {
                const data = JSON.parse(line)
                if (data.response) {
                  fullResponse += data.response
                  
                  // 处理 <think> 标签
                  const thinkRegex = /<think>([\s\S]*?)<\/think>/g
                  let match
                  let processedContent = fullResponse
                  
                  // 移除所有 <think> 内容
                  while ((match = thinkRegex.exec(fullResponse)) !== null) {
                    thinkContent += match[1]
                    processedContent = processedContent.replace(match[0], '')
                  }
                  
                  // 检查是否在 <think> 标签内
                  const openThinkIndex = fullResponse.lastIndexOf('<think>')
                  const closeThinkIndex = fullResponse.lastIndexOf('</think>')
                  isThinking = openThinkIndex > closeThinkIndex
                  
                  if (isThinking) {
                    // 如果在思考中，只显示 <think> 之前的内容
                    const beforeThink = fullResponse.substring(0, openThinkIndex)
                    displayContent = beforeThink.replace(/<think>[\s\S]*?<\/think>/g, '')
                  } else {
                    // 显示处理后的内容（移除所有think标签）
                    displayContent = processedContent
                  }
                  
                  // 更新消息内容
                  get().updateMessage(sessionId, assistantMessageId, {
                    content: displayContent,
                    metadata: {
                      query: content,
                      isStreaming: !data.done,
                      thinkContent: thinkContent || undefined,
                    },
                  })
                }
                
                if (data.done) {
                  // 流式输出完成，最终处理
                  const finalContent = displayContent || '抱歉，AI 没有返回有效响应。'
                  get().updateMessage(sessionId, assistantMessageId, {
                    content: finalContent,
                    metadata: {
                      query: content,
                      executionTime: data.total_duration ? Math.round(data.total_duration / 1000000) : undefined,
                      thinkContent: thinkContent || undefined,
                      isStreaming: false,
                    },
                  })
                  break
                }
              } catch (parseError) {
                console.warn('解析流式响应失败:', parseError)
              }
            }
          }

        } catch (error) {
          console.error('AI 响应生成失败:', error)
          
          get().addMessage(sessionId, {
            id: generateId(),
            role: 'assistant',
            content: '抱歉，生成响应时出现错误。请检查网络连接或稍后重试。',
            metadata: {
              error: error instanceof Error ? error.message : '未知错误',
            },
          })
        } finally {
          set({ isGenerating: false })
        }
      },

      generateDSLQuery: async (naturalLanguage, _context) => {
        set({ isGenerating: true })

        try {
          // 这里应该实现实际的 DSL 生成逻辑
          await new Promise(resolve => setTimeout(resolve, 1500))

          // 模拟生成的 DSL 查询
          const dslQuery = `{
  "query": {
    "match": {
      "message": "${naturalLanguage}"
    }
  }
}`

          return dslQuery

        } catch (error) {
          throw new Error('DSL 查询生成失败')
        } finally {
          set({ isGenerating: false })
        }
      },

      analyzeData: async (_data, _question) => {
        set({ isGenerating: true })

        try {
          await new Promise(resolve => setTimeout(resolve, 2000))

          return `基于提供的数据，针对问题 "${_question}" 的分析结果：\n\n这是一个模拟的数据分析响应。在实际实现中，AI 会分析数据并提供详细的洞察。`

        } catch (error) {
          throw new Error('数据分析失败')
        } finally {
          set({ isGenerating: false })
        }
      },

      optimizeQuery: async (query) => {
        set({ isGenerating: true })

        try {
          await new Promise(resolve => setTimeout(resolve, 1000))

          return `// 优化后的查询\n${query}\n\n// 优化建议：\n// 1. 添加了适当的过滤条件\n// 2. 优化了排序逻辑\n// 3. 减少了不必要的字段`

        } catch (error) {
          throw new Error('查询优化失败')
        } finally {
          set({ isGenerating: false })
        }
      },

      explainError: async (error, _context) => {
        set({ isGenerating: true })

        try {
          await new Promise(resolve => setTimeout(resolve, 1000))

          return `错误解释：\n\n错误信息：${error}\n\n可能的原因：\n1. 查询语法错误\n2. 索引不存在\n3. 权限不足\n\n建议的解决方案：\n1. 检查查询语法\n2. 验证索引名称\n3. 确认连接权限`

        } catch (error) {
          throw new Error('错误解释失败')
        } finally {
          set({ isGenerating: false })
        }
      },

      // Ollama 连接
      connectToOllama: async (host = 'localhost', port = 11434) => {
        try {
          // 先更新连接配置
          set({
            ollamaHost: host,
            ollamaPort: port,
            error: null,
          })

          // 测试连接
          const response = await fetch(`http://${host}:${port}/api/tags`)
          
          if (!response.ok) {
            throw new Error(`无法连接到 Ollama 服务器: HTTP ${response.status}`)
          }

          // 连接成功
          set({
            ollamaConnected: true,
          })

          // 连接成功后获取可用模型
          await get().fetchAvailableModels()

        } catch (error) {
          console.error('Ollama 连接失败:', error)
          set({
            ollamaConnected: false,
            error: `Ollama 连接失败: ${error instanceof Error ? error.message : '未知错误'}`,
          })
          throw error
        }
      },

      disconnectFromOllama: () => {
        set({
          ollamaConnected: false,
          currentModel: null,
          availableModels: defaultModels,
        })
      },

      testOllamaConnection: async () => {
        try {
          const { ollamaHost, ollamaPort } = get()
          const response = await fetch(`http://${ollamaHost}:${ollamaPort}/api/tags`, {
            method: 'GET',
            signal: AbortSignal.timeout(5000) // 5秒超时
          })
          
          return response.ok
        } catch (error) {
          console.error('Ollama 连接测试失败:', error)
          return false
        }
      },

      // 功能设置
      setCurrentFeature: (feature) => {
        set({ currentFeature: feature })
      },

      // 错误处理
      setError: (error) => {
        set({ error })
      },

      clearError: () => {
        set({ error: null })
      },
    }),
    {
      name: 'magic-cube-ai-store',
      // 持久化会话、模型配置、连接状态和 Ollama 设置
      partialize: (state) => ({
        sessions: state.sessions,
        currentSession: state.currentSession,
        currentModel: state.currentModel,
        ollamaConnected: state.ollamaConnected,
        ollamaHost: state.ollamaHost,
        ollamaPort: state.ollamaPort,
      }),
    }
  )
)