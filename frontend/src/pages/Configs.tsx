import { useState, useEffect } from 'react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Badge } from '../components/ui/badge'
import { useToast } from '../components/ui/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'

interface ApiKeyStatus {
  openai: boolean
  anthropic: boolean
  google: boolean
  huggingface: boolean
}

const Configs = () => {
  const [apiKeys, setApiKeys] = useState({
    openai: '',
    anthropic: '',
    google: '',
    huggingface: ''
  })
  
  const [apiKeyStatus, setApiKeyStatus] = useState<ApiKeyStatus>({
    openai: false,
    anthropic: false,
    google: false,
    huggingface: false
  })

  const { toast } = useToast()

  // Load API keys from localStorage on component mount
  useEffect(() => {
    loadApiKeys()
    loadEnvKeys() // Load keys from .env file
  }, [])

  const loadApiKeys = () => {
    const storedKeys = {
      openai: localStorage.getItem('openai_api_key') || '',
      anthropic: localStorage.getItem('anthropic_api_key') || '',
      google: localStorage.getItem('google_api_key') || '',
      huggingface: localStorage.getItem('huggingface_token') || ''
    }
    setApiKeys(storedKeys)
    
    // Update status
    setApiKeyStatus({
      openai: !!storedKeys.openai,
      anthropic: !!storedKeys.anthropic,
      google: !!storedKeys.google,
      huggingface: !!storedKeys.huggingface
    })
  }

  const loadEnvKeys = async () => {
    try {
      const response = await fetch('/api/v1/configs/env-keys')
      if (response.ok) {
        const envKeys = await response.json()
        
        // Map .env keys to our frontend format
        const mappedKeys = {
          openai: envKeys.OPENAI_API_KEY || '',
          anthropic: envKeys.ANTHROPIC_API_KEY || '',
          google: envKeys.GOOGLE_API_KEY || '',
          huggingface: envKeys.HUGGINGFACE_API_KEY || ''
        }
        
        // Only update if we have keys from .env and they're not already in localStorage
        const updatedKeys = { ...apiKeys }
        let hasNewKeys = false
        
        Object.entries(mappedKeys).forEach(([provider, key]) => {
          const storageKey = provider === 'huggingface' ? 'huggingface_token' : `${provider}_api_key`
          const existingKey = localStorage.getItem(storageKey)
          
          if (key && !existingKey) {
            // Key exists in .env but not in localStorage, so populate it
            updatedKeys[provider as keyof typeof apiKeys] = key
            localStorage.setItem(storageKey, key)
            hasNewKeys = true
          }
        })
        
        if (hasNewKeys) {
          setApiKeys(updatedKeys)
          setApiKeyStatus({
            openai: !!updatedKeys.openai,
            anthropic: !!updatedKeys.anthropic,
            google: !!updatedKeys.google,
            huggingface: !!updatedKeys.huggingface
          })
          
          toast({
            title: "API Keys Loaded",
            description: "API keys from .env file have been loaded into the form.",
            variant: "default"
          })
        }
      }
    } catch (error) {
      console.log('Could not load API keys from .env file:', error)
      // This is expected in Codespaces or when .env file is not accessible
    }
  }

  const saveApiKey = (provider: string, key: string) => {
    const storageKey = provider === 'huggingface' ? 'huggingface_token' : `${provider}_api_key`
    localStorage.setItem(storageKey, key)
    setApiKeys(prev => ({ ...prev, [provider]: key }))
    setApiKeyStatus(prev => ({ ...prev, [provider]: !!key }))
    
    toast({
      title: "API Key Saved",
      description: `${provider === 'huggingface' ? 'HuggingFace Token' : provider.toUpperCase()} has been saved locally.`,
      variant: "default"
    })
  }

  const clearApiKey = (provider: string) => {
    const storageKey = provider === 'huggingface' ? 'huggingface_token' : `${provider}_api_key`
    localStorage.removeItem(storageKey)
    setApiKeys(prev => ({ ...prev, [provider]: '' }))
    setApiKeyStatus(prev => ({ ...prev, [provider]: false }))
    
    toast({
      title: "API Key Cleared",
      description: `${provider === 'huggingface' ? 'HuggingFace Token' : provider.toUpperCase()} has been removed.`,
      variant: "default"
    })
  }

  const getProviderDisplayName = (provider: string) => {
    switch (provider) {
      case 'openai': return 'OpenAI'
      case 'anthropic': return 'Anthropic'
      case 'google': return 'Google'
      case 'huggingface': return 'HuggingFace'
      default: return provider
    }
  }

  const getProviderDescription = (provider: string) => {
    switch (provider) {
      case 'openai': return 'For GPT-4o, GPT-4o-mini, GPT-3.5-turbo models'
      case 'anthropic': return 'For Claude-3-5-haiku, Claude-3-5-sonnet, Claude-3-opus models'
      case 'google': return 'For Gemini-1.5-flash, Gemini-1.0-pro, Gemini-1.5-pro models'
      case 'huggingface': return 'For Mistral, Llama, and Gemma models (gated access)'
      default: return ''
    }
  }

  const getProviderPlaceholder = (provider: string) => {
    switch (provider) {
      case 'openai': return 'sk-...'
      case 'anthropic': return 'sk-ant-...'
      case 'google': return 'AIza...'
      case 'huggingface': return 'hf_...'
      default: return 'Enter API key'
    }
  }

  const getProviderLink = (provider: string) => {
    switch (provider) {
      case 'openai': return 'https://platform.openai.com/api-keys'
      case 'anthropic': return 'https://console.anthropic.com/'
      case 'google': return 'https://makersuite.google.com/app/apikey'
      case 'huggingface': return 'https://huggingface.co/settings/tokens'
      default: return '#'
    }
  }

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'openai': return '🤖'
      case 'anthropic': return '🧠'
      case 'google': return '🔍'
      case 'huggingface': return '🤗'
      default: return '🔑'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configuration</h1>
        <p className="text-muted-foreground">
          Configure your API keys and settings for all model providers
        </p>
      </div>

      <Tabs defaultValue="api-keys" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="api-keys">🔑 API Keys</TabsTrigger>
          <TabsTrigger value="settings">⚙️ Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="api-keys" className="space-y-6">
          {/* API Key Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>API Key Configuration</CardTitle>
              <CardDescription>
                Configure your API keys to use hosted models and gated local models. Keys are stored locally in your browser.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Load from .env button */}
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={loadEnvKeys}
                  className="flex items-center gap-2"
                >
                  🔄 Load from .env
                </Button>
              </div>
              
              {/* Hosted Models Section */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  ☁️ Hosted Models
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {['openai', 'anthropic', 'google'].map((provider) => (
                    <Card key={provider} className="border-2 hover:border-blue-300 transition-colors">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{getProviderIcon(provider)}</span>
                            <div>
                              <CardTitle className="text-base">{getProviderDisplayName(provider)}</CardTitle>
                              <CardDescription className="text-xs">
                                {getProviderDescription(provider)}
                              </CardDescription>
                            </div>
                          </div>
                          <Badge variant={apiKeyStatus[provider as keyof ApiKeyStatus] ? "default" : "secondary"}>
                            {apiKeyStatus[provider as keyof ApiKeyStatus] ? "✅ Configured" : "❌ Missing"}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor={`${provider}-key`} className="text-sm font-medium">
                            API Key
                          </Label>
                          <Input
                            id={`${provider}-key`}
                            type="password"
                            placeholder={getProviderPlaceholder(provider)}
                            value={apiKeys[provider as keyof typeof apiKeys]}
                            onChange={(e) => saveApiKey(provider, e.target.value)}
                            className={apiKeyStatus[provider as keyof ApiKeyStatus] ? 'border-green-300' : ''}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(getProviderLink(provider), '_blank')}
                            className="flex-1"
                          >
                            Get Key
                          </Button>
                          {apiKeyStatus[provider as keyof ApiKeyStatus] && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => clearApiKey(provider)}
                            >
                              Clear
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Gated Models Section */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  🔒 Gated Models
                </h3>
                <Card className="border-2 hover:border-purple-300 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{getProviderIcon('huggingface')}</span>
                        <div>
                          <CardTitle className="text-base">{getProviderDisplayName('huggingface')}</CardTitle>
                          <CardDescription className="text-xs">
                            {getProviderDescription('huggingface')}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant={apiKeyStatus.huggingface ? "default" : "secondary"}>
                        {apiKeyStatus.huggingface ? "✅ Configured" : "❌ Missing"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="huggingface-token" className="text-sm font-medium">
                        HuggingFace Token
                      </Label>
                      <Input
                        id="huggingface-token"
                        type="password"
                        placeholder={getProviderPlaceholder('huggingface')}
                        value={apiKeys.huggingface}
                        onChange={(e) => saveApiKey('huggingface', e.target.value)}
                        className={apiKeyStatus.huggingface ? 'border-green-300' : ''}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(getProviderLink('huggingface'), '_blank')}
                        className="flex-1"
                      >
                        Get Token
                      </Button>
                      {apiKeyStatus.huggingface && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => clearApiKey('huggingface')}
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Instructions */}
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-blue-800">📋 How to Get Your API Keys</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-blue-800 mb-2">☁️ Hosted Models</h4>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>• <strong>OpenAI:</strong> Visit <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">platform.openai.com</a></li>
                        <li>• <strong>Anthropic:</strong> Visit <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="underline">console.anthropic.com</a></li>
                        <li>• <strong>Google:</strong> Visit <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline">makersuite.google.com</a></li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-blue-800 mb-2">🔒 Gated Models</h4>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>• <strong>HuggingFace:</strong> Visit <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noopener noreferrer" className="underline">huggingface.co/settings/tokens</a></li>
                        <li>• Click "New token" and give it a name</li>
                        <li>• Select "Read" permissions</li>
                        <li>• Copy the token (starts with "hf_")</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Application Settings</CardTitle>
              <CardDescription>
                Configure application preferences and behavior
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-8 text-center border-2 border-dashed rounded-lg">
                <h3 className="text-lg font-medium mb-2">Coming Soon</h3>
                <p className="text-muted-foreground">
                  Additional settings will be available in future releases
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default Configs 