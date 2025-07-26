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
        
        // Clear downloading state for models that are already loaded or downloaded
        setDownloadingModels(prev => {
          const newSet = new Set(prev)
          data.forEach((model: ModelStatus) => {
            if (model.is_loaded || model.download_progress === 100) {
              newSet.delete(model.name)
            }
          })
          return newSet
        })
        
        // Clear progress for models that are already loaded or downloaded
        setDownloadProgress(prev => {
          const newProgress = { ...prev }
          data.forEach((model: ModelStatus) => {
            if (model.is_loaded || model.download_progress === 100) {
              delete newProgress[model.name]
            }
          })
          return newProgress
        })
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
      console.log(`🚀 Starting download for ${modelName}`)
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
        console.log(`📥 Download response for ${modelName}:`, data)
        
        if (data.status === 'completed') {
          console.log(`✅ Model ${modelName} already completed`)
          toast({
            title: "Success",
            description: `Model ${modelName} is already downloaded and ready to use!`,
          })
          // Remove from downloading set since it's already done
          setDownloadingModels(prev => {
            const newSet = new Set(prev)
            newSet.delete(modelName)
            return newSet
          })
          fetchModels() // Refresh the list
        } else if (data.status === 'downloading') {
          console.log(`📥 Starting download polling for ${modelName}`)
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
      // Remove from downloading set on error
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
          
          console.log(`📊 Download status for ${modelName}:`, data)
          
          if (data.progress !== undefined) {
            setDownloadProgress(prev => ({ ...prev, [modelName]: data.progress! }))
          }
          
          if (data.status === 'completed') {
            console.log(`✅ Download completed for ${modelName}`)
            clearInterval(pollInterval)
            setDownloadingModels(prev => {
              const newSet = new Set(prev)
              newSet.delete(modelName)
              return newSet
            })
            // Clear progress for this model
            setDownloadProgress(prev => {
              const newProgress = { ...prev }
              delete newProgress[modelName]
              return newProgress
            })
            toast({
              title: "Download Complete",
              description: `Model ${modelName} has been downloaded successfully!`,
            })
            fetchModels() // Refresh the list
          } else if (data.status === 'failed') {
            console.log(`❌ Download failed for ${modelName}`)
            clearInterval(pollInterval)
            setDownloadingModels(prev => {
              const newSet = new Set(prev)
              newSet.delete(modelName)
              return newSet
            })
            // Clear progress for this model
            setDownloadProgress(prev => {
              const newProgress = { ...prev }
              delete newProgress[modelName]
              return newProgress
            })
            toast({
              title: "Download Failed",
              description: `Failed to download ${modelName}`,
              variant: "destructive"
            })
          }
        } else {
          console.error(`❌ Failed to get download status for ${modelName}:`, response.status)
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
    } else if (modelName.includes('Mixtral-8x7B')) {
      return 'Very Large (8x7B parameters)'
    } else if (modelName.includes('Llama-2-70B')) {
      return 'Very Large (70B parameters)'
    } else if (modelName.includes('Llama-2-13B')) {
      return 'Large (13B parameters)'
    } else if (modelName.includes('Llama-2-7B')) {
      return 'Large (7B parameters)'
    } else if (modelName.includes('gemma-7b')) {
      return 'Large (7B parameters)'
    } else if (modelName.includes('gemma-2b')) {
      return 'Medium (2B parameters)'
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
    if (modelName.includes('Mixtral-8x7B') || modelName.includes('Llama-2-70B')) {
      return '15-30 minutes'
    } else if (modelName.includes('Llama-2-13B') || modelName.includes('gemma-7b')) {
      return '8-15 minutes'
    } else if (modelName.includes('Mistral-7B') || modelName.includes('Llama-2-7B')) {
      return '5-10 minutes'
    } else if (modelName.includes('gemma-2b')) {
      return '3-5 minutes'
    } else if (modelName.includes('DialoGPT-large')) {
      return '2-5 minutes'
    } else {
      return '30 seconds - 2 minutes'
    }
  }

  useEffect(() => {
    fetchModels()
  }, [])

  // Clear any stale downloading state on mount
  useEffect(() => {
    setDownloadingModels(new Set())
    setDownloadProgress({})
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
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg font-medium">Loading Model Manager...</p>
            <p className="text-sm text-muted-foreground mt-2">Fetching available models and status</p>
          </div>
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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
            <CardTitle className="text-sm font-medium">Not Downloaded</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {models.filter(m => !m.is_loaded && m.download_progress !== 100 && !downloadingModels.has(m.name)).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Ready to download</p>
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
            {downloadingModels.size > 0 && (
              <div className="flex items-center mt-1">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1"></div>
                <span className="text-xs text-blue-600">Active downloads</span>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Downloaded</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {models.filter(m => !m.is_loaded && m.download_progress === 100).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">On disk, ready to load</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Loaded in Memory</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {models.filter(m => m.is_loaded).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Ready to use</p>
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
                       <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                         <span className="mr-1">✅</span>
                         Loaded
                       </Badge>
                     ) : isDownloading ? (
                       <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
                         <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1"></div>
                         Downloading
                       </Badge>
                     ) : model.download_progress === 100 ? (
                       <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200">
                         <span className="mr-1">📦</span>
                         On Disk
                       </Badge>
                     ) : (
                       <Badge variant="outline" className="text-muted-foreground border-gray-300">
                         <span className="mr-1">⏳</span>
                         Not Downloaded
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
                  <div className="space-y-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        <span className="text-sm font-medium text-blue-800">Downloading...</span>
                      </div>
                      <span className="text-sm font-bold text-blue-800">{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-2 bg-blue-100" />
                    <div className="flex justify-between text-xs text-blue-600">
                      <span>Progress: {Math.round(progress)}%</span>
                      <span>ETA: {getEstimatedDownloadTime(model.name)}</span>
                    </div>
                    <div className="text-xs text-blue-600">
                      ⏱️ This may take several minutes for large models
                    </div>
                  </div>
                )}

                {/* Action Button */}
                <div className="pt-2">
                  {model.is_loaded ? (
                    <Button 
                      variant="outline" 
                      className="w-full bg-green-50 border-green-200 text-green-800 hover:bg-green-100" 
                      disabled
                    >
                      <span className="mr-2">✅</span>
                      Ready to Use
                    </Button>
                  ) : isDownloading ? (
                    <Button 
                      variant="outline" 
                      className="w-full bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100" 
                      disabled
                    >
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                      Downloading... {Math.round(progress)}%
                    </Button>
                  ) : model.download_progress === 100 ? (
                    <Button 
                      variant="outline" 
                      className="w-full bg-orange-50 border-orange-200 text-orange-800 hover:bg-orange-100"
                      disabled
                    >
                      <span className="mr-2">📦</span>
                      On Disk (Ready to Load)
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => downloadModel(model.name)}
                      className="w-full bg-gray-50 border-gray-200 text-gray-800 hover:bg-gray-100"
                      disabled={downloadingModels.size > 0}
                    >
                      <span className="mr-2">📥</span>
                      Download Model
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
          <CardTitle>💡 Model Status Guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">📊 Model States</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-300">
                    <span className="mr-1">⏳</span>
                    Not Downloaded
                  </Badge>
                  <span className="text-sm text-muted-foreground">Ready to download</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1"></div>
                    Downloading
                  </Badge>
                  <span className="text-sm text-muted-foreground">Currently downloading</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200">
                    <span className="mr-1">📦</span>
                    On Disk
                  </Badge>
                  <span className="text-sm text-muted-foreground">On disk, ready to load</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                    <span className="mr-1">✅</span>
                    Loaded
                  </Badge>
                  <span className="text-sm text-muted-foreground">Loaded in memory, ready to use</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">📥 Download Strategy</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Start with small models for quick testing</li>
                <li>• Download large models during off-peak hours</li>
                <li>• Models are cached after first download</li>
                <li>• You can use models while others download</li>
              </ul>
              <h4 className="font-medium mb-2 mt-4">💾 Storage & Performance</h4>
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