import { useState, useEffect } from 'react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'

const Playground = () => {
  const [prompt, setPrompt] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)
  const [temperature, setTemperature] = useState(0.7)
  const [maxTokens, setMaxTokens] = useState(50)
  const [topP, setTopP] = useState(0.9)
  const [selectedModel, setSelectedModel] = useState('microsoft/DialoGPT-small')
  const [selectedProvider, setSelectedProvider] = useState('huggingface')
  const [actualModelUsed, setActualModelUsed] = useState('')
  const [fallbackUsed, setFallbackUsed] = useState(false)
  const [originalModel, setOriginalModel] = useState('')
  const [mockMode, setMockMode] = useState(false)
  const [mockModeLoading, setMockModeLoading] = useState(false)
  const [modelStatus, setModelStatus] = useState<'idle' | 'downloading' | 'loading' | 'ready' | 'error'>('idle')
  const [modelProgress, setModelProgress] = useState('')
  const [modelError, setModelError] = useState('')
  const [error, setError] = useState('')

  // Check mock mode status on component mount
  useEffect(() => {
    const checkMockStatus = async () => {
      try {
        const response = await fetch('/api/v1/models/mock-status')
        if (response.ok) {
          const data = await response.json()
          setMockMode(data.mock_mode)
        }
      } catch (error) {
        console.log('Could not check mock status:', error)
      }
    }
    checkMockStatus()
  }, [])

  const toggleMockMode = async () => {
    setMockModeLoading(true)
    try {
      const newMode = !mockMode
      const response = await fetch('/api/v1/models/toggle-mock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mock_mode: newMode })
      })
      
      if (response.ok) {
        setMockMode(newMode)
        console.log(`Mock mode ${newMode ? 'enabled' : 'disabled'}`)
      } else {
        console.error('Failed to toggle mock mode')
      }
    } catch (error) {
      console.error('Error toggling mock mode:', error)
    } finally {
      setMockModeLoading(false)
    }
  }

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt')
      return
    }

    setError('')
    setLoading(true)
    setResponse('')
    setModelStatus('loading')
    setModelProgress('Initializing model...')

    const requestBody = {
      prompt: prompt.trim(),
      system_prompt: systemPrompt.trim() || undefined,
      model_name: selectedModel,
      provider: 'huggingface',
      temperature: temperature,
      max_tokens: maxTokens,
      top_p: topP
    }

    console.log('🚀 Sending request:', requestBody)

    try {
      console.log('⏱️ Starting fetch request...')
      setModelProgress('Checking if model is loaded (first time may take several minutes)...')
      setModelStatus('loading')
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        console.log('⏰ Request timeout after 30 seconds')
        controller.abort()
      }, 30000)
      
      const response = await fetch('/api/v1/models/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      console.log('📥 Response received!')
      console.log('📥 Response status:', response.status)
      console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()))
      
      if (response.ok) {
        console.log('📥 Reading response body...')
        setModelProgress('Processing response...')
        const data = await response.json()
        console.log('✅ Success response:', data)
        console.log('✅ Response text:', data.text)
        setResponse(data.text)
        setActualModelUsed(data.model_name || 'Unknown model')
        setFallbackUsed(data.fallback_used || false)
        setOriginalModel(data.original_model || '')
        
        // Check if fallback was used
        if (data.fallback_used && data.original_model) {
          console.log(`⚠️ Fallback used: ${data.original_model} -> ${data.model_name}`)
        }
        setModelStatus('ready')
        setModelProgress('')
      } else {
        console.log('📥 Reading error response body...')
        const errorData = await response.json().catch(() => ({}))
        console.log('❌ Error response:', errorData)
        setResponse(`Error: ${errorData.detail || 'Could not generate response'}`)
        setModelStatus('error')
        setModelError(errorData.detail || 'Could not generate response')
      }
    } catch (error: any) { // Fixed TypeScript error here
      console.log('💥 Network error:', error)
      if (error.name === 'AbortError') {
        setResponse('Error: Request timed out after 30 seconds')
        setModelStatus('error')
        setModelError('Request timed out after 30 seconds')
      } else {
        setResponse(`Error: Network error - ${error}`)
        setModelStatus('error')
        setModelError(`Network error - ${error}`)
      }
    } finally {
      console.log('🏁 Request completed, setting loading to false')
      setLoading(false)
    }
  }

  const getModelStatusDisplay = () => {
    switch (modelStatus) {
      case 'downloading':
        return (
          <div className="p-3 bg-blue-100 border border-blue-400 rounded-md">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              <span className="text-blue-800 font-medium">Downloading Model</span>
            </div>
            <p className="text-blue-700 text-sm mt-1">{modelProgress}</p>
          </div>
        )
      case 'loading':
        return (
          <div className="p-3 bg-yellow-100 border border-yellow-400 rounded-md">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 mr-2"></div>
              <span className="text-yellow-800 font-medium">Loading Model</span>
            </div>
            <p className="text-yellow-700 text-sm mt-1">{modelProgress}</p>
          </div>
        )
      case 'ready':
        return (
          <div className="p-3 bg-green-100 border border-green-400 rounded-md">
            <div className="flex items-center">
              <span className="text-green-800 font-medium">✅ Model Ready</span>
            </div>
            <p className="text-green-700 text-sm mt-1">
              Model loaded successfully and ready for inference
              {actualModelUsed && (
                <span className="block mt-1">
                  <span className="font-medium">Model used:</span> <code className="bg-green-200 px-1 rounded text-xs">{actualModelUsed}</code>
                </span>
              )}
            </p>
            <p className="text-green-600 text-xs mt-1">
              ⚡ Model is cached in memory - subsequent requests will be faster
            </p>
          </div>
        )
      case 'error':
        return (
          <div className="p-3 bg-red-100 border border-red-400 rounded-md">
            <div className="flex items-center">
              <span className="text-red-800 font-medium">❌ Model Error</span>
            </div>
            <p className="text-red-700 text-sm mt-1">{modelError}</p>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Mistral Playground</h1>
            <p className="text-muted-foreground">
              Explore and fine-tune prompts across Mistral's open models
            </p>
          </div>
          
          {/* Mock Mode Toggle */}
          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium">Mock Mode:</span>
            <Button
              onClick={toggleMockMode}
              disabled={mockModeLoading}
              variant={mockMode ? "default" : "outline"}
              size="sm"
              className={`${mockMode ? 'bg-yellow-500 hover:bg-yellow-600' : ''}`}
            >
              {mockModeLoading ? '...' : mockMode ? '🎭 ON' : '🤖 OFF'}
            </Button>
          </div>
        </div>
        
        {mockMode && (
          <div className="mt-2 p-3 bg-yellow-100 border border-yellow-400 rounded-md">
            <div className="flex items-center">
              <span className="text-yellow-800 font-medium">🎭 Mock Mode Enabled</span>
              <span className="ml-2 text-yellow-700 text-sm">
                Responses are simulated for testing. Click the toggle above to use real models.
              </span>
            </div>
          </div>
        )}

        {/* Model Status Display */}
        {modelStatus !== 'idle' && getModelStatusDisplay()}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle>Input</CardTitle>
            <CardDescription>
              Enter your prompt and adjust parameters
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Model Selection */}
            <div>
              <label className="text-sm font-medium">Model</label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full p-2 mt-1 border rounded-md"
              >
                <option value="microsoft/DialoGPT-small">DialoGPT Small (CPU-friendly, 117M)</option>
                <option value="microsoft/DialoGPT-medium">DialoGPT Medium (345M)</option>
                <option value="microsoft/DialoGPT-large">DialoGPT Large (774M)</option>
                <option value="mistralai/Mistral-7B-Instruct-v0.1">Mistral-7B-Instruct-v0.1 (7B, ~14GB RAM)</option>
                <option value="mistralai/Mistral-7B-Instruct-v0.2">Mistral-7B-Instruct-v0.2 (7B, ~14GB RAM)</option>
                <option value="TheBloke/Mistral-7B-Instruct-v0.1-GGUF">Mistral-7B-GGUF (4-8GB RAM, CPU optimized)</option>
              </select>
              {fallbackUsed && originalModel && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-800">
                    <span className="font-medium">Note:</span> Using fallback model: <code className="bg-blue-100 px-1 rounded">{actualModelUsed}</code>
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    The selected model <code className="bg-blue-100 px-1 rounded">{originalModel}</code> failed to load, so a compatible fallback was used.
                  </p>
                </div>
              )}
            </div>

            {/* Provider Selection */}
            <div>
              <label className="text-sm font-medium">Provider</label>
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="w-full p-2 mt-1 border rounded-md"
              >
                <option value="huggingface">Hugging Face</option>
                <option value="vllm">vLLM (GPU only)</option>
                <option value="ollama">Ollama</option>
              </select>
            </div>

            {/* System Prompt */}
            <div>
              <label className="text-sm font-medium">System Prompt (Optional)</label>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Enter system prompt here..."
                className="w-full h-20 p-3 mt-1 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* User Prompt */}
            <div>
              <label className="text-sm font-medium">Prompt</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter your prompt here..."
                className="w-full h-32 p-3 mt-1 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            
            {/* Parameters */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Temperature: {temperature}</label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full mt-1"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Max Tokens</label>
                <input
                  type="number"
                  min="1"
                  max="8192"
                  value={maxTokens || ''}
                  onChange={(e) => {
                    const value = parseInt(e.target.value)
                    if (isNaN(value) || value < 1) {
                      setMaxTokens(1)
                    } else if (value > 8192) {
                      setMaxTokens(8192)
                    } else {
                      setMaxTokens(value)
                    }
                  }}
                  onBlur={(e) => {
                    const value = parseInt(e.target.value)
                    if (isNaN(value) || value < 1) {
                      setMaxTokens(1)
                    }
                  }}
                  className="w-full p-2 mt-1 border rounded-md"
                  placeholder="1-8192"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Top P: {topP}</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={topP}
                  onChange={(e) => setTopP(parseFloat(e.target.value))}
                  className="w-full mt-1"
                />
              </div>
            </div>
            
            <Button 
              onClick={handleGenerate} 
              disabled={loading || !prompt.trim()}
              className="w-full"
            >
              {loading ? 'Generating...' : 'Generate Response'}
            </Button>
          </CardContent>
        </Card>

        {/* Output Section */}
        <Card>
          <CardHeader>
            <CardTitle>Response</CardTitle>
            <CardDescription>
              Generated response from the model
            </CardDescription>
          </CardHeader>
          <CardContent>
            {response && actualModelUsed && (
              <div className="mb-3 p-2 bg-gray-50 border border-gray-200 rounded-md">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Model used for this response:</span> <code className="bg-gray-200 px-1 rounded text-xs">{actualModelUsed}</code>
                  {actualModelUsed !== selectedModel && (
                    <span className="ml-2 text-orange-600 text-xs">
                      (fallback from {selectedModel})
                    </span>
                  )}
                </p>
              </div>
            )}
            <div className="min-h-[200px] p-3 border rounded-md bg-muted/50">
              {response ? (
                <pre className="whitespace-pre-wrap text-sm">{response}</pre>
              ) : (
                <p className="text-muted-foreground">
                  Response will appear here...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Model Comparison Section */}
      <Card>
        <CardHeader>
          <CardTitle>Model Comparison</CardTitle>
          <CardDescription>
            Compare responses from different Mistral models
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium">Mistral-7B</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Fast, efficient instruction-following model
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium">Mixtral-8x7B</h4>
              <p className="text-sm text-muted-foreground mt-1">
                High-performance mixture-of-experts model
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium">Codestral</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Specialized for code generation and analysis
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Playground 