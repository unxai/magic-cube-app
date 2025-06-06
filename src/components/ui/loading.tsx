import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * 加载组件属性接口
 */
interface LoadingProps {
  /** 加载文本 */
  text?: string
  /** 大小 */
  size?: 'sm' | 'md' | 'lg'
  /** 自定义类名 */
  className?: string
  /** 是否显示文本 */
  showText?: boolean
}

/**
 * 加载组件
 * 显示旋转的加载指示器，可配置大小和文本
 */
export const Loading: React.FC<LoadingProps> = ({
  text = "加载中...",
  size = 'md',
  className,
  showText = true
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  }

  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      <div
        className={cn(
          "animate-spin rounded-full border-2 border-gray-300 border-t-blue-600",
          sizeClasses[size]
        )}
      />
      {showText && (
        <span className={cn("text-gray-600", textSizeClasses[size])}>
          {text}
        </span>
      )}
    </div>
  )
}

/**
 * 页面加载组件
 * 全屏加载指示器，通常用于页面初始化
 */
export const PageLoading: React.FC<{ text?: string }> = ({ text = "加载中..." }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
        <p className="text-lg text-gray-600">{text}</p>
      </div>
    </div>
  )
}

/**
 * 内联加载组件
 * 小型的内联加载指示器，适用于按钮或小区域
 */
export const InlineLoading: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div
      className={cn(
        "inline-block w-4 h-4 animate-spin rounded-full border-2 border-gray-300 border-t-current",
        className
      )}
    />
  )
}

/**
 * 骨架屏组件
 * 用于在内容加载时显示占位符
 */
export const Skeleton: React.FC<{
  className?: string
  children?: React.ReactNode
}> = ({ className, children }) => {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted",
        className
      )}
    >
      {children}
    </div>
  )
}