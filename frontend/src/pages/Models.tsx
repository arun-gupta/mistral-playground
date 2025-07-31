import { useState, useEffect } from 'react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Progress } from '../components/ui/progress'
import { useToast } from '../components/ui/use-toast'
import QuickFilters from '../components/QuickFilters'
import {
  getModelFamily,
  getModelSize,
  isRecommended,
  isGatedModel,
  isGPURequired,
  isSmallModel,
  isLargeModel,
  getDiskSpaceRequirement,
  getEstimatedDownloadTime,
  getModelSizeCategory,
  getModelVariant,
  getActiveFilterCount,
  getModelFamilyDisplayName,
  isModelSizeWithinThreshold
} from '../utils/modelUtils'

interface ModelStatus {
  name: string
  provider: string
  is_loaded: boolean
  is_downloading: boolean
  download_progress?: number
  size_on_disk?: string
  last_used?: string
  load_time?: number
  is_hosted?: boolean
  cost_per_1k_tokens?: {
    input: number
    output: number
  }
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



const Models = () => {
  const [models, setModels] = useState<ModelStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [downloadingModels, setDownloadingModels] = useState<Set<string>>(new Set())
  const [loadingModels, setLoadingModels] = useState<Set<string>>(new Set())
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({})


  const [showDownloadedOnly, setShowDownloadedOnly] = useState(false)  // New toggle for downloaded models
  const [showLoadedOnly, setShowLoadedOnly] = useState(false)  // New toggle for loaded models
  const [showReadyToUseOnly, setShowReadyToUseOnly] = useState(false)  // Toggle for ready to use models
  const [showRecommendedOnly, setShowRecommendedOnly] = useState(false)  // Toggle for recommended models


  const [showNoAuthRequired, setShowNoAuthRequired] = useState(false)  // Toggle for models that don't require authentication
  const [maxModelSize, setMaxModelSize] = useState(10)  // Slider for maximum model size (in billions of parameters) - increased to show Mistral 7B models
  const [offloadingModels, setOffloadingModels] = useState<Set<string>>(new Set())  // Models being offloaded
  const [deletingModels, setDeletingModels] = useState<Set<string>>(new Set())  // Models being deleted
  const [testingModels, setTestingModels] = useState<Set<string>>(new Set())  // Models being tested
  const [testedReadyModels, setTestedReadyModels] = useState<Set<string>>(new Set())  // Models confirmed ready after test
  const [hostedModels, setHostedModels] = useState<Record<string, string[]>>({})
  const [showHostedOnly, setShowHostedOnly] = useState(false)
  const { toast } = useToast()

  // Hosted models metadata (Top 3 from each provider)
  const hostedModelMetadata: Record<string, any> = {
    // OpenAI Models (Top 3)
    'gpt-4o-mini': { provider: 'openai', cost_per_1k_tokens: { input: 0.15, output: 0.60 } },
    'gpt-3.5-turbo': { provider: 'openai', cost_per_1k_tokens: { input: 0.50, output: 1.50 } },
    'gpt-4o': { provider: 'openai', cost_per_1k_tokens: { input: 2.50, output: 10.00 } },
    
    // Anthropic Models (Top 3)
    'claude-3-5-haiku-20241022': { provider: 'anthropic', cost_per_1k_tokens: { input: 0.25, output: 1.25 } },
    'claude-3-5-sonnet-20241022': { provider: 'anthropic', cost_per_1k_tokens: { input: 3.00, output: 15.00 } },
    'claude-3-opus-20240229': { provider: 'anthropic', cost_per_1k_tokens: { input: 15.00, output: 75.00 } },
    
    // Google Gemini Models (Top 3)
    'gemini-1.5-flash': { provider: 'google', cost_per_1k_tokens: { input: 0.075, output: 0.30 } },
    'gemini-1.0-pro': { provider: 'google', cost_per_1k_tokens: { input: 1.50, output: 4.50 } },
    'gemini-1.5-pro': { provider: 'google', cost_per_1k_tokens: { input: 3.50, output: 10.50 } }
  }

  // Model categorization and filtering logic


  // Group and filter models
  const getGroupedModels = (): ModelGroup[] => {
    let filteredModels = models

    // Apply loaded filter
    if (showLoadedOnly) {
      filteredModels = filteredModels.filter(model => model.is_loaded)
    }

    // Apply ready to use filter
    if (showReadyToUseOnly) {
      filteredModels = filteredModels.filter(model => {
        // Hosted models are always ready
        if (model.is_hosted) return true
        // Local models must be both loaded AND tested
        return model.is_loaded && testedReadyModels.has(model.name)
      })
    }
    
    // DEBUG: Log the filtered models to see what's happening
    console.log('🔍 Filtered models after Ready to Use filter:', filteredModels.map(m => m.name))
    console.log('🔍 ShowReadyToUseOnly:', showReadyToUseOnly)
    console.log('🔍 TestedReadyModels:', Array.from(testedReadyModels))

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



    // Apply no authentication required filter
    if (showNoAuthRequired) {
      filteredModels = filteredModels.filter(model => !isGatedModel(model.name))
    }

    // Apply hosted only filter
    if (showHostedOnly) {
      filteredModels = filteredModels.filter(model => model.is_hosted)
    }

    // Apply size filter using slider (exclude hosted models from size filtering)
    if (maxModelSize < 70) { // Only apply filter if not showing all models
      filteredModels = filteredModels.filter(model => {
        // Skip size filtering for hosted models
        if (model.is_hosted) return true
        return isModelSizeWithinThreshold(model.name, maxModelSize)
      })
    }



    // Group by family first
    const groups: Record<string, ModelStatus[]> = {}
    filteredModels.forEach(model => {
      const family = getModelFamily(model.name)
      if (!groups[family]) groups[family] = []
      groups[family].push(model)
    })

    // Sort models within each family by size (smallest first)
    Object.keys(groups).forEach(family => {
      groups[family].sort((a, b) => getModelSize(a.name) - getModelSize(b.name))
    })

    // Convert to ModelGroup array
    return Object.entries(groups).map(([family, models]) => ({
      family,
      displayName: getModelFamilyDisplayName(family),
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

  // Fetch hosted models
  const fetchHostedModels = async () => {
    try {
      const response = await fetch('/api/v1/models/hosted')
      if (response.ok) {
        const data = await response.json()
        setHostedModels(data.providers)
      }
    } catch (error) {
      console.error('Error fetching hosted models:', error)
    }
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
        
        // Add hosted models to the data
        const allModels = [...data]
        
        // Add hosted models from each provider
        Object.entries(hostedModels).forEach(([provider, modelNames]) => {
          modelNames.forEach(modelName => {
            const metadata = hostedModelMetadata[modelName]
            if (metadata) {
              allModels.push({
                name: modelName,
                provider: metadata.provider,
                is_loaded: false,
                is_downloading: false,
                download_progress: 0,
                is_hosted: true,
                cost_per_1k_tokens: metadata.cost_per_1k_tokens
              })
            }
          })
        })
        
        setModels(allModels)
        
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
            name: 'mistralai/Mistral-7B-Instruct-v0.2',
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
          },
          {
            name: 'google/gemma-2b-it',
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
          name: 'mistralai/Mistral-7B-Instruct-v0.2',
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
        },
        {
          name: 'google/gemma-2b-it',
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



  // Check if model is small (suitable for quick testing and constrained environments)


  // Offload model from memory (unload)
  const offloadModel = async (modelName: string) => {
    if (!confirm(`Are you sure you want to offload ${modelName} from memory? This will free up RAM but you'll need to reload it to use it again.`)) {
      return
    }

    setOffloadingModels(prev => new Set(prev).add(modelName))

    try {
      const response = await fetch('/api/v1/models/offload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_name: modelName })
      })

      if (!response.ok) {
        throw new Error(`Offload request failed: ${response.status}`)
      }

      const result = await response.json()
      console.log('Offload result:', result)

      toast({
        title: "Model Offloaded",
        description: `${modelName} has been unloaded from memory and RAM has been freed.`,
      })

      fetchModels()
    } catch (error) {
      console.error('Error offloading model:', error)
      toast({
        title: "Offload Failed",
        description: `Failed to offload ${modelName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      })
    } finally {
      setOffloadingModels(prev => {
        const newSet = new Set(prev)
        newSet.delete(modelName)
        return newSet
      })
    }
  }

  // Delete model from disk
  const deleteModel = async (modelName: string) => {
    const diskSpace = getDiskSpaceRequirement(modelName)
    if (!confirm(`Are you sure you want to delete ${modelName} from disk? This will free up ${diskSpace} of disk space but you'll need to download it again to use it. This action cannot be undone.`)) {
      return
    }

    setDeletingModels(prev => new Set(prev).add(modelName))

    try {
      const response = await fetch('/api/v1/models/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_name: modelName })
      })

      if (!response.ok) {
        throw new Error(`Delete request failed: ${response.status}`)
      }

      const result = await response.json()
      console.log('Delete result:', result)

      toast({
        title: "Model Deleted",
        description: `${modelName} has been deleted from disk, freeing up ${diskSpace} of space.`,
      })

      fetchModels()
    } catch (error) {
      console.error('Error deleting model:', error)
      toast({
        title: "Delete Failed",
        description: `Failed to delete ${modelName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      })
    } finally {
      setDeletingModels(prev => {
        const newSet = new Set(prev)
        newSet.delete(modelName)
        return newSet
      })
    }
  }

  // Test model generation to confirm it's ready
  const testModelGeneration = async (modelName: string) => {
    if (testingModels.has(modelName)) return

    setTestingModels(prev => new Set(prev).add(modelName))
    
    try {
      const response = await fetch('/api/v1/models/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_name: modelName,
          prompt: "Test", // Very short test prompt
          max_tokens: 5,  // Very short response
          temperature: 0.7,
          top_p: 0.9
        })
      })

      if (response.ok) {
        const result = await response.json()
        if (result.text && !result.text.includes('error') && !result.text.includes('timeout')) {
          // Test successful - mark as ready
          setTestedReadyModels(prev => new Set(prev).add(modelName))
          toast({
            title: "Model Test Successful",
            description: `${modelName} is ready to use!`,
            variant: "default"
          })
        } else {
          // Test failed
          toast({
            title: "Model Test Failed",
            description: `${modelName} failed the generation test. It may be too slow or have issues.`,
            variant: "destructive"
          })
        }
      } else {
        const errorData = await response.json()
        toast({
          title: "Test Failed",
          description: errorData.detail || "Failed to test model generation",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error testing model:', error)
      toast({
        title: "Test Failed",
        description: "Network error while testing model",
        variant: "destructive"
      })
    } finally {
      setTestingModels(prev => {
        const newSet = new Set(prev)
        newSet.delete(modelName)
        return newSet
      })
    }
  }

  useEffect(() => {
    const initializeData = async () => {
      await fetchHostedModels()
      await fetchModels()
    }
    initializeData()
  }, [])

  useEffect(() => {
    setDownloadingModels(new Set())
    setLoadingModels(new Set())
    setOffloadingModels(new Set())
    setDeletingModels(new Set())
    setDownloadProgress({})
  }, [])

  // Refetch models when hosted models are updated
  useEffect(() => {
    if (Object.keys(hostedModels).length > 0) {
      fetchModels()
    }
  }, [hostedModels])

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
    <div className="space-y-4">
      {/* Header with inline stats */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Model Manager</h1>
          <p className="text-sm text-muted-foreground">
            Download and manage your AI models
          </p>
        </div>
        
        {/* Compact stats */}
        <div className="flex items-center space-x-6 text-sm">
          <div className="text-center">
            <div className="text-lg font-bold text-gray-800">{models.length}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-orange-600">
              {models.filter(m => !m.is_hosted && m.size_on_disk && m.size_on_disk !== '').length}
            </div>
            <div className="text-xs text-muted-foreground">Downloaded</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-green-600">
              {models.filter(m => m.is_hosted || (m.is_loaded && testedReadyModels.has(m.name))).length}
            </div>
            <div className="text-xs text-muted-foreground">Ready to Use</div>
          </div>
        </div>
      </div>

      {/* Active Operations Indicator - compact */}
      {(downloadingModels.size > 0 || loadingModels.size > 0) && (
        <div className="p-2 bg-blue-50 border border-blue-200 rounded-md">
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

      <QuickFilters
        showDownloadedOnly={showDownloadedOnly}
        setShowDownloadedOnly={setShowDownloadedOnly}
        showLoadedOnly={showLoadedOnly}
        setShowLoadedOnly={setShowLoadedOnly}
        showReadyToUseOnly={showReadyToUseOnly}
        setShowReadyToUseOnly={setShowReadyToUseOnly}
        showRecommendedOnly={showRecommendedOnly}
        setShowRecommendedOnly={setShowRecommendedOnly}
        showNoAuthRequired={showNoAuthRequired}
        setShowNoAuthRequired={setShowNoAuthRequired}
        showHostedOnly={showHostedOnly}
        setShowHostedOnly={setShowHostedOnly}
        maxModelSize={maxModelSize}
        setMaxModelSize={setMaxModelSize}
        showQuickStartButton={true}
        defaultMaxModelSize={10}
        showSizeLegend={true}
      />



      {/* Developer Tools - compact */}
      <div className="flex items-center justify-end">
        <div className="inline-flex items-center space-x-2 p-1 bg-orange-50 border border-orange-200 rounded text-xs">
          <span className="text-orange-800">🛠️</span>
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
                alert('API test failed. Check console for details.')
              }
            }}
            className="text-xs px-2 py-1 h-5 bg-orange-100 border-orange-300 text-orange-800 hover:bg-orange-200"
          >
            Test API
          </Button>
        </div>
      </div>

      {/* Available Models Section */}
      <div className="mt-4">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">Available Models</h3>
      </div>

      {/* Model Groups */}
      <div className="space-y-4">
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
            <CardContent className="pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {group.models.map((model) => {
                  const isDownloading = downloadingModels.has(model.name)
                  const progress = downloadProgress[model.name] || 0
                  
                  return (
                    <Card key={model.name} className="relative">
                      <CardHeader className="pb-2">
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
                            {isGPURequired(model.name) && (
                              <Badge 
                                variant="default" 
                                className="bg-red-100 text-red-800 border-red-200 text-xs cursor-help"
                                title="This model requires GPU for reasonable performance"
                              >
                                🚀 GPU Required
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
                          {model.is_hosted ? (
                            <>
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Cost (1k tokens):</span>
                                <span className="font-medium">
                                  ${model.cost_per_1k_tokens?.input.toFixed(3)} input / ${model.cost_per_1k_tokens?.output.toFixed(3)} output
                                </span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Type:</span>
                                <span className="font-medium">☁️ Hosted</span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Disk Space:</span>
                                <span className="font-medium">{getDiskSpaceRequirement(model.name)}</span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Type:</span>
                                <span className="font-medium">{getModelVariant(model.name)}</span>
                              </div>
                            </>
                          )}
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Provider:</span>
                            <span className="font-medium">{model.provider}</span>
                          </div>
                        </div>

                        {/* Disk Space Warning for Large Models */}
                        {isLargeModel(model.name) && !model.is_loaded && !downloadingModels.has(model.name) && (
                          <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                            <div className="flex items-start space-x-2">
                              <span className="text-yellow-600 text-sm">⚠️</span>
                              <div className="text-xs text-yellow-800">
                                <div className="font-medium">Large Model Warning</div>
                                <div>Requires {getDiskSpaceRequirement(model.name)} of disk space</div>
                                <div className="text-yellow-600 mt-1">Ensure sufficient storage before downloading</div>
                              </div>
                            </div>
                          </div>
                        )}

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
                            testedReadyModels.has(model.name) ? (
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
                            ) : (
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="w-full bg-yellow-50 border-yellow-200 text-yellow-800 hover:bg-yellow-100 text-xs" 
                                onClick={() => testModelGeneration(model.name)}
                                disabled={testingModels.has(model.name)}
                              >
                                {testingModels.has(model.name) ? (
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-yellow-600 mr-1"></div>
                                ) : (
                                  <span className="mr-1">🧪</span>
                                )}
                                {testingModels.has(model.name) ? 'Testing...' : 'Test Generation'}
                              </Button>
                            )
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
                              onClick={() => {
                                if (model.is_hosted) {
                                  // Show toast and navigate to comparison page where hosted models can be used
                                  toast({
                                    title: "Hosted Model Available",
                                    description: `Navigate to Comparison page to use ${model.name} with other models.`,
                                    variant: "default"
                                  })
                                  setTimeout(() => {
                                    window.location.href = `/comparison`
                                  }, 1500)
                                } else if (isGatedModel(model.name)) {
                                  // Check if HuggingFace token is configured
                                  const hfToken = localStorage.getItem('huggingface_token')
                                  if (hfToken) {
                                    // Token exists, try to download the model
                                    downloadAndLoadModel(model.name)
                                  } else {
                                    // No token, open HuggingFace access request page
                                    toast({
                                      title: "HuggingFace Token Required",
                                      description: "Please configure your HuggingFace token in the API Keys page first.",
                                      variant: "default"
                                    })
                                    setTimeout(() => {
                                      window.open(`https://huggingface.co/${model.name}`, '_blank')
                                    }, 1500)
                                  }
                                } else {
                                  downloadAndLoadModel(model.name)
                                }
                              }}
                              size="sm"
                              className={`w-full text-xs ${
                                model.is_hosted
                                  ? 'bg-green-50 border-green-200 text-green-800 hover:bg-green-100 cursor-pointer'
                                  : isGatedModel(model.name) 
                                  ? (localStorage.getItem('huggingface_token') 
                                    ? 'bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100 cursor-pointer'
                                    : 'bg-orange-50 border-orange-200 text-orange-800 hover:bg-orange-100 cursor-pointer')
                                  : 'bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100'
                              }`}
                              disabled={downloadingModels.has(model.name) || loadingModels.has(model.name)}
                            >
                              <span className="mr-1">
                                {model.is_hosted ? '☁️' : isGatedModel(model.name) ? (localStorage.getItem('huggingface_token') ? '📥' : '🔒') : '📥'}
                              </span>
                              {model.is_hosted 
                                ? `Compare Models ($${model.cost_per_1k_tokens?.input.toFixed(3)}/1k)` 
                                : isGatedModel(model.name) 
                                ? (localStorage.getItem('huggingface_token') ? 'Download & Load' : 'Request Access')
                                : 'Download & Load'
                              }
                            </Button>
                          )}
                        </div>

                        {/* Management Buttons for Downloaded/Loaded Models */}
                        {(model.is_loaded || model.download_progress === 100 || model.size_on_disk) && (
                          <div className="pt-2 space-y-1">
                            {/* Offload Button (for loaded models) */}
                            {model.is_loaded && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="w-full bg-purple-50 border-purple-200 text-purple-800 hover:bg-purple-100 text-xs"
                                onClick={() => offloadModel(model.name)}
                                disabled={offloadingModels.has(model.name) || deletingModels.has(model.name)}
                              >
                                {offloadingModels.has(model.name) ? (
                                  <>
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-600 mr-1"></div>
                                    Offloading...
                                  </>
                                ) : (
                                  <>
                                    <span className="mr-1">🔄</span>
                                    Offload from Memory
                                  </>
                                )}
                              </Button>
                            )}
                            
                            {/* Delete Button (for downloaded models) */}
                            {(model.download_progress === 100 || model.size_on_disk) && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="w-full bg-red-50 border-red-200 text-red-800 hover:bg-red-100 text-xs"
                                onClick={() => deleteModel(model.name)}
                                disabled={offloadingModels.has(model.name) || deletingModels.has(model.name)}
                              >
                                {deletingModels.has(model.name) ? (
                                  <>
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600 mr-1"></div>
                                    Deleting...
                                  </>
                                ) : (
                                  <>
                                    <span className="mr-1">🗑️</span>
                                    Delete from Disk
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        )}

                        {/* Download Time Estimate */}
                        {!model.is_loaded && !isDownloading && (
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground text-center">
                              ⏱️ {getEstimatedDownloadTime(model.name)}
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
                  <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 text-xs">
                    <span className="mr-1">✅</span>
                    Ready to Download
                  </Badge>
                  <span className="text-sm text-muted-foreground">Click "Download & Load" to get started</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300 text-xs">
                    <span className="mr-1">🔒</span>
                    Requires Access
                  </Badge>
                  <span className="text-sm text-muted-foreground">Button disabled - click badge to request access</span>
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
                  <span className="text-sm text-muted-foreground">Tested and ready to use</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200 text-xs">
                    <span className="mr-1">🧪</span>
                    Loaded
                  </Badge>
                  <span className="text-sm text-muted-foreground">In memory, click "Test Generation" to verify</span>
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
                <li>• Small models (DialoGPT): ~500MB each</li>
                <li>• Medium models (2B): ~4GB each</li>
                <li>• Large models (7B): ~14GB each</li>
                <li>• Very large models (14B+): ~28GB+ each</li>
                <li>• Meta Llama 3 8B: ~16GB disk space</li>
                <li>• Loaded models use RAM, not disk space</li>
                <li>• ⚠️ Check available disk space before downloading large models</li>
              </ul>
              <h4 className="font-medium mb-2 mt-4">🔄 Model Management</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>Offload:</strong> Free RAM by unloading models from memory</li>
                <li>• <strong>Delete:</strong> Remove models from disk to save storage space</li>
                <li>• Perfect for constrained environments (Codespaces, limited RAM/disk)</li>
                <li>• Offloaded models can be reloaded quickly</li>
                <li>• Deleted models need to be downloaded again</li>
                <li>• Use these features to manage resource usage efficiently</li>
              </ul>
            </div>
          </div>
          



        </CardContent>
      </Card>
    </div>
  )
}

export default Models 