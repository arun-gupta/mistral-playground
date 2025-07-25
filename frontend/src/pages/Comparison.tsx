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
  const { toast } = useToast()

  // Common parameters for all models
  const [temperature, setTemperature] = useState(0.7)
  const [maxTokens, setMaxTokens] = useState(100)
  const [topP, setTopP] = useState(0.9)
  const [systemPrompt, setSystemPrompt] = useState('')

  // Available models for comparison - will be populated from backend
  const [availableModels, setAvailableModels] = useState<string[]>([])

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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Select Models to Compare</CardTitle>
              <CardDescription>
                Choose 2 or more models to compare their responses
              </CardDescription>
            </div>
            <Button
              onClick={fetchModelStatuses}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              🔄 Refresh Models
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {availableModels.map((modelName) => {
              const isSelected = selectedModels.includes(modelName)
              const isLoaded = isModelLoaded(modelName)
              
              return (
                <Button
                  key={modelName}
                  variant={isSelected ? "default" : "outline"}
                  className={`justify-start h-auto p-3 ${
                    isSelected ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => handleModelToggle(modelName)}
                >
                  <div className="flex items-center space-x-2 w-full">
                    <div className="flex-1 text-left">
                      <div className="font-medium text-sm">
                        {modelName.split('/').pop()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {modelName}
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      {isLoaded && (
                        <Badge variant="secondary" className="text-xs">
                          ✅ Loaded
                        </Badge>
                      )}
                      {isSelected && (
                        <Badge variant="default" className="text-xs">
                          ✓
                        </Badge>
                      )}
                    </div>
                  </div>
                </Button>
              )
            })}
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
                  'TheBloke/Mistral-7B-Instruct-v0.2-GGUF',
                  'TheBloke/Meta-Llama-3-14B-Instruct-GGUF'
                ])}
              >
                <div className="text-left">
                  <div className="font-medium">⭐ Recommended Duo</div>
                  <div className="text-xs text-gray-600">Best CPU models</div>
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
                  'TheBloke/Mistral-7B-Instruct-v0.2-GGUF',
                  'TheBloke/Mixtral-8x7B-Instruct-v0.1-GGUF'
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
                  'google/gemma-2b-it',
                  'google/gemma-7b-it'
                ])}
              >
                <div className="text-left">
                  <div className="font-medium">🧠 Google Models</div>
                  <div className="text-xs text-gray-600">Gemma 2B vs 7B</div>
                </div>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-auto p-2 bg-white hover:bg-blue-50"
                onClick={() => setSelectedModels([
                  'TheBloke/Llama-2-13B-Chat-GGUF',
                  'TheBloke/Meta-Llama-3-14B-Instruct-GGUF'
                ])}
              >
                <div className="text-left">
                  <div className="font-medium">🔄 Llama Evolution</div>
                  <div className="text-xs text-gray-600">Llama 2 vs Llama 3</div>
                </div>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-auto p-2 bg-white hover:bg-blue-50"
                onClick={() => setSelectedModels([
                  'mistralai/Mistral-7B-Instruct-v0.2',
                  'TheBloke/Mistral-7B-Instruct-v0.2-GGUF'
                ])}
              >
                <div className="text-left">
                  <div className="font-medium">⚖️ Full vs Quantized</div>
                  <div className="text-xs text-gray-600">Quality vs Speed</div>
                </div>
              </Button>
            </div>
          </div>
          
          {selectedModels.length > 0 && (
            <div className="mt-4 p-3 bg-muted rounded-md">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium">Selected Models ({selectedModels.length}):</div>
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
                  <Badge key={model} variant="outline">
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