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
  const [selectedModel, setSelectedModel] = useState('mistralai/Mistral-7B-Instruct-v0.2')
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
  const [modelStatuses, setModelStatuses] = useState<Array<{name: string, is_loaded: boolean}>>([])
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [hostedModels, setHostedModels] = useState<Record<string, string[]>>({})

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

  // Function to fetch model statuses and available models
  const fetchModelStatuses = async () => {
    try {
      console.log('🔍 Fetching model data from API...')
      
      // Fetch model list and statuses in parallel
      const [listResponse, statusResponse] = await Promise.all([
        fetch('/api/v1/models/list'),
        fetch('/api/v1/models/available')
      ])
      
      console.log('📡 API Responses:', {
        listStatus: listResponse.status,
        listOk: listResponse.ok,
        statusStatus: statusResponse.status,
        statusOk: statusResponse.ok
      })
      
      if (listResponse.ok && statusResponse.ok) {
        const modelList = await listResponse.json()
        const statusData = await statusResponse.json()
        
        console.log('🔍 All available models:', modelList)
        console.log('🔍 Status data:', statusData)
        
        // Filter to only Mistral/Mixtral models
        const mistralModels = modelList.filter((model: string) => 
          model.includes('Mistral') || model.includes('Mixtral')
        )
        
        console.log('🔍 Mistral/Mixtral models only:', mistralModels)
          setAvailableModels(mistralModels)
        setModelStatuses(statusData.map((model: any) => ({
          name: model.name,
          is_loaded: model.is_loaded
        })))
      } else {
        console.error('❌ API calls failed:', {
          listStatus: listResponse.status,
          statusStatus: statusResponse.status
        })
        
        // Fallback to hardcoded Mistral models if API fails
        const fallbackModels = [
          'mistralai/Mistral-7B-Instruct-v0.2',
          'mistralai/Mistral-7B-Instruct-v0.3',
          'mistralai/Mistral-7B-v0.1',
          'mistralai/Mistral-7B-v0.3',
          'mistralai/Mixtral-8x7B-Instruct-v0.1',
          'mistralai/Mixtral-8x7B-Instruct-v0.1-GGUF'
        ]
        console.log('🔄 Using fallback models:', fallbackModels)
        setAvailableModels(fallbackModels)
        setModelStatuses([])
      }
    } catch (error) {
      console.error('❌ Could not fetch model statuses:', error)
      
      // Fallback to hardcoded Mistral models on error
      const fallbackModels = [
        'mistralai/Mistral-7B-Instruct-v0.2',
        'mistralai/Mistral-7B-Instruct-v0.3',
        'mistralai/Mistral-7B-v0.1',
        'mistralai/Mistral-7B-v0.3',
        'mistralai/Mixtral-8x7B-Instruct-v0.1',
        'mistralai/Mixtral-8x7B-Instruct-v0.1-GGUF'
      ]
      console.log('🔄 Using fallback models due to error:', fallbackModels)
      setAvailableModels(fallbackModels)
      setModelStatuses([])
    }
  }

  // Check mock mode status and fetch model statuses on component mount
  useEffect(() => {
    const initializeData = async () => {
      try {
        const response = await fetch('/api/v1/models/mock-status')
        if (response.ok) {
          const data = await response.json()
          setMockMode(data.mock_mode)
        }
      } catch (error) {
        console.log('Could not check mock status:', error)
      }
      
      await fetchModelStatuses()
    }

    initializeData()
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
    // Don't clear actualModelUsed here - let it persist until new response is generated
    
    // Only show loading state if model is not already loaded
    if (!isModelLoaded(selectedModel)) {
      setModelStatus('loading')
      setModelProgress('Initializing model...')
    } else {
      setModelStatus('ready')
      setModelProgress('Model ready, generating response...')
    }

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

    // Determine timeout based on model size
    const getTimeoutForModel = (modelName: string) => {
      // Hosted models are typically fast
      if (modelName.startsWith('gpt-') || modelName.startsWith('claude-') || modelName.startsWith('gemini-')) {
        return 30000 // 30 seconds for hosted models
      } else if (modelName.includes('Mistral-7B') || modelName.includes('GGUF')) {
        return 300000 // 5 minutes for large models
      } else if (modelName.includes('DialoGPT-large')) {
        return 120000 // 2 minutes for medium models
      } else {
        return 60000 // 1 minute for small models
      }
    }

    const timeoutMs = getTimeoutForModel(selectedModel)
    const timeoutMinutes = Math.floor(timeoutMs / 60000)

    try {
      console.log(`⏱️ Starting fetch request with ${timeoutMinutes} minute timeout...`)
      
      // Show appropriate loading message
      if (!isModelLoaded(selectedModel)) {
        setModelProgress(`Initializing model (timeout: ${timeoutMinutes} minutes)...`)
        setModelStatus('loading')
      } else {
        // Model is loaded, show generation progress
        const isLargeModel = selectedModel.includes('Mistral-7B') || selectedModel.includes('7B')
        const message = isLargeModel 
          ? `Generating response (may take 1-2 minutes on CPU)...`
          : `Generating response...`
        setModelProgress(message)
        setModelStatus('loading')
      }
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        console.log(`⏰ Request timeout after ${timeoutMinutes} minutes`)
        controller.abort()
      }, timeoutMs)
      
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
        
        // Refresh model statuses after successful generation
        // (in case a model was loaded during this request)
        fetchModelStatuses()
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
        const isLargeModel = selectedModel.includes('Mistral-7B') || selectedModel.includes('7B') || selectedModel.includes('GGUF')
        const message = isLargeModel 
          ? `Error: Request timed out after ${timeoutMinutes} minutes. Large models like ${selectedModel} are very slow on CPU. Consider using a smaller model like 'microsoft/DialoGPT-small' for faster responses.`
          : `Error: Request timed out after ${timeoutMinutes} minutes. Large models may take longer to download.`
        setResponse(message)
        setModelStatus('error')
        setModelError(message)
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
            <p className="text-yellow-600 text-xs mt-1">
              ⏱️ Large models may take several minutes to download on first use
            </p>
          </div>
        )
      case 'ready':
        return null
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

  // Helper function to check if a model is loaded
  const isModelLoaded = (modelName: string) => {
    // Mistral models are hosted models and should always be considered ready
    if (modelName.includes('Mistral') || modelName.includes('Mixtral')) {
      return true
    }
    
    // For other local models, check if they're loaded
    return modelStatuses.find(model => model.name === modelName)?.is_loaded || false
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Mistral Playground</h1>
            <p className="text-muted-foreground">
          Explore and experiment with Mistral AI models
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
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Model</label>
                <div className="flex gap-2">
                  <Button
                    onClick={fetchModelStatuses}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  >
                    🔄 Refresh Status
                  </Button>
                  <Button
                    onClick={async () => {
                      try {
                        console.log('🧪 Testing API endpoints...')
                        
                        // Test multiple endpoints
                        const endpoints = [
                          '/api/v1/models/list',
                          '/api/v1/models/available',
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
                        
                        console.log('🧪 All API test results:', results)
                        
                        // Show summary
                        const workingEndpoints = Object.keys(results).filter(k => results[k].ok)
                        const failedEndpoints = Object.keys(results).filter(k => !results[k].ok)
                        
                        let message = `API Test Results:\n\n`
                        message += `✅ Working (${workingEndpoints.length}): ${workingEndpoints.join(', ')}\n\n`
                        message += `❌ Failed (${failedEndpoints.length}): ${failedEndpoints.join(', ')}\n\n`
                        
                        if (results['/api/v1/models/list']?.ok) {
                          const models = results['/api/v1/models/list'].data
                          message += `📋 Models found: ${models.length}\n`
                          message += `Models: ${models.join(', ')}`
                        }
                        
                        alert(message)
                      } catch (error) {
                        console.error('Comprehensive API test failed:', error)
                        alert('Comprehensive API test failed: ' + error)
                      }
                    }}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  >
                    🐛 Test API
                  </Button>
                </div>
              </div>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full p-2 mt-1 border rounded-md"
              >
                {availableModels.length === 0 ? (
                  <option value="" disabled>
                    ⚠️ No models available - check console for details
                  </option>
                ) : (
                  availableModels.map((modelName) => {
                    const isLoaded = isModelLoaded(modelName)
                    const isRecommended = modelName === 'gpt-4o-mini' || 
                                         modelName === 'gpt-3.5-turbo' ||
                                         modelName === 'claude-3-5-haiku-20241022' ||
                                         modelName === 'gemini-1.5-flash' ||
                                         modelName === 'microsoft/DialoGPT-small' ||
                                         modelName === 'google/gemma-7b-it' ||
                                         modelName === 'mistralai/Mistral-7B-Instruct-v0.2' ||
                                         modelName === 'mistralai/Mistral-7B-Instruct-v0.3' ||
                                         modelName === 'mistralai/Mixtral-8x7B-Instruct-v0.1-GGUF'
                    
                    // Generate description based on model name
                    let description = ''
                    
                    // Hosted models
                    if (modelName.startsWith('gpt-')) {
                      if (modelName.includes('4o')) {
                        description = 'Latest GPT-4 model (fast, capable)'
                      } else if (modelName.includes('3.5')) {
                        description = 'Reliable GPT-3.5 model (cost-effective)'
                      } else {
                        description = 'OpenAI model'
                      }
                    } else if (modelName.startsWith('claude-')) {
                      if (modelName.includes('opus')) {
                        description = 'Most capable Claude model'
                      } else if (modelName.includes('sonnet')) {
                        description = 'Balanced Claude model'
                      } else if (modelName.includes('haiku')) {
                        description = 'Fast Claude model (cost-effective)'
                      } else {
                        description = 'Anthropic model'
                      }
                    } else if (modelName.startsWith('gemini-')) {
                      if (modelName.includes('1.5-pro')) {
                        description = 'Most capable Gemini model'
                      } else if (modelName.includes('1.5-flash')) {
                        description = 'Fast Gemini model (cost-effective)'
                      } else if (modelName.includes('1.0-pro')) {
                        description = 'Reliable Gemini model'
                      } else {
                        description = 'Google Gemini model'
                      }
                    }
                    // Local models
                    else if (modelName.includes('DialoGPT')) {
                      if (modelName.includes('small')) {
                        description = 'Small model (~500MB RAM)'
                      } else if (modelName.includes('medium')) {
                        description = 'Medium model (~1.5GB RAM)'
                      } else if (modelName.includes('large')) {
                        description = 'Large model (~3GB RAM)'
                      } else {
                        description = 'DialoGPT model'
                      }
                    } else if (modelName.includes('gemma')) {
                      if (modelName.includes('2b')) {
                        description = 'Small model (~4GB RAM)'
                      } else if (modelName.includes('7b')) {
                        description = 'Medium model (~14GB RAM)'
                      } else if (modelName.includes('27b')) {
                        description = 'Large model (~54GB RAM)'
                      } else {
                        description = 'Google Gemma model'
                      }
                    } else if (modelName.includes('Llama')) {
                      if (modelName.includes('1B')) {
                        description = 'Small model (~2GB RAM)'
                      } else if (modelName.includes('8B')) {
                        description = 'Medium model (~16GB RAM)'
                      } else if (modelName.includes('70B')) {
                        description = 'Large model (~140GB RAM)'
                      } else {
                        description = 'Meta Llama model'
                      }
                    } else if (modelName.includes('Mistral') || modelName.includes('Mixtral')) {
                      if (modelName.includes('Mixtral-8x7B')) {
                    if (modelName.includes('GGUF')) {
                          description = 'CPU optimized high performance (~32GB RAM)'
                        } else {
                          description = 'High performance model (~32GB RAM)'
                        }
                      } else if (modelName.includes('Mistral-7B')) {
                        if (modelName.includes('Instruct')) {
                          description = 'Instruction tuned model (~14GB RAM)'
                        } else {
                          description = 'Base model (~14GB RAM)'
                        }
                      } else {
                        description = 'Mistral AI model'
                      }
                    } else {
                      description = 'Standard model'
                    }
                    
                    // Status indicator based on new three-state design
                    let statusIcon = '⏳' // Not Downloaded
                    let statusText = ''
                    
                    if (isLoaded) {
                      statusIcon = '✅' // Ready
                      statusText = ' - Ready'
                    } else {
                      // For now, we'll assume if not loaded, it's not downloaded
                      // In a real implementation, we'd check download status
                      statusIcon = '⏳' // Not Downloaded
                      statusText = ' - Not Downloaded'
                    }
                    
                    return (
                      <option key={modelName} value={modelName}>
                        {statusIcon} {modelName} - {description}
                        {isRecommended && ' ⭐ Recommended'}
                        {statusText}
                      </option>
                    )
                  })
                )}
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
              
              {/* Model Status Info */}
              <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded-md">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Model Status Guide:</span>
                </p>
                <div className="text-xs text-gray-600 mt-1 space-y-1">
                  <div className="flex items-center">
                    <span className="mr-2">⏳</span>
                    <span>Not Downloaded - Click "Download" on Models page</span>
                  </div>
                  <div className="flex items-center">
                    <span className="mr-2">📦</span>
                    <span>Downloaded - On disk, ready to load</span>
                  </div>
                  <div className="flex items-center">
                    <span className="mr-2">✅</span>
                    <span>Ready - Loaded in memory, ready to use</span>
                  </div>
                </div>
                {modelStatuses.filter(m => m.is_loaded).length > 0 && (
                  <p className="text-xs text-green-600 mt-2">
                    <span className="font-medium">Ready models:</span> {modelStatuses.filter(m => m.is_loaded).map(m => m.name).join(', ')}
                  </p>
                )}
                
                {/* Management Tip */}
                <div className="mt-3 pt-2 border-t border-gray-200">
                  <p className="text-xs text-blue-600">
                    <span className="font-medium">💡 Tip:</span> Visit the{' '}
                    <a 
                      href="/models" 
                      className="underline hover:text-blue-800 font-medium"
                      title="Go to Models page for advanced model management"
                    >
                      Models page
                    </a>{' '}
                    to download and load models proactively for better performance.
                  </p>
                </div>
              </div>
              
              {/* Show success message for Mistral models since they are always ready */}
              {selectedModel.includes('Mistral') && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-800">
                    <span className="font-medium">✅ Model Ready:</span> Mistral models are always ready to use.
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    You can start generating responses immediately. The model will be downloaded and loaded automatically when needed.
                  </p>
                </div>
              )}
              
              {/* Show warning only for non-Mistral models that are not loaded */}
              {!selectedModel.includes('Mistral') && !isModelLoaded(selectedModel) && (
                <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
                  <p className="text-sm text-amber-800">
                    <span className="font-medium">⚠️ Model Not Ready:</span> This model needs to be downloaded and loaded before use.
                  </p>
                  <p className="text-xs text-amber-600 mt-1">
                    Large models may take 5-10 minutes to download on first use. Visit the Models page to download proactively.
                  </p>
                  <p className="text-xs text-blue-600 mt-2">
                    <span className="font-medium">💡 Pro tip:</span> Download and load models from the{' '}
                    <a 
                      href="/models" 
                      className="underline hover:text-blue-800 font-medium"
                      title="Go to Models page to download and load models proactively"
                    >
                      Models page
                    </a>{' '}
                    before using them here for a better experience.
                  </p>
                </div>
              )}
              
              {/* Show success message for non-Mistral models that are loaded */}
              {!selectedModel.includes('Mistral') && isModelLoaded(selectedModel) && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-800">
                    <span className="font-medium">✅ Model Ready:</span> This model is loaded in memory and ready to use.
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    You can start generating responses immediately. The model will respond quickly since it's already loaded.
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


    </div>
  )
}

export default Playground 