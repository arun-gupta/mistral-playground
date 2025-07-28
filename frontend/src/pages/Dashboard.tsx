import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Progress } from '../components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'

interface PerformanceMetrics {
  totalRequests: number
  averageLatency: number
  totalTokens: number
  successRate: number
  modelsUsed: string[]
  peakConcurrentRequests: number
  averageTokensPerRequest: number
}

interface ModelPerformance {
  modelName: string
  provider: string
  totalRequests: number
  averageLatency: number
  totalTokens: number
  successRate: number
  lastUsed: string
  averageTokensPerRequest: number
}

interface SystemMetrics {
  cpuUsage: number
  memoryUsage: number
  diskUsage: number
  activeModels: number
  totalModels: number
  uptime: string
}

interface UsageAnalytics {
  requestsByHour: { hour: string; requests: number }[]
  tokensByModel: { model: string; tokens: number }[]
  latencyTrends: { timestamp: string; latency: number }[]
  popularPrompts: { prompt: string; count: number }[]
}

const Dashboard = () => {
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null)
  const [modelPerformance, setModelPerformance] = useState<ModelPerformance[]>([])
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null)
  const [usageAnalytics, setUsageAnalytics] = useState<UsageAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('24h')

  useEffect(() => {
    fetchDashboardData()
  }, [timeRange])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      // Fetch all dashboard data
      const [metricsRes, modelsRes, systemRes, analyticsRes] = await Promise.all([
        fetch(`/api/v1/dashboard/metrics?timeRange=${timeRange}`),
        fetch(`/api/v1/dashboard/models?timeRange=${timeRange}`),
        fetch('/api/v1/dashboard/system'),
        fetch(`/api/v1/dashboard/analytics?timeRange=${timeRange}`)
      ])

      if (metricsRes.ok) {
        const metrics = await metricsRes.json()
        setPerformanceMetrics(metrics)
      }

      if (modelsRes.ok) {
        const models = await modelsRes.json()
        setModelPerformance(models)
      }

      if (systemRes.ok) {
        const system = await systemRes.json()
        setSystemMetrics(system)
      }

      if (analyticsRes.ok) {
        const analytics = await analyticsRes.json()
        setUsageAnalytics(analytics)
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatLatency = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`
    return tokens.toString()
  }

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 95) return 'text-green-600'
    if (rate >= 80) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getLatencyColor = (latency: number) => {
    if (latency < 1000) return 'text-green-600'
    if (latency < 5000) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Performance Dashboard</h1>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" disabled>
              Loading...
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Performance Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor model performance, usage analytics, and system metrics
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          <Button onClick={fetchDashboardData} variant="outline" size="sm">
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      {performanceMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
              <span className="text-2xl">📊</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{performanceMetrics.totalRequests.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {performanceMetrics.peakConcurrentRequests} peak concurrent
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Latency</CardTitle>
              <span className="text-2xl">⚡</span>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getLatencyColor(performanceMetrics.averageLatency)}`}>
                {formatLatency(performanceMetrics.averageLatency)}
              </div>
              <p className="text-xs text-muted-foreground">
                {performanceMetrics.averageTokensPerRequest.toFixed(0)} tokens/request
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
              <span className="text-2xl">🔤</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatTokens(performanceMetrics.totalTokens)}</div>
              <p className="text-xs text-muted-foreground">
                {performanceMetrics.modelsUsed.length} models used
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <span className="text-2xl">✅</span>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getSuccessRateColor(performanceMetrics.successRate)}`}>
                {performanceMetrics.successRate.toFixed(1)}%
              </div>
              <Progress value={performanceMetrics.successRate} className="mt-2" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* System Metrics */}
      {systemMetrics && (
        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
            <CardDescription>Current system resource usage and status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">CPU Usage</span>
                  <span className="text-sm text-muted-foreground">{systemMetrics.cpuUsage}%</span>
                </div>
                <Progress value={systemMetrics.cpuUsage} className="h-2" />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Memory Usage</span>
                  <span className="text-sm text-muted-foreground">{systemMetrics.memoryUsage}%</span>
                </div>
                <Progress value={systemMetrics.memoryUsage} className="h-2" />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Disk Usage</span>
                  <span className="text-sm text-muted-foreground">{systemMetrics.diskUsage}%</span>
                </div>
                <Progress value={systemMetrics.diskUsage} className="h-2" />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Active Models</span>
                  <span className="text-sm text-muted-foreground">
                    {systemMetrics.activeModels}/{systemMetrics.totalModels}
                  </span>
                </div>
                <Progress 
                  value={(systemMetrics.activeModels / systemMetrics.totalModels) * 100} 
                  className="h-2" 
                />
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between text-sm">
                <span>Uptime: {systemMetrics.uptime}</span>
                <Badge variant="outline">Healthy</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Analytics */}
      <Tabs defaultValue="models" className="space-y-4">
        <TabsList>
          <TabsTrigger value="models">Model Performance</TabsTrigger>
          <TabsTrigger value="usage">Usage Analytics</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="models" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Model Performance Breakdown</CardTitle>
              <CardDescription>Detailed performance metrics by model</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {modelPerformance.map((model) => (
                  <div key={model.modelName} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div>
                        <h3 className="font-medium">{model.modelName}</h3>
                        <p className="text-sm text-muted-foreground">{model.provider}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-6">
                      <div className="text-center">
                        <div className="text-sm font-medium">{model.totalRequests}</div>
                        <div className="text-xs text-muted-foreground">Requests</div>
                      </div>
                      <div className="text-center">
                        <div className={`text-sm font-medium ${getLatencyColor(model.averageLatency)}`}>
                          {formatLatency(model.averageLatency)}
                        </div>
                        <div className="text-xs text-muted-foreground">Avg Latency</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-medium">{formatTokens(model.totalTokens)}</div>
                        <div className="text-xs text-muted-foreground">Tokens</div>
                      </div>
                      <div className="text-center">
                        <div className={`text-sm font-medium ${getSuccessRateColor(model.successRate)}`}>
                          {model.successRate.toFixed(1)}%
                        </div>
                        <div className="text-xs text-muted-foreground">Success Rate</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          {usageAnalytics && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Token Usage by Model</CardTitle>
                    <CardDescription>Total tokens processed per model</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {usageAnalytics.tokensByModel.map((item) => (
                        <div key={item.model} className="flex items-center justify-between">
                          <span className="text-sm">{item.model}</span>
                          <span className="text-sm font-medium">{formatTokens(item.tokens)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Popular Prompts</CardTitle>
                    <CardDescription>Most frequently used prompts</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {usageAnalytics.popularPrompts.map((item) => (
                        <div key={item.prompt} className="flex items-center justify-between">
                          <span className="text-sm truncate max-w-[200px]" title={item.prompt}>
                            {item.prompt}
                          </span>
                          <span className="text-sm font-medium">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          {usageAnalytics && (
            <Card>
              <CardHeader>
                <CardTitle>Request Trends</CardTitle>
                <CardDescription>Request volume over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-end justify-between space-x-1">
                  {usageAnalytics.requestsByHour.map((item, index) => (
                    <div key={index} className="flex-1 bg-primary/20 rounded-t">
                      <div 
                        className="bg-primary rounded-t transition-all duration-300"
                        style={{ 
                          height: `${(item.requests / Math.max(...usageAnalytics.requestsByHour.map(r => r.requests))) * 100}%` 
                        }}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  {usageAnalytics.requestsByHour.map((item, index) => (
                    <span key={index}>{item.hour}</span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default Dashboard 