import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import {  Bot, Palette, Download, Upload, Trash2, Save, TestTube } from 'lucide-react'
import { useTheme } from '@/components/theme-provider'
import { useAIStore } from '@/stores/ai-store'
import { ClusterManagement } from '@/components/pages/ClusterManagement'

/**
 * 设置页面组件
 * 提供应用程序的各种配置选项
 */
export function Settings() {
  const [ollamaHost, setOllamaHost] = useState('http://localhost:11434')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(30)
  const [maxResults, setMaxResults] = useState(100)
  const [enableNotifications, setEnableNotifications] = useState(true)
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  
  const { theme, setTheme } = useTheme()

  /**
   * 测试 Ollama 连接
   */
  const handleTestOllamaConnection = async () => {
    setIsTestingConnection(true)
    try {
      const response = await fetch(`${ollamaHost}/api/tags`)
      if (response.ok) {
        alert('Ollama 连接成功！')
      } else {
        alert('Ollama 连接失败')
      }
    } catch (error) {
      alert('无法连接到 Ollama 服务')
    } finally {
      setIsTestingConnection(false)
    }
  }

  /**
   * 保存 Ollama 配置
   */
  const handleSaveOllamaConfig = async () => {
    try {
      // 保存到本地存储
      localStorage.setItem('ollama-host', ollamaHost)
      
      // 更新 AI store 中的 Ollama 配置并连接
      const { connectToOllama } = useAIStore.getState()
      const host = ollamaHost.replace('http://', '').replace('https://', '')
      const [hostname, port] = host.split(':')
      
      await connectToOllama(hostname, port ? parseInt(port) : 11434)
      
      alert('Ollama 配置已保存并连接成功')
    } catch (error) {
      console.error('保存 Ollama 配置失败:', error)
      alert('保存配置成功，但连接失败，请检查 Ollama 服务是否正常运行')
    }
  }

  /**
   * 导出配置
   */
  const handleExportConfig = () => {
    const config = {
      ollama: {
        host: ollamaHost
      },
      preferences: {
        theme,
        autoRefresh,
        refreshInterval,
        maxResults,
        enableNotifications
      },
      exportTime: new Date().toISOString()
    }
    
    const blob = new Blob([JSON.stringify(config, null, 2)], {
      type: 'application/json'
    })
    
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `magic-cube-config-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  /**
   * 导入配置
   */
  const handleImportConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const config = JSON.parse(e.target?.result as string)
        
        // 应用配置
        if (config.ollama) {
          setOllamaHost(config.ollama.host || ollamaHost)
        }
        
        if (config.preferences) {
          setTheme(config.preferences.theme || theme)
          setAutoRefresh(config.preferences.autoRefresh ?? autoRefresh)
          setRefreshInterval(config.preferences.refreshInterval || refreshInterval)
          setMaxResults(config.preferences.maxResults || maxResults)
          setEnableNotifications(config.preferences.enableNotifications ?? enableNotifications)
        }
        
        alert('配置导入成功！')
      } catch (error) {
        alert('配置文件格式错误')
      }
    }
    reader.readAsText(file)
  }

  /**
   * 重置所有设置
   */
  const handleResetSettings = () => {
    setOllamaHost('http://localhost:11434')
    setAutoRefresh(true)
    setRefreshInterval(30)
    setMaxResults(100)
    setEnableNotifications(true)
    setTheme('system')
    alert('设置已重置为默认值')
  }

  return (
    <div className="h-full p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">设置</h1>
          <p className="text-muted-foreground">
            配置应用程序的各种选项和连接
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handleExportConfig}>
            <Download className="h-4 w-4 mr-2" />
            导出配置
          </Button>
          <Button variant="outline" size="sm" asChild>
            <label>
              <Upload className="h-4 w-4 mr-2" />
              导入配置
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImportConfig}
              />
            </label>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="cluster" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="cluster">集群管理</TabsTrigger>
          <TabsTrigger value="ollama">Ollama 配置</TabsTrigger>
          <TabsTrigger value="appearance">外观</TabsTrigger>
        </TabsList>

        {/* 集群管理 */}
        <TabsContent value="cluster" className="space-y-6">
          <ClusterManagement />
        </TabsContent>

        {/* Ollama 配置 */}
        <TabsContent value="ollama" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bot className="h-5 w-5 mr-2" />
                Ollama 配置
              </CardTitle>
              <CardDescription>
                配置本地 Ollama 服务连接
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ollama-host">Ollama 服务地址</Label>
                <Input
                  id="ollama-host"
                  placeholder="http://localhost:11434"
                  value={ollamaHost}
                  onChange={(e) => setOllamaHost(e.target.value)}
                />
              </div>
              
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={handleTestOllamaConnection}
                  disabled={isTestingConnection}
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  {isTestingConnection ? '测试中...' : '测试连接'}
                </Button>
                <Button onClick={handleSaveOllamaConfig}>
                  <Save className="h-4 w-4 mr-2" />
                  保存配置
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 外观设置 */}
        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Palette className="h-5 w-5 mr-2" />
                外观设置
              </CardTitle>
              <CardDescription>
                自定义应用程序的外观和主题
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>主题</Label>
                <div className="flex space-x-2">
                  <Button
                    variant={theme === 'light' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTheme('light')}
                  >
                    浅色
                  </Button>
                  <Button
                    variant={theme === 'dark' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTheme('dark')}
                  >
                    深色
                  </Button>
                  <Button
                    variant={theme === 'system' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTheme('system')}
                  >
                    跟随系统
                  </Button>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>启用通知</Label>
                  <p className="text-sm text-muted-foreground">
                    接收查询完成和错误通知
                  </p>
                </div>
                <Switch
                  checked={enableNotifications}
                  onCheckedChange={setEnableNotifications}
                />
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h4 className="font-medium text-destructive">危险区域</h4>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4 mr-2" />
                      重置所有设置
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>确认重置设置</AlertDialogTitle>
                      <AlertDialogDescription>
                        这将重置所有设置为默认值，包括连接配置、主题设置等。此操作不可撤销。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>取消</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleResetSettings}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        重置设置
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>


      </Tabs>
    </div>
  )
}