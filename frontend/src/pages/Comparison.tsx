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
  getActiveFilterCount,
  isModelSizeWithinThreshold,
  isHostedModel
} from '../utils/modelUtils'

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
  const [showNoAuthRequired, setShowNoAuthRequired] = useState(false)  // Toggle for models that don't require authentication
  const [maxModelSize, setMaxModelSize] = useState(8)  // Slider for maximum model size (in billions of parameters)
  const [showHostedOnly, setShowHostedOnly] = useState(false)  // Toggle for hosted models only

  const { toast } = useToast()

  // Common parameters for all models
  const [temperature, setTemperature] = useState(0.7)
  const [maxTokens, setMaxTokens] = useState(100)
  const [topP, setTopP] = useState(0.9)
  const [systemPrompt, setSystemPrompt] = useState('')

  // Available models for comparison - will be populated from backend
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [hostedModels, setHostedModels] = useState<Record<string, string[]>>({})

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

  // Fetch hosted models
  const fetchHostedModels = async () => {
    try {
      console.log('🔍 Fetching hosted models...')
      const response = await fetch('/api/v1/models/hosted')
      if (response.ok) {
        const data = await response.json()
        console.log('📡 Hosted models data:', data)
        setHostedModels(data.providers)
        return data.providers
      }
    } catch (error) {
      console.error('Error fetching hosted models:', error)
    }
    return {}
  }





  // Fetch model statuses and available models
  const fetchModelStatuses = async (hostedModelsData?: Record<string, string[]>) => {
    try {
      // Fetch model list and statuses in parallel
      const [listResponse, statusResponse] = await Promise.all([
        fetch('/api/v1/models/list'),
        fetch('/api/v1/models/available')
      ])
      
      if (listResponse.ok && statusResponse.ok) {
        const modelList = await listResponse.json()
        const statusData = await statusResponse.json()
        
        // Add hosted models to the model list
        const allModels = [...modelList]
        
        // Use provided hosted models data or fall back to state
        const modelsToAdd = hostedModelsData || hostedModels
        
        // Add hosted models from each provider
        console.log('🔍 Current hostedModels data:', modelsToAdd)
        Object.entries(modelsToAdd).forEach(([provider, modelNames]) => {
          console.log(`📡 Adding ${provider} models:`, modelNames)
          modelNames.forEach(modelName => {
            allModels.push(modelName)
          })
        })
        
        console.log('🔍 Final allModels list:', allModels)
        setAvailableModels(allModels)
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

    // Apply no authentication required filter
    if (showNoAuthRequired) {
      filtered = filtered.filter(modelName => !isGatedModel(modelName))
    }

    // Apply hosted only filter
    if (showHostedOnly) {
      filtered = filtered.filter(modelName => isHostedModel(modelName))
    }

    // Apply size filter using slider (exclude hosted models from size filtering)
    if (maxModelSize < 70) { // Only apply filter if not showing all models
      filtered = filtered.filter(modelName => {
        // Skip size filtering for hosted models
        if (isHostedModel(modelName)) return true
        return isModelSizeWithinThreshold(modelName, maxModelSize)
      })
    }

    // Sort models by family first, then by size within each family (smallest first)
    filtered.sort((a, b) => {
      // First priority: Family (Mistral first, then Llama, then others)
      const aFamily = getModelFamily(a)
      const bFamily = getModelFamily(b)
      if (aFamily === 'mistral' && bFamily !== 'mistral') return -1
      if (bFamily === 'mistral' && aFamily !== 'mistral') return 1
      if (aFamily === 'llama' && bFamily !== 'llama') return -1
      if (bFamily === 'llama' && aFamily !== 'llama') return 1
      
      // Second priority: Sort by size within each family (smallest first)
      return getModelSize(a) - getModelSize(b)
    })

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
    const initializeData = async () => {
      console.log('🚀 Initializing Comparison page data...')
      const hostedData = await fetchHostedModels()
      await fetchModelStatuses(hostedData)
    }
    initializeData()
  }, [])

  // Refetch models when hosted models are updated
  useEffect(() => {
    console.log('🔄 hostedModels state changed:', hostedModels)
    if (Object.keys(hostedModels).length > 0) {
      console.log('🔄 Refetching models due to hosted models update')
      fetchModelStatuses()
    }
  }, [hostedModels])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Model Comparison</h1>
        <p className="text-sm text-muted-foreground">
          Compare responses from multiple models side by side
        </p>
      </div>

      <QuickFilters
        showDownloadedOnly={showDownloadedOnly}
        setShowDownloadedOnly={setShowDownloadedOnly}
        showLoadedOnly={showLoadedOnly}
        setShowLoadedOnly={setShowLoadedOnly}
        showReadyToUseOnly={false}
        setShowReadyToUseOnly={() => {}} // Not used in Comparison
        showRecommendedOnly={showRecommendedOnly}
        setShowRecommendedOnly={setShowRecommendedOnly}
        showNoAuthRequired={showNoAuthRequired}
        setShowNoAuthRequired={setShowNoAuthRequired}
        showHostedOnly={showHostedOnly}
        setShowHostedOnly={setShowHostedOnly}
        maxModelSize={maxModelSize}
        setMaxModelSize={setMaxModelSize}
        showRefreshButton={true}
        onRefresh={() => fetchModelStatuses()}
        defaultMaxModelSize={8}
        showSizeLegend={true}
      />
            
          
      {/* Model Selection */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Select Models to Compare</CardTitle>
          <CardDescription>
            Choose 2 or more models to compare their responses
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Model Selection Grid */}
          <div className="mt-4">
            <h3 className="text-lg font-medium text-gray-700 mb-3">Available Models ({getFilteredAvailableModels().length})</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
              {getFilteredAvailableModels().map((modelName) => {
                const isSelected = selectedModels.includes(modelName)
                const isLoaded = isModelLoaded(modelName)
                
                return (
                  <Button
                    key={modelName}
                    variant={isSelected ? "default" : "outline"}
                    className={`justify-start h-auto p-3 min-h-[80px] ${
                      isSelected ? 'ring-2 ring-primary bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handleModelToggle(modelName)}
                  >
                    <div className="flex flex-col space-y-2 w-full">
                      <div className="flex-1 text-left">
                        <div className="font-medium text-sm truncate mb-1">
                          {modelName.split('/').pop()}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {modelName}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1">
                        {isLoaded && (
                          <Badge variant="secondary" className="text-xs px-2 py-1">
                            ✅ Loaded
                          </Badge>
                        )}
                        {isGPURequired(modelName) && (
                          <Badge 
                            variant="default" 
                            className="bg-red-100 text-red-800 border-red-200 text-xs px-2 py-1 cursor-help"
                            title="This model requires GPU for reasonable performance"
                          >
                            🚀 GPU Required
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
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <h3 className="text-sm font-semibold text-blue-800 mb-2">🚀 Quick Test Combinations</h3>
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
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold text-blue-800">Selected Models ({selectedModels.length})</div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs px-2 py-1 h-6"
                  onClick={() => setSelectedModels([])}
                >
                  🗑️ Clear All
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
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
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Prompt</CardTitle>
              <CardDescription>
                Enter the prompt that will be sent to all selected models
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Prepared Prompts */}
          <div className="p-2 bg-green-50 border border-green-200 rounded-md">
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
        <CardHeader className="pb-2">
          <CardTitle>Generation Parameters</CardTitle>
          <CardDescription>
            These parameters will be applied to all models
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
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