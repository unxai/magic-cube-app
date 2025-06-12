import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

// AI模型接口
interface AIModel {
  id: string
  name: string
  modelName: string
  displayName: string
  description?: string
  size?: string
  parameters?: string
  isAvailable?: boolean
}

// AI聊天消息接口
interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  isStreaming?: boolean
  thinkContent?: string
  executionTime?: number
}

// AI聊天会话接口
interface ChatSession {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: Date
  updatedAt: Date
}

// AI Store状态接口
interface AIState {
  // 连接状态
  isConnected: boolean
  isConnecting: boolean
  connectionError: string | null
  ollamaConnected: boolean
  
  // Ollama配置
  ollamaHost: string
  ollamaPort: number
  
  // 模型管理
  availableModels: AIModel[]
  currentModel: AIModel | null
  isLoadingModels: boolean
  isModelLoading: boolean
  
  // 聊天功能
  chatSessions: ChatSession[]
  currentSessionId: string | null
  currentSession: ChatSession | null
  sessions: ChatSession[]
  isGenerating: boolean
  

}

// AI Store动作接口
interface AIActions {
  // 连接管理
  connect: () => Promise<void>
  connectToOllama: (host: string, port: number) => Promise<void>
  disconnect: () => void
  setOllamaConfig: (host: string, port: number) => void
  
  // 模型管理
  loadModels: () => Promise<void>
  fetchAvailableModels: () => Promise<void>
  selectModel: (model: AIModel) => void
  setCurrentModel: (model: AIModel) => void
  
  // 聊天功能
  createSession: (title?: string) => string
  selectSession: (sessionId: string) => void
  setCurrentSession: (sessionId: string) => void
  deleteSession: (sessionId: string) => void
  sendMessage: (content: string, sessionId?: string) => Promise<void>
  streamMessage: (content: string, sessionId?: string, onUpdate?: (content: string) => void) => Promise<void>
  clearSessions: () => void
  clearMessages: (sessionId: string) => void
  

}

type AIStore = AIState & AIActions

/**
 * 创建AI Store
 * 使用persist中间件进行数据持久化，确保聊天历史记录在页面刷新后不丢失
 */
export const useAIStore = create<AIStore>()(devtools(
  persist(
    (set, get) => {
      // 辅助函数：更新计算属性
      const updateComputedProperties = () => {
        const state = get()
        const currentSession = state.chatSessions.find(s => s.id === state.currentSessionId) || null
        const sessions = state.chatSessions
        set({ currentSession, sessions })
      }

      // 初始化时更新计算属性
      setTimeout(() => updateComputedProperties(), 0)

      return {
        // 初始状态
        isConnected: false,
        isConnecting: false,
        connectionError: null,
        ollamaConnected: false,
        ollamaHost: 'localhost',
        ollamaPort: 11434,
        availableModels: [],
        currentModel: null,
        isLoadingModels: false,
        isModelLoading: false,
        chatSessions: [],
        currentSessionId: null,
        currentSession: null as ChatSession | null,
        sessions: [] as ChatSession[],
        isGenerating: false,

        // 连接管理
        connect: async () => {
          set({ isConnecting: true, connectionError: null })
          
          try {
            const { ollamaHost, ollamaPort } = get()
            const response = await fetch(`http://${ollamaHost}:${ollamaPort}/api/tags`)
            
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`)
            }
            
            set({ isConnected: true, isConnecting: false, ollamaConnected: true })
            
            // 自动加载模型列表
            await get().loadModels()
            
          } catch (error) {
            set({ 
              isConnected: false, 
              isConnecting: false,
              ollamaConnected: false,
              connectionError: error instanceof Error ? error.message : '连接失败'
            })
            throw error
          }
        },

        connectToOllama: async (host: string, port: number) => {
          set({ ollamaHost: host, ollamaPort: port })
          await get().connect()
        },

        disconnect: () => {
          set({ 
            isConnected: false, 
            ollamaConnected: false,
            connectionError: null,
            availableModels: [],
            currentModel: null
          })
        },

        setOllamaConfig: (host: string, port: number) => {
          set({ ollamaHost: host, ollamaPort: port })
        },

        // 模型管理
        loadModels: async () => {
          const { ollamaHost, ollamaPort } = get()
          set({ isLoadingModels: true, isModelLoading: true })
          
          try {
            const response = await fetch(`http://${ollamaHost}:${ollamaPort}/api/tags`)
            
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`)
            }
            
            const data = await response.json()
            const models: AIModel[] = data.models?.map((model: any) => ({
              id: model.name,
              name: model.name,
              modelName: model.name,
              displayName: model.name,
              description: model.details?.family || '',
              size: model.size ? `${(model.size / 1024 / 1024 / 1024).toFixed(1)}GB` : '',
              parameters: model.details?.parameter_size || '',
              isAvailable: true
            })) || []
            
            set({ availableModels: models, isLoadingModels: false, isModelLoading: false })
            
            // 如果没有选择模型且有可用模型，自动选择第一个
            if (!get().currentModel && models.length > 0) {
              set({ currentModel: models[0] })
            }
            
          } catch (error) {
            set({ isLoadingModels: false, isModelLoading: false })
            throw error
          }
        },

        fetchAvailableModels: async () => {
          await get().loadModels()
        },

        selectModel: (model: AIModel) => {
          set({ currentModel: model })
        },

        setCurrentModel: (model: AIModel) => {
          set({ currentModel: model })
        },

        // 聊天功能
        createSession: (title?: string) => {
          const sessionId = `session_${Date.now()}`
          const newSession: ChatSession = {
            id: sessionId,
            title: title || `对话 ${new Date().toLocaleString()}`,
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date()
          }
          
          set(state => ({
            chatSessions: [newSession, ...state.chatSessions],
            currentSessionId: sessionId
          }))
          
          updateComputedProperties()
          return sessionId
        },

        selectSession: (sessionId: string) => {
          set({ currentSessionId: sessionId })
          updateComputedProperties()
        },

        setCurrentSession: (sessionId: string) => {
          set({ currentSessionId: sessionId })
          updateComputedProperties()
        },

        deleteSession: (sessionId: string) => {
          set(state => {
            const newSessions = state.chatSessions.filter(s => s.id !== sessionId)
            const newCurrentSessionId = state.currentSessionId === sessionId 
              ? (newSessions.length > 0 ? newSessions[0].id : null)
              : state.currentSessionId
            
            return {
              chatSessions: newSessions,
              currentSessionId: newCurrentSessionId
            }
          })
          updateComputedProperties()
        },

        sendMessage: async (content: string, sessionId?: string) => {
          const { currentSessionId, currentModel, ollamaHost, ollamaPort } = get()
          const targetSessionId = sessionId || currentSessionId
          
          if (!targetSessionId) {
            throw new Error('没有活动的聊天会话')
          }
          
          if (!currentModel) {
            throw new Error('未选择AI模型')
          }
          
          // 添加用户消息
          const userMessage: ChatMessage = {
            id: `msg_${Date.now()}_user`,
            role: 'user',
            content,
            timestamp: new Date()
          }
          
          set(state => ({
            chatSessions: state.chatSessions.map(session => 
              session.id === targetSessionId
                ? { ...session, messages: [...session.messages, userMessage], updatedAt: new Date() }
                : session
            ),
            isGenerating: true
          }))
          updateComputedProperties()
          
          try {
            // 获取会话历史
            const session = get().chatSessions.find(s => s.id === targetSessionId)
            const messages = session?.messages || []
            
            // 构建对话上下文
            const prompt = messages.map(msg => 
              `${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`
            ).join('\n\n') + '\n\nAssistant: '
            
            const response = await fetch(`http://${ollamaHost}:${ollamaPort}/api/generate`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: currentModel.modelName,
                prompt,
                stream: false
              })
            })
            
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`)
            }
            
            const data = await response.json()
            
            // 添加AI回复
            const assistantMessage: ChatMessage = {
              id: `msg_${Date.now()}_assistant`,
              role: 'assistant',
              content: data.response || '抱歉，我无法生成回复。',
              timestamp: new Date()
            }
            
            set(state => ({
              chatSessions: state.chatSessions.map(session => 
                session.id === targetSessionId
                  ? { ...session, messages: [...session.messages, assistantMessage], updatedAt: new Date() }
                  : session
              ),
              isGenerating: false
            }))
            updateComputedProperties()
            
          } catch (error) {
            set({ isGenerating: false })
            throw error
          }
        },

        streamMessage: async (content: string, sessionId?: string, onUpdate?: (content: string) => void) => {
          const { currentSessionId, currentModel, ollamaHost, ollamaPort } = get()
          const targetSessionId = sessionId || currentSessionId
          
          if (!targetSessionId) {
            throw new Error('没有活动的聊天会话')
          }
          
          if (!currentModel) {
            throw new Error('未选择AI模型')
          }
          
          // 添加用户消息
          const userMessage: ChatMessage = {
            id: `msg_${Date.now()}_user`,
            role: 'user',
            content,
            timestamp: new Date()
          }
          
          // 创建流式AI消息
          const assistantMessageId = `msg_${Date.now()}_assistant`
          const assistantMessage: ChatMessage = {
              id: assistantMessageId,
              role: 'assistant',
              content: '',
              timestamp: new Date(),
              isStreaming: true
            }
          
          set(state => {
            const newState = {
              chatSessions: state.chatSessions.map(session => 
                session.id === targetSessionId
                  ? { 
                      ...session, 
                      messages: [...session.messages, userMessage, assistantMessage], 
                      updatedAt: new Date() 
                    }
                  : session
              ),
              isGenerating: true
            }
            updateComputedProperties()
            return newState
          })
          
          try {
            // 获取会话历史
            const session = get().chatSessions.find(s => s.id === targetSessionId)
            const messages = session?.messages.slice(0, -1) || [] // 排除刚添加的空助手消息
            
            // 构建对话上下文
            const prompt = messages.map(msg => 
              `${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`
            ).join('\n\n') + '\n\nAssistant: '
            
            const response = await fetch(`http://${ollamaHost}:${ollamaPort}/api/generate`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: currentModel.modelName,
                prompt,
                stream: true
              })
            })
            
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`)
            }
            
            const reader = response.body?.getReader()
            const decoder = new TextDecoder()
            let fullContent = ''
            
            if (reader) {
              while (true) {
                const { done, value } = await reader.read()
                if (done) break
                
                const chunk = decoder.decode(value)
                const lines = chunk.split('\n').filter(line => line.trim())
                
                for (const line of lines) {
                  try {
                    const data = JSON.parse(line)
                    if (data.response) {
                      fullContent += data.response
                      
                      // 更新消息内容
                      set(state => {
                        const newState = {
                          chatSessions: state.chatSessions.map(session => 
                            session.id === targetSessionId
                              ? {
                                  ...session,
                                  messages: session.messages.map(msg => 
                                    msg.id === assistantMessageId
                                      ? { ...msg, content: fullContent }
                                      : msg
                                  ),
                                  updatedAt: new Date()
                                }
                              : session
                          )
                        }
                        // 确保计算属性更新
                        updateComputedProperties()
                        return newState
                      })
                      
                      // 调用更新回调
                      onUpdate?.(fullContent)
                    }
                  } catch {
                    // 忽略解析错误的行
                  }
                }
              }
            }
            
            // 完成流式传输
            set(state => {
              const newState = {
                chatSessions: state.chatSessions.map(session => 
                  session.id === targetSessionId
                    ? {
                        ...session,
                        messages: session.messages.map(msg => 
                          msg.id === assistantMessageId
                            ? { ...msg, isStreaming: false }
                            : msg
                        ),
                        updatedAt: new Date()
                      }
                    : session
                ),
                isGenerating: false
              }
              // 确保计算属性更新
              updateComputedProperties()
              return newState
            })
            
          } catch (error) {
            set({ isGenerating: false })
            throw error
          }
        },

        clearSessions: () => {
          set({ 
            chatSessions: [], 
            currentSessionId: null,
            currentSession: null,
            sessions: []
          })
        },

        clearMessages: (sessionId: string) => {
          set(state => ({
            chatSessions: state.chatSessions.map(session => 
              session.id === sessionId
                ? { ...session, messages: [], updatedAt: new Date() }
                : session
            )
          }))
          updateComputedProperties()
        },

      }
    },
    {
      name: 'ai-store',
      // 只持久化聊天会话相关数据
      partialize: (state) => ({
        chatSessions: state.chatSessions,
        currentSessionId: state.currentSessionId,
        ollamaHost: state.ollamaHost,
        ollamaPort: state.ollamaPort,
        currentModel: state.currentModel
      })
    }
  ),
  {
    name: 'ai-store-devtools'
  }
))

export type { AIModel, ChatMessage, ChatSession, AIState, AIActions }