import React from "react"

/**
 * 主题类型定义
 */
type Theme = "dark" | "light" | "system"

/**
 * 主题提供者属性接口
 */
type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

/**
 * 主题提供者状态接口
 */
type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

/**
 * 初始状态
 */
const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
}

/**
 * 主题上下文
 */
const ThemeProviderContext = React.createContext<ThemeProviderState>(initialState)

/**
 * 主题提供者组件
 * 管理应用的主题状态，支持亮色、暗色和系统主题
 */
export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = React.useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  )

  React.useEffect(() => {
    const root = window.document.documentElement

    root.classList.remove("light", "dark")

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light"

      root.classList.add(systemTheme)
      return
    }

    root.classList.add(theme)
  }, [theme])

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme)
      setTheme(theme)
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

/**
 * 使用主题的 Hook
 * 提供当前主题状态和切换主题的方法
 */
export const useTheme = () => {
  const context = React.useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}