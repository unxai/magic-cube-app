import { app, BrowserWindow, Menu, ipcMain } from 'electron'
import path from 'path'
import * as utils from './utils.js'
import { Client } from '@elastic/elasticsearch'

/**
 * Elasticsearch 连接配置
 */
interface ElasticsearchConnection {
  id: string
  name: string
  host: string
  port: number
  protocol: 'http' | 'https'
  username?: string
  password?: string
  apiKey?: string
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

/**
 * 创建 Elasticsearch 客户端
 */
function createElasticsearchClient(connection: ElasticsearchConnection): Client {
  const { host, port, protocol, username, password, apiKey } = connection
  const node = `${protocol}://${host}:${port}`
  console.info('Elasticsearch 客户端创建:', node)
  
  const auth: any = {}
  if (username && password) {
    auth.username = username
    auth.password = password
  } else if (apiKey) {
    auth.apiKey = apiKey
  }
  
  return new Client({
    node,
    auth: Object.keys(auth).length > 0 ? auth : undefined,
    tls: {
      rejectUnauthorized: false // 开发环境可能需要，生产环境应移除
    }
  })
}

// 设置 IPC 处理程序
ipcMain.handle('get-version', () => app.getVersion())

/**
 * 创建主窗口
 */
function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    show: false,
    autoHideMenuBar: true,
    icon: path.join(__dirname, '../static/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      allowRunningInsecureContent: false,
      sandbox: true,
    },
  })

  // 窗口准备好后显示
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    
    if (utils.isDev) {
      mainWindow.webContents.openDevTools()
    }
  })

  // 加载应用
  
  mainWindow.loadURL(
    utils.isDev
      ? 'http://localhost:5173'
      : `file://${path.join(__dirname, '../dist/index.html')}`
  );

  // 处理窗口关闭
  mainWindow.on('closed', () => {
    // 在 macOS 上，通常应用会保持活跃状态
    // 即使没有打开的窗口，直到用户明确退出
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })
}

/**
 * 设置应用菜单
 */
function createMenu(): void {
  const template: import('electron').MenuItemConstructorOptions[] = [
    {
      label: 'Magic Cube',
      submenu: [
        {
          label: '关于 Magic Cube',
          role: 'about'
        },
        { type: 'separator' },
        {
          label: '退出',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit()
          }
        }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { label: '撤销', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: '重做', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
        { type: 'separator' },
        { label: '剪切', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: '复制', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: '粘贴', accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { label: '全选', accelerator: 'CmdOrCtrl+A', role: 'selectAll' }
      ]
    },
    {
      label: '视图',
      submenu: [
        { label: '重新加载', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: '强制重新加载', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
        { label: '切换开发者工具', accelerator: 'F12', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: '实际大小', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { label: '放大', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
        { label: '缩小', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { type: 'separator' },
        { label: '切换全屏', accelerator: 'F11', role: 'togglefullscreen' }
      ]
    },
    {
      label: '窗口',
      submenu: [
        { label: '最小化', accelerator: 'CmdOrCtrl+M', role: 'minimize' },
        { label: '关闭', accelerator: 'CmdOrCtrl+W', role: 'close' }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// 应用准备就绪时创建窗口
app.whenReady().then(() => {
  createWindow()
  createMenu()

  app.on('activate', () => {
    // 在 macOS 上，当点击 dock 图标并且没有其他窗口打开时
    // 通常会重新创建一个窗口
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// 当所有窗口都关闭时退出应用
app.on('window-all-closed', () => {
  // 在 macOS 上，应用通常会保持活跃状态
  // 即使没有打开的窗口，直到用户明确退出
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// IPC 处理程序
ipcMain.handle('get-app-version', () => {
  return app.getVersion()
})

ipcMain.handle('get-platform', () => {
  return process.platform
})

ipcMain.handle('get-asset-path', (_event: Electron.IpcMainInvokeEvent, ...paths: string[]) => {
  return utils.getAssetPath(...paths)
})

// Elasticsearch IPC 处理程序
ipcMain.handle('elasticsearch:test-connection', async (_event, connection: ElasticsearchConnection) => {
  try {
    const client = createElasticsearchClient(connection)
    const info = await client.info()
    const nodesInfo = await client.nodes.info()
    
    return {
      success: true,
      version: info.version.number,
      nodeCount: Object.keys(nodesInfo.nodes || {}).length,
      clusterName: info.cluster_name
    }
  } catch (error) {
    return {
      success: false,
      error: '连接失败: ' + (error instanceof Error ? error.message : '未知错误')
    }
  }
})

ipcMain.handle('elasticsearch:ping', async (_event, connection: ElasticsearchConnection) => {
  try {
    const client = createElasticsearchClient(connection)
    await client.ping()
    return true
  } catch (error) {
    return false
  }
})

ipcMain.handle('elasticsearch:get-cluster-info', async (_event, connection: ElasticsearchConnection) => {
  try {
    const client = createElasticsearchClient(connection)
    const response = await client.info()
    return response
  } catch (error) {
    throw new Error('获取集群信息失败: ' + (error instanceof Error ? error.message : '未知错误'))
  }
})

ipcMain.handle('elasticsearch:get-indices', async (_event, connection: ElasticsearchConnection) => {
  try {
    const client = createElasticsearchClient(connection)
    const response = await client.cat.indices({ format: 'json' })
    
    return response.map((index: any) => ({
      index: index.index,
      health: index.health,
      status: index.status,
      pri: parseInt(index.pri, 10),
      rep: parseInt(index.rep, 10),
      docsCount: parseInt(index['docs.count'], 10),
      docsDeleted: parseInt(index['docs.deleted'], 10),
      storeSize: index['store.size'],
      priStoreSize: index['pri.store.size'],
    }))
  } catch (error) {
    throw new Error('获取索引信息失败: ' + (error instanceof Error ? error.message : '未知错误'))
  }
})

ipcMain.handle('elasticsearch:execute-query', async (_event, connection: ElasticsearchConnection, index: string, queryBody: any) => {
  try {
    const client = createElasticsearchClient(connection)
    const result = await client.search({
      index,
      body: queryBody
    })
    return result
  } catch (error) {
    throw new Error('执行查询失败: ' + (error instanceof Error ? error.message : '未知错误'))
  }
})

ipcMain.handle('elasticsearch:create-index', async (_event, connection: ElasticsearchConnection, name: string, settings?: any) => {
  try {
    const client = createElasticsearchClient(connection)
    const result = await client.indices.create({
      index: name,
      body: settings || {}
    })
    return result
  } catch (error) {
    throw new Error('创建索引失败: ' + (error instanceof Error ? error.message : '未知错误'))
  }
})

ipcMain.handle('elasticsearch:delete-index', async (_event, connection: ElasticsearchConnection, name: string) => {
  try {
    const client = createElasticsearchClient(connection)
    const result = await client.indices.delete({
      index: name
    })
    return result
  } catch (error) {
    throw new Error('删除索引失败: ' + (error instanceof Error ? error.message : '未知错误'))
  }
})

// 防止多个实例
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    // 当运行第二个实例时，将焦点放在主窗口上
    const windows = BrowserWindow.getAllWindows()
    if (windows.length > 0) {
      const mainWindow = windows[0]
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}