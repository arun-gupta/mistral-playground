import { useState, useEffect } from 'react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Progress } from '../components/ui/progress'
import { useToast } from '../components/ui/use-toast'

interface ModelStatus {
  name: string
  provider: string
  is_loaded: boolean
  is_downloading: boolean
  download_progress?: number
  size_on_disk?: string
  last_used?: string
  load_time?: number
}

interface ModelDownloadResponse {
  model_name: string
  provider: string
  status: string
  progress?: number
  message: string
  download_size?: string
  estimated_time?: string
  timestamp: string
}

const Models = () => {
  const [models, setModels] = useState<ModelStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [downloadingModels, setDownloadingModels] = useState<Set<string>>(new Set())
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({})
  const { toast } = useToast()

  // Fetch available models
  const fetchModels = async () => {
    try {
      const response = await fetch('/api/v1/models/available')
      if (response.ok) {
        const data = await response.json()
        setModels(data)
      } else {
        console.error('Failed to fetch models')
        toast({
          title: "Error",
          description: "Failed to fetch available models",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error fetching models:', error)
      toast({
        title: "Error",
        description: "Failed to fetch available models",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Download a model
  const downloadModel = async (modelName: string) => {
    try {
      setDownloadingModels(prev => new Set(prev).add(modelName))
      setDownloadProgress(prev => ({ ...prev, [modelName]: 0 }))

      const response = await fetch('/api/v1/models/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model_name: modelName,
          provider: 'huggingface',
          force_redownload: false
        })
      })

      if (response.ok) {
        const data: ModelDownloadResponse = await response.json()
        
        if (data.status === 'completed') {
          toast({
            title: "Success",
            description: `Model ${modelName} is already downloaded and ready to use!`,
          })
          fetchModels() // Refresh the list
        } else if (data.status === 'downloading') {
          toast({
            title: "Download Started",
            description: `Started downloading ${modelName}. This may take several minutes.`,
          })
          // Start polling for progress
          pollDownloadProgress(modelName)
        }
      } else {
        throw new Error('Download request failed')
      }
    } catch (error) {
      console.error('Error downloading model:', error)
      toast({
        title: "Error",
        description: `Failed to download ${modelName}`,
        variant: "destructive"
      })
    } finally {
      setDownloadingModels(prev => {
        const newSet = new Set(prev)
        newSet.delete(modelName)
        return newSet
      })
    }
  }

  // Poll download progress
  const pollDownloadProgress = async (modelName: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/v1/models/download-status/${encodeURIComponent(modelName)}`)
        if (response.ok) {
          const data: ModelDownloadResponse = await response.json()
          
          if (data.progress !== undefined) {
            setDownloadProgress(prev => ({ ...prev, [modelName]: data.progress! }))
          }
          
          if (data.status === 'completed') {
            clearInterval(pollInterval)
            setDownloadingModels(prev => {
              const newSet = new Set(prev)
              newSet.delete(modelName)
              return newSet
            })
            toast({
              title: "Download Complete",
              description: `Model ${modelName} has been downloaded successfully!`,
            })
            fetchModels() // Refresh the list
          } else if (data.status === 'failed') {
            clearInterval(pollInterval)
            setDownloadingModels(prev => {
              const newSet = new Set(prev)
              newSet.delete(modelName)
              return newSet
            })
            toast({
              title: "Download Failed",
              description: `Failed to download ${modelName}`,
              variant: "destructive"
            })
          }
        }
      } catch (error) {
        console.error('Error polling download progress:', error)
        clearInterval(pollInterval)
      }
    }, 2000) // Poll every 2 seconds

    // Stop polling after 10 minutes
    setTimeout(() => {
      clearInterval(pollInterval)
    }, 600000)
  }

  // Get model size category
  const getModelSizeCategory = (modelName: string) => {
    if (modelName.includes('Mistral-7B')) {
      return 'Large (7B parameters)'
    } else if (modelName.includes('DialoGPT-large')) {
      return 'Medium (774M parameters)'
    } else if (modelName.includes('DialoGPT-medium')) {
      return 'Medium (345M parameters)'
    } else {
      return 'Small (117M parameters)'
    }
  }

  // Get estimated download time
  const getEstimatedDownloadTime = (modelName: string) => {
    if (modelName.includes('Mistral-7B')) {
      return '5-10 minutes'
    } else if (modelName.includes('DialoGPT-large')) {
      return '2-5 minutes'
    } else {
      return '30 seconds - 2 minutes'
    }
  }

  useEffect(() => {
    fetchModels()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Model Manager</h1>
          <p className="text-muted-foreground">
            Download and manage your AI models
          </p>
        </div>
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2">Loading models...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Model Manager</h1>
        <p className="text-muted-foreground">
          Download and manage your AI models proactively
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Models</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{models.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Loaded Models</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {models.filter(m => m.is_loaded).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Downloading</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {downloadingModels.size}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {models.filter(m => !m.is_loaded && !downloadingModels.has(m.name)).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Model Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {models.map((model) => {
          const isDownloading = downloadingModels.has(model.name)
          const progress = downloadProgress[model.name] || 0
          
          return (
            <Card key={model.name} className="relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg font-semibold truncate">
                      {model.name.split('/').pop()}
                    </CardTitle>
                    <CardDescription className="text-sm text-muted-foreground">
                      {model.name}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    {model.is_loaded ? (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        ✅ Loaded
                      </Badge>
                    ) : isDownloading ? (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        📥 Downloading
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        ⏳ Available
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Model Info */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Size:</span>
                    <span className="font-medium">{getModelSizeCategory(model.name)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Provider:</span>
                    <span className="font-medium">{model.provider}</span>
                  </div>
                  {model.size_on_disk && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Size on disk:</span>
                      <span className="font-medium">{model.size_on_disk}</span>
                    </div>
                  )}
                  {model.last_used && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Last used:</span>
                      <span className="font-medium">{new Date(model.last_used).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                {/* Download Progress */}
                {isDownloading && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Downloading...</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      Estimated time: {getEstimatedDownloadTime(model.name)}
                    </p>
                  </div>
                )}

                {/* Action Button */}
                <div className="pt-2">
                  {model.is_loaded ? (
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      disabled
                    >
                      ✅ Ready to Use
                    </Button>
                  ) : isDownloading ? (
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      disabled
                    >
                      📥 Downloading...
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => downloadModel(model.name)}
                      className="w-full"
                      disabled={downloadingModels.size > 0}
                    >
                      📥 Download Model
                    </Button>
                  )}
                </div>

                {/* Download Time Estimate */}
                {!model.is_loaded && !isDownloading && (
                  <p className="text-xs text-muted-foreground text-center">
                    ⏱️ Estimated download time: {getEstimatedDownloadTime(model.name)}
                  </p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Help Section */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>💡 Tips for Model Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">📥 Download Strategy</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Start with small models for quick testing</li>
                <li>• Download large models during off-peak hours</li>
                <li>• Models are cached after first download</li>
                <li>• You can use models while others download</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">💾 Storage & Performance</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Small models: ~500MB each</li>
                <li>• Large models: ~14GB each</li>
                <li>• GGUF models: ~4-8GB (CPU optimized)</li>
                <li>• Loaded models use RAM, not disk space</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Models 