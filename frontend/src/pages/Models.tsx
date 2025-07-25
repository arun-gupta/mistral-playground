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

interface ModelGroup {
  family: string
  displayName: string
  models: ModelStatus[]
  expanded: boolean
}

type SortOption = 'size' | 'name' | 'status'
type FilterOption = 'all' | 'mistral' | 'llama' | 'gemma' | 'mixtral' | 'dialogpt' | 'recommended'

const Models = () => {
  const [models, setModels] = useState<ModelStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [downloadingModels, setDownloadingModels] = useState<Set<string>>(new Set())
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({})
  const [sortBy, setSortBy] = useState<SortOption>('size')
  const [filterBy, setFilterBy] = useState<FilterOption>('all')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const { toast } = useToast()

  // Model categorization and filtering logic
  const getModelFamily = (modelName: string): string => {
    if (modelName.includes('Mistral-7B') || modelName.includes('Mixtral')) return 'mistral'
    if (modelName.includes('Llama-3') || modelName.includes('Meta-Llama-3') || modelName.includes('Llama-2')) return 'llama'
    if (modelName.includes('gemma')) return 'gemma'
    if (modelName.includes('DialoGPT')) return 'dialogpt'
    return 'other'
  }

  const getModelSize = (modelName: string): number => {
    if (modelName.includes('70B') || modelName.includes('Mixtral-8x7B')) return 70
    if (modelName.includes('13B')) return 13
    if (modelName.includes('8B') || modelName.includes('7B')) return 7
    if (modelName.includes('2B')) return 2
    if (modelName.includes('DialoGPT-large')) return 0.774
    if (modelName.includes('DialoGPT-medium')) return 0.345
    if (modelName.includes('DialoGPT-small')) return 0.117
    return 0
  }

  const isKeyVariant = (modelName: string): boolean => {
    // Show only Instruct and GGUF variants by default
    const isInstruct = modelName.includes('Instruct') || modelName.includes('chat')
    const isGGUF = modelName.includes('GGUF')
    const isBase = modelName.includes('Base') || (!isInstruct && !isGGUF)
    
    // For small models (DialoGPT), show all variants
    if (modelName.includes('DialoGPT')) return true
    
    // For larger models, show only Instruct and GGUF variants
    return isInstruct || isGGUF
  }

  const isRecommended = (modelName: string): boolean => {
    // Recommended models for different use cases
    const recommended = [
      'microsoft/DialoGPT-small', // Testing
      'TheBloke/Mistral-7B-Instruct-v0.2-GGUF', // Production CPU
      'TheBloke/Meta-Llama-3-8B-Instruct-GGUF', // CPU-optimized Llama 3
      'TheBloke/Meta-Llama-3-14B-Instruct-GGUF', // High-quality Llama 3
      'google/gemma-2b-it', // Efficient development
      'TheBloke/Mixtral-8x7B-Instruct-v0.1-GGUF' // High performance
    ]
    return recommended.includes(modelName)
  }

  const isGPURecommended = (modelName: string): boolean => {
    // Models that would perform significantly better with GPU
    // Only include models that are actually in our system AND need GPU
    const gpuRecommended = [
      'mistralai/Mixtral-8x7B-Instruct-v0.1', // Full Mixtral (~70B effective, ~32GB RAM)
      'TheBloke/Mixtral-8x7B-Instruct-v0.1-GGUF', // Mixtral GGUF (~70B effective, 16-24GB RAM)
      'mistralai/CodeMistral-7B-Instruct-v0.1' // CodeMistral (~14GB RAM, specialized)
    ]
    return gpuRecommended.includes(modelName)
  }

  // Group and filter models
  const getGroupedModels = (): ModelGroup[] => {
    let filteredModels = models

    // Apply family filter
    if (filterBy !== 'all') {
      filteredModels = models.filter(model => getModelFamily(model.name) === filterBy)
    }

    // Apply recommended filter
    if (filterBy === 'recommended') {
      filteredModels = models.filter(model => isRecommended(model.name))
    }

    // Apply advanced variants filter
    if (!showAdvanced) {
      filteredModels = filteredModels.filter(model => isKeyVariant(model.name))
    }

    // Sort models
    filteredModels.sort((a, b) => {
      switch (sortBy) {
        case 'size':
          return getModelSize(b.name) - getModelSize(a.name)
        case 'name':
          return a.name.localeCompare(b.name)
        case 'status':
          if (a.is_loaded && !b.is_loaded) return -1
          if (!a.is_loaded && b.is_loaded) return 1
          return 0
        default:
          return 0
      }
    })

    // Group by family
    const groups: Record<string, ModelStatus[]> = {}
    filteredModels.forEach(model => {
      const family = getModelFamily(model.name)
      if (!groups[family]) groups[family] = []
      groups[family].push(model)
    })

    // Sort models within each group
    Object.keys(groups).forEach(family => {
      groups[family].sort((a, b) => {
        // First priority: Recommended models
        const aIsRecommended = isRecommended(a.name)
        const bIsRecommended = isRecommended(b.name)
        if (aIsRecommended && !bIsRecommended) return -1
        if (!aIsRecommended && bIsRecommended) return 1
        
        // Second priority: For Llama family, put Llama 3 first, then Llama 2
        if (family === 'llama') {
          const aIsLlama3 = a.name.includes('Llama-3') || a.name.includes('Meta-Llama-3')
          const bIsLlama3 = b.name.includes('Llama-3') || b.name.includes('Meta-Llama-3')
          if (aIsLlama3 && !bIsLlama3) return -1
          if (!aIsLlama3 && bIsLlama3) return 1
        }
        
        // Third priority: Sort by size within each subgroup
        return getModelSize(b.name) - getModelSize(a.name)
      })
    })

    // Convert to ModelGroup array
    const familyNames: Record<string, string> = {
      mistral: 'Mistral & Mixtral',
      llama: 'Meta Llama',
      gemma: 'Google Gemma',
      dialogpt: 'Microsoft DialoGPT',
      other: 'Other Models'
    }

    return Object.entries(groups).map(([family, models]) => ({
      family,
      displayName: familyNames[family] || family,
      models,
      expanded: false
    })).sort((a, b) => {
      // Sort groups: Mistral first, then Llama, then others
      if (a.family === 'mistral') return -1
      if (b.family === 'mistral') return 1
      if (a.family === 'llama') return -1
      if (b.family === 'llama') return 1
      return 0
    })
  }

  // Fetch available models
  const fetchModels = async () => {
    try {
      console.log('🔍 Fetching models from API...')
      const response = await fetch('/api/v1/models/available')
      
      console.log('📡 API Response:', {
        status: response.status,
        ok: response.ok
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('🔍 Models data:', data)
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
        console.error('❌ Failed to fetch models:', response.status)
        
        // Fallback to hardcoded models if API fails
        const fallbackModels: ModelStatus[] = [
          {
            name: 'TheBloke/Mistral-7B-Instruct-v0.2-GGUF',
            provider: 'huggingface',
            is_loaded: false,
            is_downloading: false,
            download_progress: 0
          },
          {
            name: 'TheBloke/Mistral-7B-Instruct-v0.1-GGUF',
            provider: 'huggingface',
            is_loaded: false,
            is_downloading: false,
            download_progress: 0
          },
          {
            name: 'TheBloke/Mixtral-8x7B-Instruct-v0.1-GGUF',
            provider: 'huggingface',
            is_loaded: false,
            is_downloading: false,
            download_progress: 0
          },
          {
            name: 'microsoft/DialoGPT-small',
            provider: 'huggingface',
            is_loaded: false,
            is_downloading: false,
            download_progress: 0
          }
        ]
        
        console.log('🔄 Using fallback models:', fallbackModels)
        setModels(fallbackModels)
        
        toast({
          title: "API Unavailable",
          description: "Using fallback models. Backend API may not be running.",
          variant: "default"
        })
      }
    } catch (error) {
      console.error('❌ Error fetching models:', error)
      
      // Fallback to hardcoded models on error
      const fallbackModels: ModelStatus[] = [
        {
          name: 'TheBloke/Mistral-7B-Instruct-v0.2-GGUF',
          provider: 'huggingface',
          is_loaded: false,
          is_downloading: false,
          download_progress: 0
        },
        {
          name: 'TheBloke/Mistral-7B-Instruct-v0.1-GGUF',
          provider: 'huggingface',
          is_loaded: false,
          is_downloading: false,
          download_progress: 0
        },
        {
          name: 'TheBloke/Mixtral-8x7B-Instruct-v0.1-GGUF',
          provider: 'huggingface',
          is_loaded: false,
          is_downloading: false,
          download_progress: 0
        },
        {
          name: 'microsoft/DialoGPT-small',
          provider: 'huggingface',
          is_loaded: false,
          is_downloading: false,
          download_progress: 0
        }
      ]
      
      console.log('🔄 Using fallback models due to error:', fallbackModels)
      setModels(fallbackModels)
      
      toast({
        title: "Connection Error",
        description: "Using fallback models. Check if backend is running.",
        variant: "default"
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
          setDownloadingModels(prev => {
            const newSet = new Set(prev)
            newSet.delete(modelName)
            return newSet
          })
          fetchModels()
        } else if (data.status === 'downloading') {
          console.log(`📥 Starting download polling for ${modelName}`)
          toast({
            title: "Download Started",
            description: `Started downloading ${modelName}. This may take several minutes.`,
          })
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
            setDownloadProgress(prev => {
              const newProgress = { ...prev }
              delete newProgress[modelName]
              return newProgress
            })
            toast({
              title: "Download Complete",
              description: `Model ${modelName} has been downloaded successfully!`,
            })
            fetchModels()
          } else if (data.status === 'failed') {
            clearInterval(pollInterval)
            setDownloadingModels(prev => {
              const newSet = new Set(prev)
              newSet.delete(modelName)
              return newSet
            })
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
        }
      } catch (error) {
        console.error('Error polling download progress:', error)
        clearInterval(pollInterval)
      }
    }, 2000)

    setTimeout(() => {
      clearInterval(pollInterval)
    }, 600000)
  }

  // Get model size category
  const getModelSizeCategory = (modelName: string) => {
    const size = getModelSize(modelName)
    if (size >= 70) return 'Very Large (70B+ parameters)'
    if (size >= 10) return 'Large (10B+ parameters)'
    if (size >= 7) return 'Large (7B parameters)'
    if (size >= 2) return 'Medium (2B parameters)'
    if (size >= 0.5) return 'Medium (500M+ parameters)'
    return 'Small (100M+ parameters)'
  }

  // Get estimated download time
  const getEstimatedDownloadTime = (modelName: string) => {
    const size = getModelSize(modelName)
    if (size >= 70) return '15-30 minutes'
    if (size >= 10) return '8-15 minutes'
    if (size >= 7) return '5-10 minutes'
    if (size >= 2) return '3-5 minutes'
    return '30 seconds - 2 minutes'
  }

  // Get model variant type
  const getModelVariant = (modelName: string) => {
    if (modelName.includes('GGUF')) return 'Quantized'
    if (modelName.includes('Instruct') || modelName.includes('chat')) return 'Instruct'
    if (modelName.includes('Base') || (!modelName.includes('Instruct') && !modelName.includes('chat'))) return 'Base'
    return 'Standard'
  }

  useEffect(() => {
    fetchModels()
  }, [])

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

  const groupedModels = getGroupedModels()
    .sort((a, b) => {
      if (a.family === 'mistral') return -1;
      if (b.family === 'mistral') return 1;
      return 0;
    });

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

      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Filters & Controls</span>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                {showAdvanced ? 'Hide' : 'Show'} Advanced Variants
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    console.log('🧪 Testing Models API endpoints...')
                    
                    const endpoints = [
                      '/api/v1/models/available',
                      '/api/v1/models/list',
                      '/api/v1/models/mock-status',
                      '/health'
                    ]
                    
                    const results: Record<string, any> = {}
                    
                    for (const endpoint of endpoints) {
                      try {
                        const response = await fetch(endpoint)
                        const data = await response.json()
                        results[endpoint] = {
                          status: response.status,
                          ok: response.ok,
                          data: data
                        }
                        console.log(`✅ ${endpoint}:`, results[endpoint])
                      } catch (error) {
                        results[endpoint] = {
                          status: 'error',
                          ok: false,
                          error: error instanceof Error ? error.message : String(error)
                        }
                        console.error(`❌ ${endpoint}:`, error)
                      }
                    }
                    
                    console.log('🧪 All Models API test results:', results)
                    
                    const workingEndpoints = Object.keys(results).filter(k => results[k].ok)
                    const failedEndpoints = Object.keys(results).filter(k => !results[k].ok)
                    
                    let message = `Models API Test Results:\n\n`
                    message += `✅ Working (${workingEndpoints.length}): ${workingEndpoints.join(', ')}\n\n`
                    message += `❌ Failed (${failedEndpoints.length}): ${failedEndpoints.join(', ')}\n\n`
                    
                    if (results['/api/v1/models/available']?.ok) {
                      const models = results['/api/v1/models/available'].data
                      message += `📋 Models found: ${models.length}\n`
                      message += `Models: ${models.map((m: any) => m.name).join(', ')}`
                    }
                    
                    alert(message)
                  } catch (error) {
                    console.error('Comprehensive Models API test failed:', error)
                    alert('Comprehensive Models API test failed: ' + error)
                  }
                }}
              >
                🐛 Test API
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {/* Family Filter */}
            <div>
              <label className="block text-sm font-medium mb-1">Filter by Family</label>
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value as FilterOption)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Families</option>
                <option value="mistral">Mistral & Mixtral</option>
                <option value="llama">Meta Llama 3</option>
                <option value="gemma">Google Gemma</option>
                <option value="dialogpt">Microsoft DialoGPT</option>
                <option value="recommended">Recommended Only</option>
              </select>
            </div>

            {/* Sort Options */}
            <div>
              <label className="block text-sm font-medium mb-1">Sort by</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value="size">Size (Largest First)</option>
                <option value="name">Name (A-Z)</option>
                <option value="status">Status (Loaded First)</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Model Groups */}
      <div className="space-y-6">
        {groupedModels.map((group) => (
          <Card key={group.family}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{group.displayName}</span>
                <Badge variant="outline" className="text-xs">
                  {group.models.length} models
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.models.map((model) => {
                  const isDownloading = downloadingModels.has(model.name)
                  const progress = downloadProgress[model.name] || 0
                  
                  return (
                    <Card key={model.name} className="relative">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-sm font-semibold truncate">
                              {model.name.split('/').pop()}
                            </CardTitle>
                            <CardDescription className="text-xs text-muted-foreground">
                              {model.name}
                            </CardDescription>
                          </div>
                          <div className="flex flex-col items-end space-y-1">
                            {isRecommended(model.name) && (
                              <Badge variant="default" className="bg-purple-100 text-purple-800 border-purple-200 text-xs">
                                ⭐ Recommended
                              </Badge>
                            )}
                            {isGPURecommended(model.name) && (
                              <Badge variant="default" className="bg-orange-100 text-orange-800 border-orange-200 text-xs">
                                🚀 GPU Recommended
                              </Badge>
                            )}
                            {model.is_loaded ? (
                              <Badge variant="default" className="bg-green-100 text-green-800 border-green-200 text-xs">
                                <span className="mr-1">✅</span>
                                Loaded
                              </Badge>
                            ) : isDownloading ? (
                              <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1"></div>
                                Downloading
                              </Badge>
                            ) : model.download_progress === 100 ? (
                              <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200 text-xs">
                                <span className="mr-1">📦</span>
                                On Disk
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground border-gray-300 text-xs">
                                <span className="mr-1">⏳</span>
                                Not Downloaded
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="space-y-3">
                        {/* Model Info */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Size:</span>
                            <span className="font-medium">{getModelSizeCategory(model.name)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Type:</span>
                            <span className="font-medium">{getModelVariant(model.name)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Provider:</span>
                            <span className="font-medium">{model.provider}</span>
                          </div>
                        </div>

                        {/* Download Progress */}
                        {isDownloading && (
                          <div className="space-y-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-blue-800">Downloading...</span>
                              <span className="text-xs font-bold text-blue-800">{Math.round(progress)}%</span>
                            </div>
                            <Progress value={progress} className="h-1 bg-blue-100" />
                          </div>
                        )}

                        {/* Action Button */}
                        <div className="pt-1">
                          {model.is_loaded ? (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="w-full bg-green-50 border-green-200 text-green-800 hover:bg-green-100 text-xs" 
                              disabled
                            >
                              <span className="mr-1">✅</span>
                              Ready to Use
                            </Button>
                          ) : isDownloading ? (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="w-full bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100 text-xs" 
                              disabled
                            >
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1"></div>
                              {Math.round(progress)}%
                            </Button>
                          ) : model.download_progress === 100 ? (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="w-full bg-orange-50 border-orange-200 text-orange-800 hover:bg-orange-100 text-xs"
                              disabled
                            >
                              <span className="mr-1">📦</span>
                              On Disk
                            </Button>
                          ) : (
                            <Button 
                              onClick={() => downloadModel(model.name)}
                              size="sm"
                              className="w-full bg-gray-50 border-gray-200 text-gray-800 hover:bg-gray-100 text-xs"
                              disabled={downloadingModels.size > 0}
                            >
                              <span className="mr-1">📥</span>
                              Download
                            </Button>
                          )}
                        </div>

                        {/* Download Time Estimate */}
                        {!model.is_loaded && !isDownloading && (
                          <p className="text-xs text-muted-foreground text-center">
                            ⏱️ {getEstimatedDownloadTime(model.name)}
                          </p>
                        )}

                        {/* GPU Warning for GPU-recommended models */}
                        {isGPURecommended(model.name) && (
                          <div className="p-2 bg-orange-50 border border-orange-200 rounded-md">
                            <p className="text-xs text-orange-800 text-center">
                              <span className="font-medium">⚠️ GPU Recommended:</span> This model will be very slow on CPU. Consider GPU setup for better performance.
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        ))}
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
                  <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-300 text-xs">
                    <span className="mr-1">⏳</span>
                    Not Downloaded
                  </Badge>
                  <span className="text-sm text-muted-foreground">Ready to download</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1"></div>
                    Downloading
                  </Badge>
                  <span className="text-sm text-muted-foreground">Currently downloading</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200 text-xs">
                    <span className="mr-1">📦</span>
                    On Disk
                  </Badge>
                  <span className="text-sm text-muted-foreground">On disk, ready to load</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="default" className="bg-green-100 text-green-800 border-green-200 text-xs">
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