import { join } from 'path'

/**
 * 判断是否为开发环境
 */
const isDev = process.env.NODE_ENV === 'development' || process.env.IS_DEV === 'true'

/**
 * 获取应用资源路径
 * 注意：此函数只能在主进程中使用，因为它依赖于 Node.js 的 process 对象
 */
function getAssetPath(...paths: string[]): string {
  const RESOURCES_PATH = isDev
    ? join(__dirname, '..')
    : join(process.cwd(), 'resources')

  return join(RESOURCES_PATH, ...paths)
}

/**
 * 获取静态资源路径（适用于渲染进程）
 * 这个函数可以安全地在渲染进程中使用
 */
function getStaticAssetPath(...paths: string[]): string {
  // 在渲染进程中，我们使用相对路径或基于当前位置的路径
  if (typeof window !== 'undefined') {
    // 渲染进程环境
    const basePath = isDev ? 'http://localhost:5173' : './'
    return paths.length > 0 ? `${basePath}${paths.join('/')}` : basePath
  } else {
    // 主进程环境，回退到原始实现
    return getAssetPath(...paths)
  }
}

/**
 * 日志工具
 */
const logger = {
  info: (message: string, ...args: any[]) => {
    console.log(`[INFO] ${message}`, ...args)
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(`[WARN] ${message}`, ...args)
  },
  error: (message: string, ...args: any[]) => {
    console.error(`[ERROR] ${message}`, ...args)
  },
  debug: (message: string, ...args: any[]) => {
    if (isDev) {
      console.debug(`[DEBUG] ${message}`, ...args)
    }
  },
}

export {
  isDev,
  getAssetPath,
  getStaticAssetPath,
  logger
}