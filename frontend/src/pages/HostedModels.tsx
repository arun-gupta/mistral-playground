import { useState, useEffect } from 'react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { useToast } from '../components/ui/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'

interface HostedModel {
  name: string
  provider: string
  description: string
  cost_per_1k_tokens: {
    input: number
    output: number
  }
  max_tokens: number
  context_length: number
}

interface HostedModelResponse {
  text: string
  model_name: string
  provider: string
  tokens_used: number
  input_tokens: number
  output_tokens: number
  latency_ms: number
  finish_reason: string
}

interface ApiKeyStatus {
  openai: boolean
  anthropic: boolean
  google: boolean
}

const HostedModels = () => {
  const [hostedModels, setHostedModels] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(true)
  const [apiKeys, setApiKeys] = useState({
    openai: '',
    anthropic: '',
    google: ''
  })
  const [apiKeyStatus, setApiKeyStatus] = useState<ApiKeyStatus>({
    openai: false,
    anthropic: false,
    google: false
  })
  const [selectedModel, setSelectedModel] = useState('')
  const [selectedProvider, setSelectedProvider] = useState('')
  const [prompt, setPrompt] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [temperature, setTemperature] = useState(0.7)
  const [maxTokens, setMaxTokens] = useState(1000)
  const [topP, setTopP] = useState(0.9)
  const [generating, setGenerating] = useState(false)
  const [response, setResponse] = useState<HostedModelResponse | null>(null)
  const { toast } = useToast()

  // Model definitions with metadata
  const modelMetadata: Record<string, HostedModel> = {
    // OpenAI Models
    'gpt-4o': {
      name: 'GPT-4o',
      provider: 'openai',
      description: 'Latest and most capable model from OpenAI',
      cost_per_1k_tokens: { input: 2.50, output: 10.00 },
      max_tokens: 4096,
      context_length: 128000
    },
    'gpt-4o-mini': {
      name: 'GPT-4o Mini',
      provider: 'openai',
      description: 'Fast, cost-effective alternative to GPT-4o',
      cost_per_1k_tokens: { input: 0.15, output: 0.60 },
      max_tokens: 4096,
      context_length: 128000
    },
    'gpt-4-turbo': {
      name: 'GPT-4 Turbo',
      provider: 'openai',
      description: 'Previous generation GPT-4 model',
      cost_per_1k_tokens: { input: 10.00, output: 30.00 },
      max_tokens: 4096,
      context_length: 128000
    },
    'gpt-3.5-turbo': {
      name: 'GPT-3.5 Turbo',
      provider: 'openai',
      description: 'Reliable, cost-effective for most tasks',
      cost_per_1k_tokens: { input: 0.50, output: 1.50 },
      max_tokens: 4096,
      context_length: 16385
    },
    
    // Anthropic Models
    'claude-3-5-sonnet-20241022': {
      name: 'Claude 3.5 Sonnet',
      provider: 'anthropic',
      description: 'Excellent reasoning and coding capabilities',
      cost_per_1k_tokens: { input: 3.00, output: 15.00 },
      max_tokens: 4096,
      context_length: 200000
    },
    'claude-3-5-haiku-20241022': {
      name: 'Claude 3.5 Haiku',
      provider: 'anthropic',
      description: 'Fast, cost-effective Claude model',
      cost_per_1k_tokens: { input: 0.25, output: 1.25 },
      max_tokens: 4096,
      context_length: 200000
    },
    'claude-3-opus-20240229': {
      name: 'Claude 3 Opus',
      provider: 'anthropic',
      description: 'Most capable Claude model',
      cost_per_1k_tokens: { input: 15.00, output: 75.00 },
      max_tokens: 4096,
      context_length: 200000
    },
    'claude-3-sonnet-20240229': {
      name: 'Claude 3 Sonnet',
      provider: 'anthropic',
      description: 'Balanced performance and cost',
      cost_per_1k_tokens: { input: 3.00, output: 15.00 },
      max_tokens: 4096,
      context_length: 200000
    },
    'claude-3-haiku-20240307': {
      name: 'Claude 3 Haiku',
      provider: 'anthropic',
      description: 'Fast and efficient Claude model',
      cost_per_1k_tokens: { input: 0.25, output: 1.25 },
      max_tokens: 4096,
      context_length: 200000
    },
    
    // Google Models
    'gemini-1.5-pro': {
      name: 'Gemini 1.5 Pro',
      provider: 'google',
      description: 'Excellent for long context and complex tasks',
      cost_per_1k_tokens: { input: 3.50, output: 10.50 },
      max_tokens: 8192,
      context_length: 1000000
    },
    'gemini-1.5-flash': {
      name: 'Gemini 1.5 Flash',
      provider: 'google',
      description: 'Fast, cost-effective Gemini model',
      cost_per_1k_tokens: { input: 0.075, output: 0.30 },
      max_tokens: 8192,
      context_length: 1000000
    },
    'gemini-1.0-pro': {
      name: 'Gemini 1.0 Pro',
      provider: 'google',
      description: 'Reliable, well-tested Gemini model',
      cost_per_1k_tokens: { input: 1.50, output: 4.50 },
      max_tokens: 8192,
      context_length: 32768
    }
  }

  useEffect(() => {
    fetchHostedModels()
    loadApiKeys()
  }, [])

  const fetchHostedModels = async () => {
    try {
      const response = await fetch('/api/v1/models/hosted')
      if (response.ok) {
        const data = await response.json()
        setHostedModels(data.providers)
      } else {
        console.error('Failed to fetch hosted models')
        // Fallback to hardcoded models
        setHostedModels({
          openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
          anthropic: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
          google: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro']
        })
      }
    } catch (error) {
      console.error('Error fetching hosted models:', error)
      // Fallback to hardcoded models
      setHostedModels({
        openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
        anthropic: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
        google: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro']
      })
    } finally {
      setLoading(false)
    }
  }

  const loadApiKeys = () => {
    // Load API keys from localStorage
    const storedKeys = {
      openai: localStorage.getItem('openai_api_key') || '',
      anthropic: localStorage.getItem('anthropic_api_key') || '',
      google: localStorage.getItem('google_api_key') || ''
    }
    setApiKeys(storedKeys)
    
    // Check which keys are configured
    setApiKeyStatus({
      openai: !!storedKeys.openai,
      anthropic: !!storedKeys.anthropic,
      google: !!storedKeys.google
    })
  }

  const saveApiKey = (provider: string, key: string) => {
    localStorage.setItem(`${provider}_api_key`, key)
    setApiKeys(prev => ({ ...prev, [provider]: key }))
    setApiKeyStatus(prev => ({ ...prev, [provider]: !!key }))
    
    toast({
      title: "API Key Saved",
      description: `${provider.toUpperCase()} API key has been saved locally.`,
    })
  }

  const generateResponse = async () => {
    if (!selectedModel || !prompt.trim()) {
      toast({
        title: "Missing Information",
        description: "Please select a model and enter a prompt.",
        variant: "destructive"
      })
      return
    }

    const provider = modelMetadata[selectedModel]?.provider
    if (!provider || !apiKeyStatus[provider as keyof ApiKeyStatus]) {
      toast({
        title: "API Key Required",
        description: `Please configure your ${provider.toUpperCase()} API key first.`,
        variant: "destructive"
      })
      return
    }

    setGenerating(true)
    setResponse(null)

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      
      // Add API key to headers based on provider
      if (provider === 'openai' && apiKeys.openai) {
        headers['X-OpenAI-API-Key'] = apiKeys.openai
      } else if (provider === 'anthropic' && apiKeys.anthropic) {
        headers['X-Anthropic-API-Key'] = apiKeys.anthropic
      } else if (provider === 'google' && apiKeys.google) {
        headers['X-Google-API-Key'] = apiKeys.google
      }
      
      const response = await fetch('/api/v1/models/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          prompt: prompt,
          system_prompt: systemPrompt || undefined,
          model_name: selectedModel,
          provider: provider,
          temperature: temperature,
          max_tokens: maxTokens,
          top_p: topP
        })
      })

      if (response.ok) {
        const data = await response.json()
        setResponse(data)
        
        // Calculate estimated cost
        const metadata = modelMetadata[selectedModel]
        if (metadata) {
          const inputCost = (data.input_tokens / 1000) * metadata.cost_per_1k_tokens.input
          const outputCost = (data.output_tokens / 1000) * metadata.cost_per_1k_tokens.output
          const totalCost = inputCost + outputCost
          
          toast({
            title: "Generation Complete",
            description: `Cost: ~$${totalCost.toFixed(4)} (${data.input_tokens} input + ${data.output_tokens} output tokens)`,
          })
        }
      } else {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Generation failed')
      }
    } catch (error) {
      console.error('Generation error:', error)
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : 'An error occurred during generation.',
        variant: "destructive"
      })
    } finally {
      setGenerating(false)
    }
  }

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'openai': return 'bg-green-100 text-green-800 border-green-200'
      case 'anthropic': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'google': return 'bg-purple-100 text-purple-800 border-purple-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'openai': return '🤖'
      case 'anthropic': return '🧠'
      case 'google': return '🔍'
      default: return '🌐'
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading hosted models...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Hosted Models</h1>
        <p className="text-gray-600">Generate responses using cloud-based AI models</p>
      </div>

      {/* API Key Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>API Key Configuration</CardTitle>
          <CardDescription>
            Configure your API keys to use hosted models. Keys are stored locally in your browser.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['openai', 'anthropic', 'google'].map((provider) => (
              <div key={provider} className="space-y-2">
                <Label htmlFor={`${provider}-key`} className="flex items-center gap-2">
                  {getProviderIcon(provider)} {provider.toUpperCase()}
                  {apiKeyStatus[provider as keyof ApiKeyStatus] && (
                    <Badge variant="secondary" className="text-xs">✓ Configured</Badge>
                  )}
                </Label>
                <Input
                  id={`${provider}-key`}
                  type="password"
                  placeholder={`Enter ${provider.toUpperCase()} API key`}
                  value={apiKeys[provider as keyof typeof apiKeys]}
                  onChange={(e) => saveApiKey(provider, e.target.value)}
                  className={apiKeyStatus[provider as keyof ApiKeyStatus] ? 'border-green-300' : ''}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Model Selection and Generation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Model Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Model Selection</CardTitle>
            <CardDescription>Choose a model and configure generation parameters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={selectedProvider} onValueChange={setSelectedProvider}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="openai" className="flex items-center gap-2">
                  🤖 OpenAI
                </TabsTrigger>
                <TabsTrigger value="anthropic" className="flex items-center gap-2">
                  🧠 Anthropic
                </TabsTrigger>
                <TabsTrigger value="google" className="flex items-center gap-2">
                  🔍 Google
                </TabsTrigger>
              </TabsList>
              
              {['openai', 'anthropic', 'google'].map((provider) => (
                <TabsContent key={provider} value={provider} className="space-y-4">
                  <div className="grid grid-cols-1 gap-3">
                    {hostedModels[provider]?.map((modelName) => {
                      const metadata = modelMetadata[modelName]
                      return (
                        <div
                          key={modelName}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedModel === modelName
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => setSelectedModel(modelName)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{metadata?.name || modelName}</h4>
                              <p className="text-sm text-gray-600">{metadata?.description}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  ${metadata?.cost_per_1k_tokens.input.toFixed(3)}/1k input
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  ${metadata?.cost_per_1k_tokens.output.toFixed(3)}/1k output
                                </Badge>
                              </div>
                            </div>
                            {selectedModel === modelName && (
                              <Badge className="bg-blue-500">Selected</Badge>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </TabsContent>
              ))}
            </Tabs>

            {/* Generation Parameters */}
            {selectedModel && (
              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-medium">Generation Parameters</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="temperature">Temperature</Label>
                    <Input
                      id="temperature"
                      type="number"
                      min="0"
                      max="2"
                      step="0.1"
                      value={temperature}
                      onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxTokens">Max Tokens</Label>
                    <Input
                      id="maxTokens"
                      type="number"
                      min="1"
                      max="8192"
                      value={maxTokens}
                      onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="topP">Top P</Label>
                  <Input
                    id="topP"
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={topP}
                    onChange={(e) => setTopP(parseFloat(e.target.value))}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Prompt and Response */}
        <Card>
          <CardHeader>
            <CardTitle>Prompt & Response</CardTitle>
            <CardDescription>Enter your prompt and generate a response</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="systemPrompt">System Prompt (Optional)</Label>
              <Textarea
                id="systemPrompt"
                placeholder="Enter system prompt..."
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={2}
              />
            </div>
            
            <div>
              <Label htmlFor="prompt">User Prompt</Label>
              <Textarea
                id="prompt"
                placeholder="Enter your prompt here..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
              />
            </div>

            <Button
              onClick={generateResponse}
              disabled={generating || !selectedModel || !prompt.trim()}
              className="w-full"
            >
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generating...
                </>
              ) : (
                'Generate Response'
              )}
            </Button>

            {/* Response Display */}
            {response && (
              <div className="space-y-3 pt-4 border-t">
                <h4 className="font-medium">Response</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="whitespace-pre-wrap">{response.text}</p>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Tokens: {response.input_tokens} input + {response.output_tokens} output</span>
                  <span>Latency: {response.latency_ms.toFixed(0)}ms</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default HostedModels 