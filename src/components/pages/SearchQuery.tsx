import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Search, Play, Save, History } from 'lucide-react'
import { useElasticsearchStore } from '@/stores/elasticsearch-store'

/**
 * 搜索查询页面组件
 * 提供 Elasticsearch 查询构建和执行功能
 */
export function SearchQuery() {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState('')
  const [queryType, setQueryType] = useState('match')
  const [results, setResults] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  
  const { indices, executeQuery } = useElasticsearchStore()

  /**
   * 执行搜索查询
   */
  const handleExecuteQuery = async () => {
    if (!query.trim() || !selectedIndex) {
      return
    }

    setIsLoading(true)
    try {
      const result = await executeQuery(selectedIndex, {
        query: {
          [queryType]: {
            _all: query
          }
        }
      })
      setResults(result.hits?.hits || [])
    } catch (error) {
      console.error('Query execution failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * 生成查询预览
   */
  const generateQueryPreview = () => {
    if (!selectedIndex || !query.trim()) {
      return JSON.stringify({
        query: {
          match_all: {}
        },
        size: 10,
        sort: [
          { "@timestamp": { "order": "desc" } }
        ]
      }, null, 2)
    }

    try {
      const baseQuery = (() => {
        switch (queryType) {
          case 'match':
            // 智能匹配多个字段
            return {
              query: {
                multi_match: {
                  query: query,
                  fields: ["title^2", "content", "description", "name", "message", "*"],
                  type: "best_fields",
                  fuzziness: "AUTO"
                }
              }
            }
          
          case 'term':
            // 精确匹配，支持多个常见字段
            return {
              query: {
                bool: {
                  should: [
                    { term: { "status.keyword": query } },
                    { term: { "type.keyword": query } },
                    { term: { "category.keyword": query } },
                    { term: { "level.keyword": query } },
                    { term: { "_id": query } }
                  ],
                  minimum_should_match: 1
                }
              }
            }
          
          case 'range':
            // 时间范围查询，支持多种时间字段
            return {
              query: {
                bool: {
                  should: [
                    {
                      range: {
                        "@timestamp": {
                          "gte": "now-1d",
                          "lte": "now"
                        }
                      }
                    },
                    {
                      range: {
                        "created_at": {
                          "gte": "now-1d",
                          "lte": "now"
                        }
                      }
                    },
                    {
                      range: {
                        "timestamp": {
                          "gte": "now-1d",
                          "lte": "now"
                        }
                      }
                    }
                  ],
                  minimum_should_match: 1
                }
              }
            }
          
          case 'bool':
            // 复合查询，结合文本匹配和过滤条件
            return {
              query: {
                bool: {
                  must: [
                    {
                      multi_match: {
                        query: query,
                        fields: ["title^2", "content", "description", "*"]
                      }
                    }
                  ],
                  filter: [
                    {
                      range: {
                        "@timestamp": {
                          "gte": "now-7d"
                        }
                      }
                    }
                  ],
                  should: [
                    { term: { "status.keyword": "active" } },
                    { term: { "priority.keyword": "high" } }
                  ]
                }
              }
            }
          
          default:
            return {
              query: {
                match_all: {}
              }
            }
        }
      })()

      // 添加通用的查询增强功能
      const enhancedQuery = {
        ...baseQuery,
        size: 20,
        from: 0,
        sort: [
          { "_score": { "order": "desc" } },
          { "@timestamp": { "order": "desc" } }
        ],
        highlight: {
          fields: {
            "title": {},
            "content": {},
            "description": {},
            "message": {}
          },
          pre_tags: ["<mark>"],
          post_tags: ["</mark>"]
        },
        _source: {
          excludes: ["*.raw", "*_vector"]
        },
        track_total_hits: true
      }

      return JSON.stringify(enhancedQuery, null, 2)
    } catch (error) {
      return JSON.stringify({
        query: {
          match_all: {}
        }
      }, null, 2)
    }
  }

  return (
    <div className="h-full p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">搜索查询</h1>
          <p className="text-muted-foreground">
            构建和执行 Elasticsearch 查询
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <History className="h-4 w-4 mr-2" />
            查询历史
          </Button>
          <Button variant="outline" size="sm">
            <Save className="h-4 w-4 mr-2" />
            保存查询
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-200px)]">
        {/* 查询构建器 */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Search className="h-5 w-5 mr-2" />
              查询构建器
            </CardTitle>
            <CardDescription>
              选择索引并构建您的搜索查询
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 space-y-4">
            {/* 索引选择 */}
            <div className="space-y-2">
              <Label htmlFor="index-select">选择索引</Label>
              <select
                id="index-select"
                className="w-full p-2 border rounded-md"
                value={selectedIndex}
                onChange={(e) => setSelectedIndex(e.target.value)}
              >
                <option value="">请选择索引</option>
                {indices.map((index) => (
                  <option key={index.index} value={index.index}>
                    {index.index} ({index.docsCount} 文档)
                  </option>
                ))}
              </select>
            </div>

            {/* 查询类型 */}
            <div className="space-y-2">
              <Label>查询类型</Label>
              <Tabs value={queryType} onValueChange={setQueryType}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="match">Match</TabsTrigger>
                  <TabsTrigger value="term">Term</TabsTrigger>
                  <TabsTrigger value="range">Range</TabsTrigger>
                  <TabsTrigger value="bool">Bool</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* 查询输入 */}
            <div className="space-y-2">
              <Label htmlFor="query-input">搜索词</Label>
              <Input
                id="query-input"
                placeholder="输入搜索词..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            {/* 查询预览 */}
            <div className="space-y-2">
              <Label>查询预览</Label>
              <Textarea
                className="font-mono text-sm"
                rows={8}
                readOnly
                value={generateQueryPreview()}
              />
            </div>

            {/* 执行按钮 */}
            <Button 
              onClick={handleExecuteQuery}
              disabled={!query.trim() || !selectedIndex || isLoading}
              className="w-full"
            >
              <Play className="h-4 w-4 mr-2" />
              {isLoading ? '执行中...' : '执行查询'}
            </Button>
          </CardContent>
        </Card>

        {/* 查询结果 */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>查询结果</span>
              {results.length > 0 && (
                <Badge variant="secondary">
                  {results.length} 条结果
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              查询执行结果和文档详情
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <ScrollArea className="h-full">
              {results.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  执行查询以查看结果
                </div>
              ) : (
                <div className="space-y-4">
                  {results.map((hit, index) => (
                    <div key={hit._id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">#{index + 1}</Badge>
                          <span className="font-mono text-sm text-muted-foreground">
                            {hit._id}
                          </span>
                        </div>
                        <Badge variant="secondary">
                          Score: {hit._score?.toFixed(2)}
                        </Badge>
                      </div>
                      <Separator className="my-2" />
                      <pre className="text-sm bg-muted p-2 rounded overflow-auto">
                        {JSON.stringify(hit._source, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}