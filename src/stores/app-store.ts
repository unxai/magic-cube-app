import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * 应用主题类型
 */
export type Theme = 'light' | 'dark' | 'system'

/**
 * 应用状态接口
 */
interface AppState {
  // 应用初始化状态
  isInitialized: boolean
  
  // 主题设置
  theme: Theme
  
  // 侧边栏状态
  sidebarCollapsed: boolean
  
  // 当前活跃的标签页
  activeTab: string
  
  // 连接状态
  isConnected: boolean
  
  // 加载状态
  isLoading: boolean
  
  // 错误信息
  error: string | null
}

/**
 * 应用操作接口
 */
interface AppActions {
  // 设置初始化状态
  setInitialized: (initialized: boolean) => void
  
  // 主题操作
  setTheme: (theme: Theme) => void
  
  // 侧边栏操作
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  
  // 标签页操作
  setActiveTab: (tab: string) => void
  
  // 连接状态操作
  setConnected: (connected: boolean) => void
  
  // 加载状态操作
  setLoading: (loading: boolean) => void
  
  // 错误处理
  setError: (error: string | null) => void
  clearError: () => void
  
  // 重置应用状态
  reset: () => void
}

/**
 * 应用状态类型
 */
export type AppStore = AppState & AppActions

/**
 * 初始状态
 */
const initialState: AppState = {
  isInitialized: false,
  theme: 'system',
  sidebarCollapsed: false,
  activeTab: 'dashboard',
  isConnected: false,
  isLoading: false,
  error: null,
}

/**
 * 应用状态管理 Store
 * 使用 Zustand 进行状态管理，支持持久化存储
 */
export const useAppStore = create<AppStore>()(
  persist(
    (set, _get) => ({
      ...initialState,
      
      // 设置初始化状态
      setInitialized: (initialized: boolean) => {
        set({ isInitialized: initialized })
      },
      
      // 主题操作
      setTheme: (theme: Theme) => {
        set({ theme })
      },
      
      // 侧边栏操作
      toggleSidebar: () => {
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }))
      },
      
      setSidebarCollapsed: (collapsed: boolean) => {
        set({ sidebarCollapsed: collapsed })
      },
      
      // 标签页操作
      setActiveTab: (tab: string) => {
        set({ activeTab: tab })
      },
      
      // 连接状态操作
      setConnected: (connected: boolean) => {
        set({ isConnected: connected })
      },
      
      // 加载状态操作
      setLoading: (loading: boolean) => {
        set({ isLoading: loading })
      },
      
      // 错误处理
      setError: (error: string | null) => {
        set({ error })
      },
      
      clearError: () => {
        set({ error: null })
      },
      
      // 重置应用状态
      reset: () => {
        set(initialState)
      },
    }),
    {
      name: 'magic-cube-app-store',
      // 只持久化部分状态
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
        activeTab: state.activeTab,
      }),
    }
  )
)