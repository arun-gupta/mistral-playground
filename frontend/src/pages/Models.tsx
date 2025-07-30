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
  const [loadingModels, setLoadingModels] = useState<Set<string>>(new Set())
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({})
  const [sortBy, setSortBy] = useState<SortOption>('size')
  const [filterBy, setFilterBy] = useState<FilterOption>('all')
  const [showAdvanced, setShowAdvanced] = useState(true)  // Changed from false to true
  const [showDownloadedOnly, setShowDownloadedOnly] = useState(false)  // New toggle for downloaded models
  const [showLoadedOnly, setShowLoadedOnly] = useState(false)  // New toggle for loaded models
  const [showRecommendedOnly, setShowRecommendedOnly] = useState(false)  // Toggle for recommended models
  const [showGPURecommendedOnly, setShowGPURecommendedOnly] = useState(false)  // Toggle for GPU recommended models
  const [showCPUOnly, setShowCPUOnly] = useState(false)  // Toggle for CPU-compatible models
  const [showNoAuthRequired, setShowNoAuthRequired] = useState(false)  // Toggle for models that don't require authentication
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
    // Recommended models for different use cases (excluding gated models)
    const recommended = [
      'microsoft/DialoGPT-small', // Testing
      'mistralai/Mistral-7B-Instruct-v0.2', // Full quality Mistral
      'meta-llama/Meta-Llama-3-8B-Instruct', // Official Meta Llama (requires auth)
      'meta-llama/Llama-3.1-8B-Instruct' // Official Meta Llama (requires auth)
    ]
    return recommended.includes(modelName)
  }

  // Check if model is GPU recommended
  const isGPURecommended = (modelName: string): boolean => {
    // Models that would perform significantly better with GPU
    // Only include models that are actually in our system AND need GPU
    const gpuRecommended = [
      'mistralai/Mixtral-8x7B-Instruct-v0.1', // Full Mixtral (~70B effective, ~32GB RAM)
      'mistralai/CodeMistral-7B-Instruct-v0.1', // CodeMistral (~14GB RAM, specialized)
      'meta-llama/Meta-Llama-3-14B-Instruct', // Large Llama model (~28GB RAM)
      'meta-llama/Llama-3.3-70B-Instruct' // Very large Llama model (~140GB RAM)
    ]
    return gpuRecommended.includes(modelName)
  }

  // Check if model requires authentication (gated)
  const isGatedModel = (modelName: string): boolean => {
    const gatedModels = [
      // Official Meta Llama models (require authentication)
      'meta-llama/Meta-Llama-3-8B-Instruct',
      'meta-llama/Meta-Llama-3-8B',
      'meta-llama/Meta-Llama-3-14B-Instruct',
      'meta-llama/Meta-Llama-3-14B',
      'meta-llama/Llama-3.1-8B-Instruct',
      'meta-llama/Llama-3.2-3B-Instruct',
      'meta-llama/Llama-3.2-1B',
      'meta-llama/Llama-3.3-70B-Instruct',
      'meta-llama/Llama-4-Scout-17B-16E-Instruct',
      // Google Gemma models (all require authentication)
      'google/gemma-2b-it',
      'google/gemma-2b',
      'google/gemma-7b-it',
      'google/gemma-7b',
      'google/gemma-3n-E4B-it',
      'google/gemma-3n-E4B-it-litert-preview',
      'google/gemma-3n-E2B-it-litert-preview',
      'google/gemma-3-4b-it',
      'google/gemma-3n-E2B-it',
      'google/gemma-3-27b-it'
    ]
    return gatedModels.includes(modelName)
  }

  // Check if model works well on CPU
  const isCPUCompatible = (modelName: string): boolean => {
    // Models that work well on CPU (smaller models, etc.)
    const cpuCompatible = [
      // Small models that work well on CPU
      'microsoft/DialoGPT-small',
      'microsoft/DialoGPT-medium',
      'microsoft/DialoGPT-large',
      
      // Small Mistral variants
      'mistralai/Mistral-7B-Instruct-v0.2',
      'mistralai/Mistral-7B-v0.1',
      
      // Small Llama variants (official Meta models)
      'meta-llama/Meta-Llama-3-8B-Instruct',
      'meta-llama/Meta-Llama-3-8B',
      'meta-llama/Llama-3.1-8B-Instruct'
    ]
    
    // Include small models (2B and under) that are not gated
    if (getModelSize(modelName) <= 2 && !isGatedModel(modelName)) return true
    
    return cpuCompatible.includes(modelName)
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

    // Apply loaded filter
    if (showLoadedOnly) {
      filteredModels = filteredModels.filter(model => model.is_loaded)
    }

    // Apply downloaded filter
    if (showDownloadedOnly) {
      filteredModels = filteredModels.filter(model => 
        model.download_progress === 100 || 
        model.size_on_disk || 
        model.is_loaded  // Include loaded models since they must be downloaded
      )
    }

    // Apply recommended filter
    if (showRecommendedOnly) {
      filteredModels = filteredModels.filter(model => isRecommended(model.name))
    }

    // Apply GPU recommended filter
    if (showGPURecommendedOnly) {
      filteredModels = filteredModels.filter(model => isGPURecommended(model.name))
    }

    // Apply CPU compatibility filter
    if (showCPUOnly) {
      filteredModels = filteredModels.filter(model => isCPUCompatible(model.name))
    }

    // Apply no authentication required filter
    if (showNoAuthRequired) {
      filteredModels = filteredModels.filter(model => !isGatedModel(model.name))
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

  const downloadModel = async (modelName: string) => {
    try {
      console.log(`📥 Starting download for ${modelName}`)
      
      // Add to downloading set
      setDownloadingModels(prev => new Set(prev).add(modelName))
      
      const response = await fetch('/api/v1/models/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model_name: modelName,
          provider: 'huggingface'
        }),
      })

      if (!response.ok) {
        throw new Error(`Download request failed: ${response.status}`)
      }

      const result = await response.json()
      console.log(`📥 Download response for ${modelName}:`, result)

      if (result.status === 'downloading') {
        // Start polling for progress
        pollDownloadProgress(modelName)
        
        toast({
          title: "Download Started",
          description: `Started downloading ${modelName}. This may take several minutes.`,
        })
      } else if (result.status === 'completed') {
        // Download completed immediately
        setDownloadingModels(prev => {
          const newSet = new Set(prev)
          newSet.delete(modelName)
          return newSet
        })
        
        toast({
          title: "Download Complete",
          description: `Model ${modelName} has been downloaded successfully!`,
        })
        
        // Refresh models to update status
        fetchModels()
      } else {
        throw new Error(`Download failed: ${result.message}`)
      }
    } catch (error) {
      console.error(`Error downloading model ${modelName}:`, error)
      
      // Remove from downloading set
      setDownloadingModels(prev => {
        const newSet = new Set(prev)
        newSet.delete(modelName)
        return newSet
      })
      
      toast({
        title: "Download Failed",
        description: `Failed to download ${modelName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      })
    }
  }

  const loadModel = async (modelName: string) => {
    try {
      console.log(`⚡ Loading model ${modelName} into memory`)
      
      // Add to loading set (we'll need to track this)
      setLoadingModels(prev => new Set(prev).add(modelName))
      
      // For now, we'll simulate loading by making a test request
      // In a real implementation, this would call a load endpoint
      const response = await fetch('/api/v1/models/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: "Hello, this is a test to load the model.",
          model_name: modelName,
          provider: 'huggingface',
          temperature: 0.7,
          max_tokens: 10,
          top_p: 0.9
        }),
      })

      if (!response.ok) {
        throw new Error(`Load request failed: ${response.status}`)
      }

      const result = await response.json()
      console.log(`⚡ Load response for ${modelName}:`, result)

      // Remove from loading set
      setLoadingModels(prev => {
        const newSet = new Set(prev)
        newSet.delete(modelName)
        return newSet
      })
      
      toast({
        title: "Model Loaded",
        description: `Model ${modelName} has been loaded into memory and is ready to use!`,
      })
      
      // Refresh models to update status
      fetchModels()
    } catch (error) {
      console.error(`Error loading model ${modelName}:`, error)
      
      // Remove from loading set
      setLoadingModels(prev => {
        const newSet = new Set(prev)
        newSet.delete(modelName)
        return newSet
      })
      
      toast({
        title: "Load Failed",
        description: `Failed to load ${modelName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      })
    }
  }

  const downloadAndLoadModel = async (modelName: string) => {
    try {
      console.log(`⚡⚡ Starting download and load for ${modelName}`)
      
      // Step 1: Start download only
      setDownloadingModels(prev => new Set(prev).add(modelName))
      setLoadingModels(prev => {
        const newSet = new Set(prev)
        newSet.delete(modelName) // Ensure loading state is clear
        return newSet
      })

      const downloadResponse = await fetch('/api/v1/models/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model_name: modelName,
          provider: 'huggingface'
        }),
      })

      if (!downloadResponse.ok) {
        throw new Error(`Download request failed: ${downloadResponse.status}`)
      }

      const downloadResult = await downloadResponse.json()
      console.log(`📥 Download response for ${modelName}:`, downloadResult)

      if (downloadResult.status === 'downloading') {
        // Start polling for download progress
        pollDownloadProgress(modelName)
        toast({
          title: "Download Started",
          description: `Started downloading ${modelName}. This may take several minutes.`,
        })
        
        // Don't wait here - let the polling handle the completion
        // The pollDownloadProgress function will handle the completion and start loading
        return
      }
        
        const loadResponse = await fetch('/api/v1/models/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: "Hello, this is a test to load the model.",
            model_name: modelName,
            provider: 'huggingface',
            temperature: 0.7,
            max_tokens: 10,
            top_p: 0.9
          }),
        })

        if (!loadResponse.ok) {
          throw new Error(`Load request failed: ${loadResponse.status}`)
        }

        const loadResult = await loadResponse.json()
        console.log(`⚡ Load response for ${modelName}:`, loadResult)

        setLoadingModels(prev => {
          const newSet = new Set(prev)
          newSet.delete(modelName)
          return newSet
        })
        
        toast({
          title: "Model Loaded",
          description: `Model ${modelName} has been loaded into memory and is ready to use!`,
        })
        
      } else if (downloadResult.status === 'completed') {
        // Download was already completed, go straight to loading
        setDownloadingModels(prev => {
          const newSet = new Set(prev)
          newSet.delete(modelName)
          return newSet
        })
        
        console.log(`⚡ Starting load for ${modelName} (download already completed)`)
        setLoadingModels(prev => new Set(prev).add(modelName))
        
        const loadResponse = await fetch('/api/v1/models/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: "Hello, this is a test to load the model.",
            model_name: modelName,
            provider: 'huggingface',
            temperature: 0.7,
            max_tokens: 10,
            top_p: 0.9
          }),
        })

        if (!loadResponse.ok) {
          throw new Error(`Load request failed: ${loadResponse.status}`)
        }

        const loadResult = await loadResponse.json()
        console.log(`⚡ Load response for ${modelName}:`, loadResult)

        setLoadingModels(prev => {
          const newSet = new Set(prev)
          newSet.delete(modelName)
          return newSet
        })
        
        toast({
          title: "Model Loaded",
          description: `Model ${modelName} has been loaded into memory and is ready to use!`,
        })
        
      } else {
        throw new Error(`Download failed: ${downloadResult.message}`)
      }

      fetchModels()

    } catch (error) {
      console.error(`Error downloading and loading model ${modelName}:`, error)
      setDownloadingModels(prev => {
        const newSet = new Set(prev)
        newSet.delete(modelName)
        return newSet
      })
      setLoadingModels(prev => {
        const newSet = new Set(prev)
        newSet.delete(modelName)
        return newSet
      })
      toast({
        title: "Download and Load Failed",
        description: `Failed to download and load ${modelName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
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
            
            // Automatically start loading the model after download completion
            console.log(`⚡ Auto-loading ${modelName} after download completion`)
            setLoadingModels(prev => new Set(prev).add(modelName))
            
            try {
              const loadResponse = await fetch('/api/v1/models/generate', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  prompt: "Hello, this is a test to load the model.",
                  model_name: modelName,
                  provider: 'huggingface',
                  temperature: 0.7,
                  max_tokens: 10,
                  top_p: 0.9
                }),
              })

              if (!loadResponse.ok) {
                throw new Error(`Load request failed: ${loadResponse.status}`)
              }

              const loadResult = await loadResponse.json()
              console.log(`✅ Load result for ${modelName}:`, loadResult)
              
              setLoadingModels(prev => {
                const newSet = new Set(prev)
                newSet.delete(modelName)
                return newSet
              })
              
              toast({
                title: "Model Ready",
                description: `Model ${modelName} has been loaded and is ready to use!`,
              })
              
              fetchModels()
            } catch (error) {
              console.error(`Error auto-loading model ${modelName}:`, error)
              setLoadingModels(prev => {
                const newSet = new Set(prev)
                newSet.delete(modelName)
                return newSet
              })
              toast({
                title: "Load Failed",
                description: `Failed to load ${modelName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
                variant: "destructive"
              })
            }
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
    setLoadingModels(new Set())
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Models</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-800">{models.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Available models</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Downloaded</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {models.filter(m => m.download_progress === 100 || m.size_on_disk).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">On disk, ready to load</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Loaded</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {models.filter(m => m.is_loaded).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Ready to use</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Operations Indicator */}
      {(downloadingModels.size > 0 || loadingModels.size > 0) && (
        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center justify-center space-x-4 text-sm text-blue-700">
            {downloadingModels.size > 0 && (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1"></div>
                <span>{downloadingModels.size} downloading</span>
              </div>
            )}
            {loadingModels.size > 0 && (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-orange-600 mr-1"></div>
                <span>{loadingModels.size} loading</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Filters & Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Unified Controls Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Family Filter */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Filter by Family</label>
                <select
                  value={filterBy}
                  onChange={(e) => setFilterBy(e.target.value as FilterOption)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                <label className="block text-sm font-medium mb-2 text-gray-700">Sort by</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="size">Size (Largest First)</option>
                  <option value="name">Name (A-Z)</option>
                  <option value="status">Status (Loaded First)</option>
                </select>
              </div>

              {/* Advanced Variants Toggle */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Advanced Variants</label>
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                      showAdvanced ? 'bg-green-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        showAdvanced ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className="text-sm text-gray-600">
                    {showAdvanced ? 'Show All' : 'Hide Advanced'}
                  </span>
                </div>
              </div>

              {/* Test API Button */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">API Testing</label>
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
                  className="w-full"
                >
                  🐛 Test API
                </Button>
              </div>
            </div>

            {/* Model Filters Section */}
            <div className="border-t border-gray-200 pt-4">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
                <h3 className="text-base font-semibold text-gray-700 mb-4">Model Filters</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Downloaded Models Toggle */}
                  <div className="flex items-center justify-between p-3 bg-teal-50 border border-teal-200 rounded-md">
                    <div>
                      <span className="text-sm font-medium text-teal-800">Downloaded Models Only</span>
                      <p className="text-xs text-teal-600 mt-1">Show models already downloaded</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        type="button"
                        onClick={() => setShowDownloadedOnly(!showDownloadedOnly)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${
                          showDownloadedOnly ? 'bg-teal-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            showDownloadedOnly ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                      <span className="text-xs font-medium text-teal-800">
                        {showDownloadedOnly ? 'ON' : 'OFF'}
                      </span>
                    </div>
                  </div>

                  {/* Loaded Models Toggle */}
                  <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <div>
                      <span className="text-sm font-medium text-blue-800">Loaded Models Only</span>
                      <p className="text-xs text-blue-600 mt-1">Show models ready to use</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        type="button"
                        onClick={() => setShowLoadedOnly(!showLoadedOnly)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                          showLoadedOnly ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            showLoadedOnly ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                      <span className="text-xs font-medium text-blue-800">
                        {showLoadedOnly ? 'ON' : 'OFF'}
                      </span>
                    </div>
                  </div>

                  {/* Recommended Models Toggle */}
                  <div className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-md">
                    <div>
                      <span className="text-sm font-medium text-purple-800">Recommended Models Only</span>
                      <p className="text-xs text-purple-600 mt-1">Show curated best models</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        type="button"
                        onClick={() => setShowRecommendedOnly(!showRecommendedOnly)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                          showRecommendedOnly ? 'bg-purple-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            showRecommendedOnly ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                      <span className="text-xs font-medium text-purple-800">
                        {showRecommendedOnly ? 'ON' : 'OFF'}
                      </span>
                    </div>
                  </div>

                  {/* GPU Recommended Models Toggle */}
                  <div className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-md">
                    <div>
                      <span className="text-sm font-medium text-orange-800">GPU Recommended Only</span>
                      <p className="text-xs text-orange-600 mt-1">Show GPU-optimized models</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        type="button"
                        onClick={() => setShowGPURecommendedOnly(!showGPURecommendedOnly)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                          showGPURecommendedOnly ? 'bg-orange-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            showGPURecommendedOnly ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                      <span className="text-xs font-medium text-orange-800">
                        {showGPURecommendedOnly ? 'ON' : 'OFF'}
                      </span>
                    </div>
                  </div>

                  {/* CPU Compatible Models Toggle */}
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-md">
                    <div>
                      <span className="text-sm font-medium text-green-800">Works on CPU</span>
                      <p className="text-xs text-green-600 mt-1">Show CPU-compatible models</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        type="button"
                        onClick={() => setShowCPUOnly(!showCPUOnly)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                          showCPUOnly ? 'bg-green-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            showCPUOnly ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                      <span className="text-xs font-medium text-green-800">
                        {showCPUOnly ? 'ON' : 'OFF'}
                      </span>
                    </div>
                  </div>

                  {/* No Authentication Required Toggle */}
                  <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <div>
                      <span className="text-sm font-medium text-yellow-800">No Auth Required</span>
                      <p className="text-xs text-yellow-600 mt-1">Hide gated models</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        type="button"
                        onClick={() => setShowNoAuthRequired(!showNoAuthRequired)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 ${
                          showNoAuthRequired ? 'bg-yellow-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            showNoAuthRequired ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                      <span className="text-xs font-medium text-yellow-800">
                        {showNoAuthRequired ? 'ON' : 'OFF'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available Models Section */}
      <div className="mt-8">
        <h3 className="text-base font-semibold text-gray-700 mb-4">Available Models</h3>
      </div>

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
                              <Badge 
                                variant="default" 
                                className="bg-orange-100 text-orange-800 border-orange-200 text-xs cursor-help"
                                title="This model will be very slow on CPU. Consider GPU setup for better performance."
                              >
                                🚀 GPU Recommended
                              </Badge>
                            )}
                            {isCPUCompatible(model.name) && (
                              <Badge variant="default" className="bg-green-100 text-green-800 border-green-200 text-xs">
                                💻 CPU Compatible
                              </Badge>
                            )}
                            {isGatedModel(model.name) && (
                              <a
                                href={`https://huggingface.co/${model.name}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block"
                                title="Click to visit HuggingFace page and request access"
                              >
                                <Badge variant="default" className="bg-red-100 text-red-800 border-red-200 text-xs cursor-pointer hover:bg-red-200 transition-colors">
                                  🔒 Requires Access
                                </Badge>
                              </a>
                            )}
                            {model.is_loaded ? (
                              <Badge variant="default" className="bg-green-100 text-green-800 border-green-200 text-xs">
                                <span className="mr-1">✅</span>
                                Ready
                              </Badge>
                            ) : downloadingModels.has(model.name) ? (
                              <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1"></div>
                                Downloading
                              </Badge>
                            ) : loadingModels.has(model.name) ? (
                              <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200 text-xs">
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-orange-600 mr-1"></div>
                                Loading
                              </Badge>
                            ) : model.download_progress === 100 || model.size_on_disk ? (
                              <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200 text-xs">
                                <span className="mr-1">📦</span>
                                Downloaded
                              </Badge>
                            ) : null}
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
                        {downloadingModels.has(model.name) && (
                          <div className="space-y-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-blue-800">Downloading...</span>
                              <span className="text-xs font-bold text-blue-800">{Math.round(downloadProgress[model.name] || 0)}%</span>
                            </div>
                            <Progress value={downloadProgress[model.name] || 0} className="h-1 bg-blue-100" />
                          </div>
                        )}

                        {/* Loading Progress */}
                        {loadingModels.has(model.name) && (
                          <div className="space-y-2 p-2 bg-orange-50 border border-orange-200 rounded-md">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-orange-800">Loading model into memory...</span>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-orange-600"></div>
                            </div>
                            <p className="text-xs text-orange-700">This may take a few minutes for large models</p>
                          </div>
                        )}

                        {/* Action Button */}
                        <div className="pt-1">
                          {model.is_loaded ? (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="w-full bg-green-50 border-green-200 text-green-800 hover:bg-green-100 text-xs" 
                              onClick={() => {
                                // Navigate to playground with this model pre-selected
                                window.location.href = `/playground?model=${encodeURIComponent(model.name)}`
                              }}
                            >
                              <span className="mr-1">✅</span>
                              Use Now
                            </Button>
                          ) : downloadingModels.has(model.name) ? (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="w-full bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100 text-xs" 
                              disabled
                            >
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1"></div>
                              Downloading {Math.round(downloadProgress[model.name] || 0)}%
                            </Button>
                          ) : loadingModels.has(model.name) ? (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="w-full bg-orange-50 border-orange-200 text-orange-800 hover:bg-orange-100 text-xs" 
                              disabled
                            >
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-orange-600 mr-1"></div>
                              Loading...
                            </Button>
                          ) : model.download_progress === 100 || model.size_on_disk ? (
                            <Button 
                              onClick={() => loadModel(model.name)}
                              size="sm"
                              className="w-full bg-orange-50 border-orange-200 text-orange-800 hover:bg-orange-100 text-xs"
                              disabled={downloadingModels.has(model.name) || loadingModels.has(model.name)}
                            >
                              <span className="mr-1">⚡</span>
                              Load Model
                            </Button>
                          ) : (
                            <Button 
                              onClick={() => downloadAndLoadModel(model.name)}
                              size="sm"
                              className="w-full bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100 text-xs"
                              disabled={downloadingModels.has(model.name) || loadingModels.has(model.name)}
                            >
                              <span className="mr-1">📥</span>
                              Download & Load
                            </Button>
                          )}
                        </div>

                        {/* Download Time Estimate */}
                        {!model.is_loaded && !isDownloading && (
                          <p className="text-xs text-muted-foreground text-center">
                            ⏱️ {getEstimatedDownloadTime(model.name)}
                          </p>
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
                    <span className="mr-1">📋</span>
                    Available
                  </Badge>
                  <span className="text-sm text-muted-foreground">Click "Download & Load" to get started</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1"></div>
                    Downloading
                  </Badge>
                  <span className="text-sm text-muted-foreground">Currently downloading to disk</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200 text-xs">
                    <span className="mr-1">📦</span>
                    Downloaded
                  </Badge>
                  <span className="text-sm text-muted-foreground">On disk, click "Load Model" to use</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="default" className="bg-green-100 text-green-800 border-green-200 text-xs">
                    <span className="mr-1">✅</span>
                    Ready
                  </Badge>
                  <span className="text-sm text-muted-foreground">Loaded in memory, click "Use Now"</span>
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
                <li>• <strong>Parallel processing:</strong> Download/load multiple models simultaneously</li>
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
          
          {/* Gated Models Section */}
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <h4 className="font-medium mb-3 text-red-800">🔒 Gated Models (Require Authentication)</h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Badge variant="default" className="bg-red-100 text-red-800 border-red-200 text-xs">
                  🔒 Requires Access
                </Badge>
                <span className="text-sm text-red-700">Models that need Hugging Face authentication (click badge to visit model page)</span>
              </div>
              <div className="text-sm text-red-700 space-y-2">
                <p><strong>Why some models require authentication:</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Llama 3 models require accepting Meta's license terms</li>
                  <li>Some models have usage restrictions or commercial licenses</li>
                  <li>Hugging Face requires explicit permission for certain models</li>
                </ul>
                <p><strong>How to get access:</strong></p>
                <ol className="list-decimal list-inside space-y-1 ml-4">
                  <li>Visit the model page on Hugging Face</li>
                  <li>Click "Access Request" and accept the license terms</li>
                  <li>Wait for approval (usually instant for Llama 3)</li>
                  <li>Set up your Hugging Face token in the environment</li>
                </ol>
                <div className="mt-3 p-3 bg-white border border-red-300 rounded-md">
                  <p className="text-sm font-medium text-red-800 mb-2">🔗 Quick Access Links:</p>
                  <div className="space-y-1 text-sm">
                    <a 
                      href="https://huggingface.co/meta-llama/Meta-Llama-3-8B-Instruct" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline block"
                    >
                      • Meta Llama 3 8B Instruct (Official)
                    </a>
                    <a 
                      href="https://huggingface.co/meta-llama/Meta-Llama-3-8B" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline block"
                    >
                      • Meta Llama 3 8B Base (Official)
                    </a>
                    <a 
                      href="https://huggingface.co/google/gemma-2b-it" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline block"
                    >
                      • Google Gemma 2B Instruct
                    </a>
                  </div>
                </div>
                <p className="text-sm mt-3">
                  <strong>💡 Alternative:</strong> Use open models like{' '}
                  <span className="font-mono text-xs bg-gray-100 px-1 rounded">TheBloke/Mistral-7B-Instruct-v0.2-GGUF</span>{' '}
                  that don't require authentication.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Models 