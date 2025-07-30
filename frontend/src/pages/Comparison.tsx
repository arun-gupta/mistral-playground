import { useState, useEffect } from 'react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Progress } from '../components/ui/progress'
import { useToast } from '../components/ui/use-toast'

interface ModelComparison {
  model_name: string
  provider: string
  text: string
  parameters: Record<string, any>
  usage?: {
    total_tokens?: number
    input_tokens?: number
    output_tokens?: number
  }
  latency?: number
}

interface ComparisonResponse {
  prompt: string
  responses: ModelComparison[]
  comparison_id: string
  timestamp: string
}

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

const Comparison = () => {
  const [prompt, setPrompt] = useState('')
  const [selectedModels, setSelectedModels] = useState<string[]>([])
  const [modelStatuses, setModelStatuses] = useState<ModelStatus[]>([])
  const [comparison, setComparison] = useState<ComparisonResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showLoadedOnly, setShowLoadedOnly] = useState(false)
  const [showDownloadedOnly, setShowDownloadedOnly] = useState(false)
  const [showRecommendedOnly, setShowRecommendedOnly] = useState(false)
  const [showCPUOnly, setShowCPUOnly] = useState(false)  // Toggle for CPU-compatible models
  const [showNoAuthRequired, setShowNoAuthRequired] = useState(false)  // Toggle for models that don't require authentication
  const [showSmallModelsOnly, setShowSmallModelsOnly] = useState(false)  // Toggle for small models only

  const { toast } = useToast()

  // Common parameters for all models
  const [temperature, setTemperature] = useState(0.7)
  const [maxTokens, setMaxTokens] = useState(100)
  const [topP, setTopP] = useState(0.9)
  const [systemPrompt, setSystemPrompt] = useState('')

  // Available models for comparison - will be populated from backend
  const [availableModels, setAvailableModels] = useState<string[]>([])

  // Helper functions for filtering and sorting
  const getModelFamily = (modelName: string): string => {
    if (modelName.includes('mistral') || modelName.includes('Mixtral')) return 'mistral'
    if (modelName.includes('llama') || modelName.includes('Llama')) return 'llama'
    if (modelName.includes('gemma') || modelName.includes('Gemma')) return 'gemma'
    if (modelName.includes('dialogpt') || modelName.includes('DialoGPT')) return 'dialogpt'
    return 'other'
  }

  const getModelSize = (modelName: string): number => {
    if (modelName.includes('70B') || modelName.includes('70b')) return 70
    if (modelName.includes('17B') || modelName.includes('17b')) return 17
    if (modelName.includes('14B') || modelName.includes('14b')) return 14
    if (modelName.includes('13B') || modelName.includes('13b')) return 13
    if (modelName.includes('10B') || modelName.includes('10b')) return 10
    if (modelName.includes('8B') || modelName.includes('8b') || modelName.includes('8x7B')) return 8
    if (modelName.includes('7B') || modelName.includes('7b')) return 7
    if (modelName.includes('2B') || modelName.includes('2b')) return 2
    if (modelName.includes('1B') || modelName.includes('1b')) return 1
    return 0
  }



  // Fetch model statuses and available models
  const fetchModelStatuses = async () => {
    try {
      // Fetch model list and statuses in parallel
      const [listResponse, statusResponse] = await Promise.all([
        fetch('/api/v1/models/list'),
        fetch('/api/v1/models/available')
      ])
      
      if (listResponse.ok && statusResponse.ok) {
        const modelList = await listResponse.json()
        const statusData = await statusResponse.json()
        
        setAvailableModels(modelList)
        setModelStatuses(statusData)
      } else {
        console.error('Failed to fetch models')
      }
    } catch (error) {
      console.error('Failed to fetch model statuses:', error)
    }
  }

  // Check if model is loaded
  const isModelLoaded = (modelName: string) => {
    return modelStatuses.some(m => m.name === modelName && m.is_loaded)
  }

  // Check if model is recommended
  const isRecommended = (modelName: string) => {
    const recommended = [
      'microsoft/DialoGPT-small', // Testing
      'mistralai/Mistral-7B-Instruct-v0.2', // Full quality Mistral
      'meta-llama/Meta-Llama-3-8B-Instruct', // Official Meta Llama (requires auth)
      'meta-llama/Llama-3.1-8B-Instruct' // Official Meta Llama (requires auth)
    ]
    return recommended.includes(modelName)
  }



  // Check if model requires GPU (simplified binary logic)
  const isGPURequired = (modelName: string): boolean => {
    // Only very large models actually require GPU
    const gpuRequired = [
      'mistralai/Mixtral-8x7B-Instruct-v0.1', // ~70B effective parameters
      'meta-llama/Llama-3.3-70B-Instruct',    // 70B parameters
      'google/gemma-3-27b-it'                 // 27B parameters but very large
    ]
    
    // Models with >20B parameters generally need GPU
    const modelSize = getModelSize(modelName)
    if (modelSize > 20) return true
    
    return gpuRequired.includes(modelName)
  }

  // Check if model is small (suitable for quick testing and constrained environments)
  const isSmallModel = (modelName: string) => {
    const size = getModelSize(modelName)
    // Small models: 2B parameters or less, or DialoGPT models
    return size <= 2 || modelName.includes('DialoGPT')
  }

  // Get count of active filters
  const getActiveFilterCount = () => {
    let count = 0
    if (showDownloadedOnly) count++
    if (showLoadedOnly) count++
    if (showRecommendedOnly) count++
    if (showCPUOnly) count++
    if (showNoAuthRequired) count++
    if (showSmallModelsOnly) count++
    return count
  }

  // Check if model requires authentication (gated)
  const isGatedModel = (modelName: string): boolean => {
    const gatedModels = [
          // Official Meta Llama models (require authentication) - Top 6 most useful
    'meta-llama/Meta-Llama-3-8B-Instruct',     // Medium size, instruction-tuned, good balance
    'meta-llama/Llama-3.1-8B-Instruct',        // Medium size, instruction-tuned, good balance
    'meta-llama/Meta-Llama-3-14B-Instruct',    // Large, instruction-tuned, high performance
    'meta-llama/Llama-3.2-3B-Instruct',        // Small, instruction-tuned, great for testing
    'meta-llama/Llama-3.2-1B',                 // Very small, base model, great for testing
    'meta-llama/Llama-3.3-70B-Instruct',       // Very large, instruction-tuned, maximum performance
          // Google Gemma models (all require authentication) - Top 6 most useful
    'google/gemma-2b-it',                    // Small, instruction-tuned, great for testing
    'google/gemma-7b-it',                    // Medium, instruction-tuned, good balance
    'google/gemma-3n-E2B-it',                // Latest Gemma 3, small, instruction-tuned
    'google/gemma-3n-E4B-it',                // Latest Gemma 3, medium, instruction-tuned
    'google/gemma-3-4b-it',                  // Latest Gemma 3, 4B variant
    'google/gemma-3-27b-it'                  // Large model for high performance
    ]
    return gatedModels.includes(modelName)
  }

  // Get filtered available models based on toggle state
  const getFilteredAvailableModels = () => {
    let filtered = [...availableModels]

    // Apply downloaded filter
    if (showDownloadedOnly) {
      filtered = filtered.filter(modelName => {
        const modelStatus = modelStatuses.find(m => m.name === modelName)
        return modelStatus && (
          modelStatus.download_progress === 100 || 
          modelStatus.size_on_disk || 
          modelStatus.is_loaded  // Include loaded models since they must be downloaded
        )
      })
    }

    // Apply loaded filter
    if (showLoadedOnly) {
      filtered = filtered.filter(modelName => isModelLoaded(modelName))
    }

    // Apply recommended filter
    if (showRecommendedOnly) {
      filtered = filtered.filter(modelName => isRecommended(modelName))
    }

    // Apply CPU compatibility filter (show models that don't require GPU)
    if (showCPUOnly) {
      filtered = filtered.filter(modelName => !isGPURequired(modelName))
    }

    // Apply no authentication required filter
    if (showNoAuthRequired) {
      filtered = filtered.filter(modelName => !isGatedModel(modelName))
    }

    // Apply small models filter
    if (showSmallModelsOnly) {
      filtered = filtered.filter(modelName => isSmallModel(modelName))
    }

    // Sort models by size (largest first) for consistent display
    filtered.sort((a, b) => getModelSize(b) - getModelSize(a))

    return filtered
  }

  // Handle model selection
  const handleModelToggle = (modelName: string) => {
    setSelectedModels(prev => 
      prev.includes(modelName) 
        ? prev.filter(m => m !== modelName)
        : [...prev, modelName]
    )
  }

  // Handle comparison
  const handleCompare = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt')
      return
    }

    if (selectedModels.length < 2) {
      setError('Please select at least 2 models to compare')
      return
    }

    setError('')
    setLoading(true)
    setComparison(null)

    const requestBody = {
      prompt: prompt.trim(),
      models: selectedModels,
      parameters: {
        temperature,
        max_tokens: maxTokens,
        top_p: topP,
        system_prompt: systemPrompt || undefined
      }
    }

    try {
      const response = await fetch('/api/v1/models/compare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (response.ok) {
        const data = await response.json()
        setComparison(data)
        toast({
          title: 'Comparison Complete',
          description: `Successfully compared ${selectedModels.length} models`,
        })
      } else {
        const errorData = await response.json()
        setError(errorData.detail || 'Failed to compare models')
        toast({
          title: 'Comparison Failed',
          description: errorData.detail || 'Failed to compare models',
          variant: 'destructive',
        })
      }
    } catch (error) {
      setError('Network error occurred')
      toast({
        title: 'Network Error',
        description: 'Failed to connect to the server',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // Load model statuses on mount
  useEffect(() => {
    fetchModelStatuses()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Model Comparison</h1>
        <p className="text-muted-foreground mt-2">
          Compare responses from multiple models side by side
        </p>
      </div>

      {/* Model Selection */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Select Models to Compare</CardTitle>
            <CardDescription>
              Choose 2 or more models to compare their responses
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Unified Controls Grid */}
            {/* Quick Filters Section */}
            <div className="border-t border-gray-200 pt-4">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-gray-700">Quick Filters</h3>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowDownloadedOnly(false)
                        setShowLoadedOnly(false)
                        setShowRecommendedOnly(false)
                        setShowCPUOnly(false)
                        setShowNoAuthRequired(false)
                        setShowSmallModelsOnly(false)
                      }}
                      className="text-xs px-3 py-1 h-8"
                      disabled={getActiveFilterCount() === 0}
                    >
                      Clear All
                    </Button>
                    <Button
                      onClick={fetchModelStatuses}
                      variant="outline"
                      size="sm"
                      className="text-xs px-3 py-1 h-8"
                    >
                      🔄 Refresh
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {/* CPU Compatible */}
                  <div className="flex items-center space-x-2 p-2 bg-green-50 border border-green-200 rounded">
                    <button
                      type="button"
                      onClick={() => setShowCPUOnly(!showCPUOnly)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 ${
                        showCPUOnly ? 'bg-green-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                          showCPUOnly ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                    <span className="text-sm text-green-800">CPU</span>
                  </div>

                  {/* Small Models */}
                  <div className="flex items-center space-x-2 p-2 bg-blue-50 border border-blue-200 rounded">
                    <button
                      type="button"
                      onClick={() => setShowSmallModelsOnly(!showSmallModelsOnly)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                        showSmallModelsOnly ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                          showSmallModelsOnly ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                    <span className="text-sm text-blue-800">Small</span>
                  </div>

                  {/* No Auth Required */}
                  <div className="flex items-center space-x-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                    <button
                      type="button"
                      onClick={() => setShowNoAuthRequired(!showNoAuthRequired)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-1 ${
                        showNoAuthRequired ? 'bg-yellow-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                          showNoAuthRequired ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                    <span className="text-sm text-yellow-800">No Auth</span>
                  </div>

                  {/* Recommended */}
                  <div className="flex items-center space-x-2 p-2 bg-purple-50 border border-purple-200 rounded">
                    <button
                      type="button"
                      onClick={() => setShowRecommendedOnly(!showRecommendedOnly)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 ${
                        showRecommendedOnly ? 'bg-purple-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                          showRecommendedOnly ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                    <span className="text-sm text-purple-800">Recommended</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Model Selection Grid */}
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-4">Available Models ({getFilteredAvailableModels().length})</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
              {getFilteredAvailableModels().map((modelName) => {
                const isSelected = selectedModels.includes(modelName)
                const isLoaded = isModelLoaded(modelName)
                
                return (
                  <Button
                    key={modelName}
                    variant={isSelected ? "default" : "outline"}
                    className={`justify-start h-auto p-4 min-h-[100px] ${
                      isSelected ? 'ring-2 ring-primary bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handleModelToggle(modelName)}
                  >
                    <div className="flex flex-col space-y-3 w-full">
                      <div className="flex-1 text-left">
                        <div className="font-medium text-sm truncate mb-1">
                          {modelName.split('/').pop()}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {modelName}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {isLoaded && (
                          <Badge variant="secondary" className="text-xs px-2 py-1">
                            ✅ Loaded
                          </Badge>
                        )}
                        {isGPURequired(modelName) ? (
                          <Badge 
                            variant="default" 
                            className="bg-red-100 text-red-800 border-red-200 text-xs px-2 py-1 cursor-help"
                            title="This model requires GPU for reasonable performance"
                          >
                            🚀 GPU Required
                          </Badge>
                        ) : (
                          <Badge variant="default" className="bg-green-100 text-green-800 border-green-200 text-xs px-2 py-1">
                            💻 CPU Compatible
                          </Badge>
                        )}
                        {isGatedModel(modelName) && (
                          <a
                            href={`https://huggingface.co/${modelName}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block"
                            title="Click to visit HuggingFace page and request access"
                          >
                            <Badge variant="default" className="bg-red-100 text-red-800 border-red-200 text-xs px-2 py-1 cursor-pointer hover:bg-red-200 transition-colors">
                              🔒 Requires Access
                            </Badge>
                          </a>
                        )}
                        {isSelected && (
                          <Badge variant="default" className="text-xs px-2 py-1 bg-blue-100 text-blue-800 border-blue-200">
                            ✓ Selected
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Button>
                )
              })}
            </div>
          </div>
          
          {/* Prepared Model Combinations */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h3 className="text-sm font-semibold text-blue-800 mb-3">🚀 Quick Test Combinations</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-auto p-2 bg-white hover:bg-blue-50"
                onClick={() => setSelectedModels([
                  'mistralai/Mistral-7B-Instruct-v0.2',
                  'meta-llama/Meta-Llama-3-8B-Instruct'
                ])}
              >
                <div className="text-left">
                  <div className="font-medium">⭐ Recommended Duo</div>
                  <div className="text-xs text-gray-600">Official models</div>
                </div>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-auto p-2 bg-white hover:bg-blue-50"
                onClick={() => setSelectedModels([
                  'microsoft/DialoGPT-small',
                  'microsoft/DialoGPT-medium',
                  'microsoft/DialoGPT-large'
                ])}
              >
                <div className="text-left">
                  <div className="font-medium">🔬 Size Comparison</div>
                  <div className="text-xs text-gray-600">DialoGPT variants</div>
                </div>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-auto p-2 bg-white hover:bg-blue-50"
                onClick={() => setSelectedModels([
                  'mistralai/Mistral-7B-Instruct-v0.2',
                  'mistralai/Mixtral-8x7B-Instruct-v0.1'
                ])}
              >
                <div className="text-left">
                  <div className="font-medium">⚡ Performance Test</div>
                  <div className="text-xs text-gray-600">Mistral vs Mixtral</div>
                </div>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-auto p-2 bg-white hover:bg-blue-50"
                onClick={() => setSelectedModels([
                  'microsoft/DialoGPT-small',
                  'microsoft/DialoGPT-large'
                ])}
              >
                <div className="text-left">
                  <div className="font-medium">🔬 Small vs Large</div>
                  <div className="text-xs text-gray-600">DialoGPT comparison</div>
                </div>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-auto p-2 bg-white hover:bg-blue-50"
                onClick={() => setSelectedModels([
                  'mistralai/Mistral-7B-Instruct-v0.1',
                  'mistralai/Mistral-7B-Instruct-v0.2'
                ])}
              >
                <div className="text-left">
                  <div className="font-medium">🔄 Mistral Evolution</div>
                  <div className="text-xs text-gray-600">Mistral v0.1 vs v0.2</div>
                </div>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-auto p-2 bg-white hover:bg-blue-50"
                onClick={() => setSelectedModels([
                  'meta-llama/Meta-Llama-3-8B-Instruct',
                  'meta-llama/Llama-3.1-8B-Instruct'
                ])}
              >
                <div className="text-left">
                  <div className="font-medium">🦙 Llama Evolution</div>
                  <div className="text-xs text-gray-600">Llama 3.1 vs Meta-Llama 3</div>
                </div>
              </Button>
            </div>
          </div>
          
          {/* Selected Models Display */}
          {selectedModels.length > 0 && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-blue-800">Selected Models ({selectedModels.length})</div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => setSelectedModels([])}
                >
                  🗑️ Clear All
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedModels.map((model) => (
                  <Badge key={model} variant="default" className="bg-blue-100 text-blue-800 border-blue-200">
                    {model.split('/').pop()}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prompt Input */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Prompt</CardTitle>
              <CardDescription>
                Enter the prompt that will be sent to all selected models
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Prepared Prompts */}
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <h3 className="text-sm font-semibold text-green-800 mb-2">💡 Sample Prompts</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-auto p-2 bg-white hover:bg-green-50 text-left"
                onClick={() => setPrompt("Explain quantum computing in simple terms that a high school student could understand.")}
              >
                <div>
                  <div className="font-medium">🎓 Educational</div>
                  <div className="text-xs text-gray-600">Quantum computing explanation</div>
                </div>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-auto p-2 bg-white hover:bg-green-50 text-left"
                onClick={() => setPrompt("Write a short story about a robot who discovers emotions for the first time.")}
              >
                <div>
                  <div className="font-medium">📖 Creative Writing</div>
                  <div className="text-xs text-gray-600">Robot emotion story</div>
                </div>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-auto p-2 bg-white hover:bg-green-50 text-left"
                onClick={() => setPrompt("What are the main differences between Python and JavaScript? Provide examples.")}
              >
                <div>
                  <div className="font-medium">💻 Technical</div>
                  <div className="text-xs text-gray-600">Python vs JavaScript</div>
                </div>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-auto p-2 bg-white hover:bg-green-50 text-left"
                onClick={() => setPrompt("Analyze the pros and cons of remote work versus office work.")}
              >
                <div>
                  <div className="font-medium">🤔 Analysis</div>
                  <div className="text-xs text-gray-600">Remote vs office work</div>
                </div>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-auto p-2 bg-white hover:bg-green-50 text-left"
                onClick={() => setPrompt("Write a haiku about artificial intelligence.")}
              >
                <div>
                  <div className="font-medium">🎭 Poetry</div>
                  <div className="text-xs text-gray-600">AI haiku</div>
                </div>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-auto p-2 bg-white hover:bg-green-50 text-left"
                onClick={() => setPrompt("What would happen if humans could photosynthesize like plants?")}
              >
                <div>
                  <div className="font-medium">🔬 Scientific</div>
                  <div className="text-xs text-gray-600">Human photosynthesis</div>
                </div>
              </Button>
            </div>
          </div>
          
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter your prompt here..."
            className="w-full h-32 p-3 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </CardContent>
      </Card>

      {/* Parameters */}
      <Card>
        <CardHeader>
          <CardTitle>Generation Parameters</CardTitle>
          <CardDescription>
            These parameters will be applied to all models
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Temperature</label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="text-sm text-muted-foreground mt-1">{temperature}</div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Max Tokens</label>
              <input
                type="number"
                min="1"
                max="2048"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                className="w-full p-2 border rounded-md"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Top P</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={topP}
                onChange={(e) => setTopP(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="text-sm text-muted-foreground mt-1">{topP}</div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">System Prompt (Optional)</label>
              <input
                type="text"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Enter system prompt..."
                className="w-full p-2 border rounded-md"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compare Button */}
      <div className="flex justify-center">
        <Button
          onClick={handleCompare}
          disabled={loading || selectedModels.length < 2 || !prompt.trim()}
          size="lg"
          className="px-8"
        >
          {loading ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
              Comparing Models...
            </>
          ) : (
            <>
              <span className="mr-2">🔍</span>
              Compare Models ({selectedModels.length})
            </>
          )}
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-100 border border-red-400 rounded-md">
          <div className="text-red-800 font-medium">Error</div>
          <div className="text-red-700">{error}</div>
        </div>
      )}

      {/* Loading Progress */}
      {loading && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Comparing models...</span>
                <span>This may take a few minutes</span>
              </div>
              <Progress value={undefined} className="w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comparison Results */}
      {comparison && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Comparison Results</h2>
            <Badge variant="outline">
              ID: {comparison.comparison_id.slice(0, 8)}...
            </Badge>
          </div>

          {/* Original Prompt */}
          <Card>
            <CardHeader>
              <CardTitle>Original Prompt</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-3 bg-muted rounded-md">
                {comparison.prompt}
              </div>
            </CardContent>
          </Card>

          {/* Model Responses */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {comparison.responses.map((response, index) => (
              <Card key={index} className="h-fit">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      {response.model_name.split('/').pop()}
                    </CardTitle>
                    <Badge variant="outline">
                      {response.provider}
                    </Badge>
                  </div>
                  <CardDescription>
                    {response.model_name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Response Text */}
                    <div>
                      <div className="text-sm font-medium mb-2">Response:</div>
                      <div className="p-3 bg-muted rounded-md whitespace-pre-wrap text-sm">
                        {response.text}
                      </div>
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {response.usage && (
                        <>
                          <div>
                            <span className="font-medium">Total Tokens:</span>
                            <span className="ml-2">{response.usage.total_tokens || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="font-medium">Output Tokens:</span>
                            <span className="ml-2">{response.usage.output_tokens || 'N/A'}</span>
                          </div>
                        </>
                      )}
                      {response.latency && (
                        <div>
                          <span className="font-medium">Latency:</span>
                          <span className="ml-2">{(response.latency * 1000).toFixed(0)}ms</span>
                        </div>
                      )}
                    </div>

                    {/* Parameters Used */}
                    <div>
                      <div className="text-sm font-medium mb-2">Parameters Used:</div>
                      <div className="text-xs text-muted-foreground">
                        Temperature: {response.parameters.temperature || 'N/A'} | 
                        Max Tokens: {response.parameters.max_tokens || 'N/A'} | 
                        Top P: {response.parameters.top_p || 'N/A'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default Comparison 