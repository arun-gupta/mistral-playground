import { useState } from 'react'
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

  const handleSubmit = async () => {
    if (!prompt.trim()) return
    
    setLoading(true)
    console.log('🚀 Starting generation with:', {
      prompt,
      systemPrompt,
      selectedModel,
      selectedProvider,
      temperature,
      maxTokens,
      topP
    })
    
    const requestBody = {
      prompt: prompt,
      system_prompt: systemPrompt || undefined,
      model_name: selectedModel,
      provider: selectedProvider,
      temperature: temperature,
      max_tokens: maxTokens,
      top_p: topP
    }
    
    console.log('📤 Sending request to API:', requestBody)
    
    // First, test if we can reach the backend
    try {
      console.log('🔍 Testing backend connection...')
      const testResponse = await fetch('/api/v1/models/test')
      console.log('✅ Backend test response:', testResponse.status)
      
      // Also test the simple endpoint
      const simpleResponse = await fetch('/api/v1/models/simple')
      console.log('✅ Simple endpoint response:', simpleResponse.status)
    } catch (testError) {
      console.log('❌ Backend test failed:', testError)
    }
    
    try {
      console.log('⏱️ Starting fetch request...')
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
        const data = await response.json()
        console.log('✅ Success response:', data)
        console.log('✅ Response text:', data.text)
        setResponse(data.text)
      } else {
        console.log('📥 Reading error response body...')
        const errorData = await response.json().catch(() => ({}))
        console.log('❌ Error response:', errorData)
        setResponse(`Error: ${errorData.detail || 'Could not generate response'}`)
      }
    } catch (error: any) {
      console.log('💥 Network error:', error)
      if (error.name === 'AbortError') {
        setResponse('Error: Request timed out after 30 seconds')
      } else {
        setResponse(`Error: Network error - ${error}`)
      }
    } finally {
      console.log('🏁 Request completed, setting loading to false')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mistral Playground</h1>
        <p className="text-muted-foreground">
          Explore and fine-tune prompts across Mistral's open models
        </p>
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
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                  className="w-full p-2 mt-1 border rounded-md"
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
              onClick={handleSubmit} 
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