import { useState, useEffect, useRef } from 'react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Progress } from '../components/ui/progress'
import { useToast } from '../components/ui/use-toast'

interface DocumentChunk {
  text: string
  metadata: {
    source: string
    chunk_index: number
    chunk_size: number
  }
  similarity_score: number
  rank: number
}

interface RAGResponse {
  query: string
  answer: string
  retrieved_documents: DocumentChunk[]
  model_response: {
    text: string
    tokens_used: number
    latency_ms: number
  }
}

interface CollectionInfo {
  name: string
  description?: string
  tags?: string[]
  document_count: number
  chunk_count: number
  total_size_mb?: number
  created_at: string
  last_updated: string
  last_queried?: string
  is_public?: boolean
  owner?: string
}

const RAG = () => {
  const [file, setFile] = useState<File | null>(null)
  const [collectionName, setCollectionName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'success' | 'error'>('idle')
  const [lastUploadedCollection, setLastUploadedCollection] = useState<string | null>(null)
  const [collections, setCollections] = useState<CollectionInfo[]>([])
  const [selectedCollection, setSelectedCollection] = useState('')
  const [query, setQuery] = useState('')
  const [ragResponse, setRagResponse] = useState<RAGResponse | null>(null)
  const [querying, setQuerying] = useState(false)
  const [temperature, setTemperature] = useState(0.7)
  const [maxTokens, setMaxTokens] = useState(500)
  const [topK, setTopK] = useState(3)
  const [selectedModel, setSelectedModel] = useState('microsoft/DialoGPT-medium')
  const [selectedProvider, setSelectedProvider] = useState('huggingface')
  const [showContext, setShowContext] = useState(false)
  const [modelStatuses, setModelStatuses] = useState<Array<{name: string, is_loaded: boolean}>>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [showCollectionDetails, setShowCollectionDetails] = useState(false)
  const [collectionDescription, setCollectionDescription] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [customTag, setCustomTag] = useState('')
  const [collectionVisibility, setCollectionVisibility] = useState<'private' | 'public'>('private')
  const [allTags, setAllTags] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  // Fetch model statuses
  const fetchModelStatuses = async () => {
    try {
      const response = await fetch('/api/v1/models/available')
      if (response.ok) {
        const data = await response.json()
        setModelStatuses(data.map((model: any) => ({
          name: model.name,
          is_loaded: model.is_loaded
        })))
      }
    } catch (error) {
      console.log('Could not fetch model statuses:', error)
    }
  }

  // Check if selected model is loaded
  const isModelLoaded = (modelName: string) => {
    return modelStatuses.find(model => model.name === modelName)?.is_loaded || false
  }

  // Available models for RAG
  const availableModels = [
    { name: 'microsoft/DialoGPT-small', provider: 'huggingface', description: 'Fast, small model (117M params)' },
    { name: 'microsoft/DialoGPT-medium', provider: 'huggingface', description: 'Balanced model (345M params)' },
    { name: 'microsoft/DialoGPT-large', provider: 'huggingface', description: 'Better quality (774M params)' },
    { name: 'TheBloke/Mistral-7B-Instruct-v0.1-GGUF', provider: 'huggingface', description: 'High quality, CPU optimized' },
    { name: 'TheBloke/Mistral-7B-Instruct-v0.2-GGUF', provider: 'huggingface', description: 'Latest Mistral, CPU optimized' },
    { name: 'mistralai/Mistral-7B-Instruct-v0.1', provider: 'huggingface', description: 'Full Mistral model (high RAM)' },
    { name: 'mistralai/Mistral-7B-Instruct-v0.2', provider: 'huggingface', description: 'Latest full Mistral model' },
    
    // Meta Llama models
    { name: 'TheBloke/Llama-2-7B-Chat-GGUF', provider: 'huggingface', description: 'Llama-2 chat, CPU optimized' },
    { name: 'TheBloke/Llama-2-13B-Chat-GGUF', provider: 'huggingface', description: 'Large Llama-2 chat, CPU optimized' },
    { name: 'meta-llama/Llama-2-7b-chat-hf', provider: 'huggingface', description: 'Full Llama-2 chat model' },
    
    // Google Gemma models
    { name: 'google/gemma-2b', provider: 'huggingface', description: 'Small, efficient Gemma model' },
    { name: 'google/gemma-7b', provider: 'huggingface', description: 'Medium Gemma model, good performance' },
    { name: 'google/gemma-2b-it', provider: 'huggingface', description: 'Instruction-tuned Gemma-2B' },
    { name: 'google/gemma-7b-it', provider: 'huggingface', description: 'Instruction-tuned Gemma-7B' },
    
    // Mixtral models
    { name: 'TheBloke/Mixtral-8x7B-Instruct-v0.1-GGUF', provider: 'huggingface', description: 'High-performance Mixtral, CPU optimized' }
  ]

  // Generate default collection name from file
  useEffect(() => {
    if (file && !collectionName) {
      const baseName = file.name.replace(/\.[^/.]+$/, '') // Remove extension
      const timestamp = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
      setCollectionName(`${baseName}-${timestamp}`)
    }
  }, [file, collectionName])

  // Initialize data on component mount
  useEffect(() => {
    fetchCollections()
    fetchModelStatuses()
  }, [])

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      const allowedTypes = ['.pdf', '.txt', '.md']
      const fileExt = selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf('.'))
      
      if (!allowedTypes.includes(fileExt)) {
        toast({
          title: "Invalid file type",
          description: "Please select a PDF, TXT, or MD file.",
          variant: "destructive"
        })
        return
      }
      
      setFile(selectedFile)
      setCollectionName('') // Reset to trigger auto-generation
    }
  }

  // Upload and process document
  const handleUpload = async () => {
    if (!file || !collectionName) {
      toast({
        title: "Missing information",
        description: "Please select a file and enter a collection name.",
        variant: "destructive"
      })
      return
    }

    setUploading(true)
    setUploadProgress(0)
    setUploadStatus('uploading')

    const formData = new FormData()
    formData.append('file', file)
    formData.append('collection_name', collectionName)
    formData.append('description', collectionDescription)
    formData.append('tags', JSON.stringify(selectedTags))
    formData.append('is_public', collectionVisibility === 'public' ? 'true' : 'false')
    formData.append('chunk_size', '1000')
    formData.append('chunk_overlap', '200')

    try {
      // Simulate progress for upload phase
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev < 30) return prev + 5
          return prev
        })
      }, 200)



      const response = await fetch('/api/v1/rag/upload', {
        method: 'POST',
        body: formData
      })

      clearInterval(progressInterval)
      setUploadStatus('processing')
      setUploadProgress(50)

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`)
      }

      // Simulate processing progress
      const processingInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90))
      }, 300)

      const result = await response.json()

      clearInterval(processingInterval)
      setUploadProgress(100)
      setUploadStatus('success')
      setLastUploadedCollection(result.collection_name)
      
      // Check if collection name was sanitized
      const originalName = collectionName.trim()
      const finalName = result.collection_name
      const wasSanitized = originalName !== finalName
      
      toast({
        title: "Document processed successfully! 🎉",
        description: wasSanitized 
          ? `Created ${result.chunks_processed} chunks in collection "${finalName}" (sanitized from "${originalName}")`
          : `Created ${result.chunks_processed} chunks in collection "${finalName}"`,
      })

      // Reset form after a delay to show success state
      setTimeout(() => {
        setFile(null)
        setCollectionName('')
        setCollectionDescription('')
        setSelectedTags([])
        setCustomTag('')
        setCollectionVisibility('private')
        setSelectedCollection(result.collection_name)
        setUploadStatus('idle')
        setLastUploadedCollection(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }, 2000)

      // Refresh collections
      fetchCollections()

    } catch (error) {
      console.error('Upload error:', error)
      setUploadStatus('error')
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An error occurred during upload",
        variant: "destructive"
      })
    } finally {
      setUploading(false)
      setTimeout(() => {
        setUploadProgress(0)
        if (uploadStatus !== 'success') {
          setUploadStatus('idle')
        }
      }, 1000)
    }
  }

  // Extract all unique tags from collections
  const extractAllTags = (collections: CollectionInfo[]) => {
    const tagSet = new Set<string>()
    collections.forEach(collection => {
      if (collection.tags && Array.isArray(collection.tags)) {
        collection.tags.forEach(tag => tagSet.add(tag))
      }
    })
    return Array.from(tagSet).sort()
  }

  // Get suggested tags for new collections (existing tags + useful defaults)
  const getSuggestedTags = () => {
    const defaultTags = ['research', 'documentation', 'reports', 'legal', 'technical', 'business']
    const existingTags = allTags.filter(tag => !defaultTags.includes(tag))
    return [...defaultTags, ...existingTags].slice(0, 12) // Limit to 12 tags for UI
  }

  // Fetch available collections
  const fetchCollections = async () => {
    try {
      const response = await fetch('/api/v1/rag/collections')
      if (response.ok) {
        const data = await response.json()
        setCollections(data)
        // Update all tags when collections change
        setAllTags(extractAllTags(data))
        if (data.length > 0 && !selectedCollection) {
          setSelectedCollection(data[0].name)
        }
      }
    } catch (error) {
      console.error('Failed to fetch collections:', error)
    }
  }

  // Query RAG system
  const handleQuery = async () => {
    if (!query.trim() || !selectedCollection) {
      toast({
        title: "Missing information",
        description: "Please enter a query and select a collection.",
        variant: "destructive"
      })
      return
    }

    setQuerying(true)
    setRagResponse(null)

    try {
      const response = await fetch('/api/v1/rag/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: query.trim(),
          collection_name: selectedCollection,
          model_name: selectedModel,
          provider: selectedProvider,
          temperature: temperature,
          max_tokens: maxTokens,
          top_k: topK
        })
      })

      if (!response.ok) {
        throw new Error(`Query failed: ${response.statusText}`)
      }

      const result = await response.json()
      setRagResponse(result)

    } catch (error) {
      console.error('Query error:', error)
      toast({
        title: "Query failed",
        description: error instanceof Error ? error.message : "An error occurred during query",
        variant: "destructive"
      })
    } finally {
      setQuerying(false)
    }
  }

  // Copy text to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied to clipboard",
      description: "Text has been copied to your clipboard",
    })
  }

  const handleEditCollection = (collection: CollectionInfo) => {
    // TODO: Implement collection editing modal
    toast({
      title: "Edit Collection",
      description: `Editing collection: ${collection.name}`,
    })
  }

  const handleDeleteCollection = async (collectionName: string) => {
    if (!confirm(`Are you sure you want to delete collection "${collectionName}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/v1/rag/collections/${collectionName}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast({
          title: "Collection deleted",
          description: `Collection "${collectionName}" has been deleted`,
        })
        fetchCollections()
        if (selectedCollection === collectionName) {
          setSelectedCollection('')
        }
      } else {
        throw new Error('Failed to delete collection')
      }
    } catch (error) {
      toast({
        title: "Delete failed",
        description: "Failed to delete collection",
        variant: "destructive"
      })
    }
  }

  // Tag management functions
  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  const addCustomTag = () => {
    if (customTag.trim() && !selectedTags.includes(customTag.trim())) {
      setSelectedTags(prev => [...prev, customTag.trim()])
      setCustomTag('')
    }
  }

  const removeTag = (tag: string) => {
    setSelectedTags(prev => prev.filter(t => t !== tag))
  }

  // Load collections and model statuses on mount
  useEffect(() => {
    fetchCollections()
    fetchModelStatuses()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">RAG Mode</h1>
        <p className="text-muted-foreground">
          Upload documents and generate grounded answers using Retrieval-Augmented Generation
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Document Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📤 Upload Document
            </CardTitle>
            <CardDescription>
              Upload a PDF, TXT, or MD file to create a knowledge base
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="file-upload" className="block text-sm font-medium mb-1">Select Document</label>
              <input
                id="file-upload"
                type="file"
                accept=".pdf,.txt,.md"
                onChange={handleFileSelect}
                ref={fileInputRef}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {file && (
                <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  📄 {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </div>
              )}
            </div>

            <div>
              <label htmlFor="collection-name" className="block text-sm font-medium mb-1">Collection Name</label>
              <input
                id="collection-name"
                type="text"
                value={collectionName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCollectionName(e.target.value)}
                placeholder="Enter collection name"
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                💡 Collection names will be automatically sanitized to use only letters, numbers, underscores, and hyphens
              </p>
            </div>

            <div>
              <label htmlFor="collection-description" className="block text-sm font-medium mb-1">Description (Optional)</label>
              <textarea
                id="collection-description"
                value={collectionDescription}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCollectionDescription(e.target.value)}
                placeholder="Describe what this collection contains..."
                rows={2}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Tags (Optional)</label>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {getSuggestedTags().map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                        selectedTags.includes(tag)
                          ? 'bg-blue-100 border-blue-300 text-blue-700'
                          : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={customTag}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addCustomTag()}
                  placeholder="Add custom tag and press Enter"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {selectedTags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedTags.map((tag) => (
                      <span key={tag} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full flex items-center gap-1">
                        #{tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Visibility</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="visibility"
                    value="private"
                    checked={collectionVisibility === 'private'}
                    onChange={(e) => setCollectionVisibility(e.target.value as 'private' | 'public')}
                    className="text-blue-600"
                  />
                  <span className="text-sm">🔒 Private</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="visibility"
                    value="public"
                    checked={collectionVisibility === 'public'}
                    onChange={(e) => setCollectionVisibility(e.target.value as 'private' | 'public')}
                    className="text-blue-600"
                  />
                  <span className="text-sm">🌐 Public</span>
                </label>
              </div>
            </div>

            {/* Upload Status Indicators */}
            {uploadStatus !== 'idle' && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    {uploadStatus === 'uploading' && '📤 Uploading document...'}
                    {uploadStatus === 'processing' && '⚙️ Processing document...'}
                    {uploadStatus === 'success' && '✅ Document processed successfully!'}
                    {uploadStatus === 'error' && '❌ Upload failed'}
                  </span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress 
                  value={uploadProgress} 
                  className={uploadStatus === 'success' ? 'bg-green-100' : uploadStatus === 'error' ? 'bg-red-100' : ''}
                />
                {uploadStatus === 'success' && lastUploadedCollection && (
                  <div className="text-sm text-green-600 bg-green-50 p-2 rounded-md">
                    🎉 Collection "{lastUploadedCollection}" is ready for queries!
                  </div>
                )}
                {uploadStatus === 'error' && (
                  <div className="text-sm text-red-600 bg-red-50 p-2 rounded-md">
                    ❌ Please try uploading again
                  </div>
                )}
              </div>
            )}

            <Button 
              onClick={handleUpload} 
              disabled={!file || !collectionName || uploading}
              className={`w-full ${
                uploadStatus === 'success' ? 'bg-green-600 hover:bg-green-700' : 
                uploadStatus === 'error' ? 'bg-red-600 hover:bg-red-700' : ''
              }`}
            >
              {uploadStatus === 'uploading' ? '📤 Uploading...' :
               uploadStatus === 'processing' ? '⚙️ Processing...' :
               uploadStatus === 'success' ? '✅ Success!' :
               uploadStatus === 'error' ? '❌ Try Again' :
               'Upload & Process'}
            </Button>
          </CardContent>
        </Card>

        {/* Collections Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🗄️ Knowledge Collections
            </CardTitle>
            <CardDescription>
              Manage and organize your document collections
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Collection Search and Filters */}
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Search collections..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="flex gap-2 flex-wrap">
                <select className="px-2 py-1 text-sm border border-gray-300 rounded-md">
                  <option value="">All Tags</option>
                  {allTags.map((tag) => (
                    <option key={tag} value={tag}>#{tag}</option>
                  ))}
                </select>
                <select className="px-2 py-1 text-sm border border-gray-300 rounded-md">
                  <option value="">All Collections</option>
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              </div>
            </div>

            {collections.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <div className="text-4xl mb-2 opacity-50">🗄️</div>
                <p>No collections available</p>
                <p className="text-sm">Upload a document to create your first collection</p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Collection Selection Hint */}
                <div className="p-2 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex items-center gap-2 text-sm text-blue-700">
                    <span>💡</span>
                    <span>Click on a collection to select it for searching, or use the dropdown in the Query section below</span>
                  </div>
                </div>
                
                {/* Bulk Actions */}
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded-md">
                  <span className="text-sm text-gray-600">
                    {collections.length} collection{collections.length !== 1 ? 's' : ''}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowBulkActions(!showBulkActions)}
                    >
                      Bulk Actions
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCollectionDetails(!showCollectionDetails)}
                    >
                      Details
                    </Button>
                  </div>
                </div>

                {collections.map((collection) => (
                  <div
                    key={collection.name}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedCollection === collection.name
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : lastUploadedCollection === collection.name
                        ? 'border-green-500 bg-green-50'
                        : 'border-border hover:border-blue-300 hover:bg-blue-25'
                    }`}
                    onClick={() => setSelectedCollection(collection.name)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{collection.name}</h4>
                          {selectedCollection === collection.name && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                              ✅ Selected
                            </span>
                          )}
                          {lastUploadedCollection === collection.name && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                              🆕 New
                            </span>
                          )}
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            collection.is_public 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {collection.is_public ? '🌐 Public' : '🔒 Private'}
                          </span>
                        </div>
                        {collection.description && (
                          <p className="text-sm text-gray-600 mt-1">{collection.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span>📄 {collection.chunk_count} chunks</span>
                          <span>📊 {collection.document_count} docs</span>
                          {collection.total_size_mb && (
                            <span>💾 {collection.total_size_mb.toFixed(1)} MB</span>
                          )}
                          <span>📅 {new Date(collection.created_at).toLocaleDateString()}</span>
                          <span className={`flex items-center gap-1 ${
                            collection.is_public ? 'text-blue-600' : 'text-gray-600'
                          }`}>
                            {collection.is_public ? '🌐' : '🔒'} {collection.is_public ? 'Public' : 'Private'}
                          </span>
                        </div>
                        {collection.tags && collection.tags.length > 0 && (
                          <div className="flex gap-1 mt-2">
                            {collection.tags.map((tag) => (
                              <span key={tag} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {collection.document_count} docs
                        </Badge>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEditCollection(collection)
                            }}
                          >
                            ✏️
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteCollection(collection.name)
                            }}
                          >
                            🗑️
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Query Section */}
      <Card>
                  <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🔍 Query Knowledge Base
            </CardTitle>
            <CardDescription>
              Ask questions about your uploaded documents
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Model Selection */}
            <div>
              <label htmlFor="model-select" className="block text-sm font-medium mb-1">Model for Generation</label>
              <div className="flex items-center gap-2">
                <select
                  id="model-select"
                  value={selectedModel}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedModel(e.target.value)}
                  className="mt-1 flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {availableModels.map((model) => (
                    <option key={model.name} value={model.name}>
                      {isModelLoaded(model.name) ? '✅ ' : '⏳ '}{model.name} - {model.description}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-1 text-sm">
                  {isModelLoaded(selectedModel) ? (
                    <span className="text-green-600">✅ Loaded</span>
                  ) : (
                    <span className="text-orange-600">⏳ Not Loaded</span>
                  )}
                </div>
              </div>
            </div>

            {/* Collection Selection */}
            <div>
              <label htmlFor="collection-select" className="block text-sm font-medium mb-1">Search Collection</label>
              <div className="flex items-center gap-2">
                <select
                  id="collection-select"
                  value={selectedCollection}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedCollection(e.target.value)}
                  className="mt-1 flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a collection to search...</option>
                  {collections.map((collection) => (
                    <option key={collection.name} value={collection.name}>
                      📁 {collection.name} 
                      {collection.description && ` - ${collection.description}`}
                      {collection.tags && collection.tags.length > 0 && ` (${collection.tags.slice(0, 2).join(', ')}${collection.tags.length > 2 ? '...' : ''})`}
                      {` - ${collection.chunk_count} chunks`}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-1 text-sm">
                  {selectedCollection ? (
                    <span className="text-green-600">✅ Selected</span>
                  ) : (
                    <span className="text-orange-600">⏳ No collection selected</span>
                  )}
                </div>
              </div>
              {selectedCollection && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">Searching in:</span>
                    <span className="text-blue-700">{selectedCollection}</span>
                    {collections.find(c => c.name === selectedCollection)?.is_public && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                        🌐 Public
                      </span>
                    )}
                    {!collections.find(c => c.name === selectedCollection)?.is_public && (
                      <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full">
                        🔒 Private
                      </span>
                    )}
                    <span className="text-xs text-gray-500">
                      ({collections.find(c => c.name === selectedCollection)?.chunk_count || 0} chunks available)
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="temperature" className="block text-sm font-medium mb-1">Temperature</label>
                <input
                  id="temperature"
                  type="number"
                  min="0"
                  max="2"
                  step="0.1"
                  value={temperature}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTemperature(parseFloat(e.target.value))}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="max-tokens" className="block text-sm font-medium mb-1">Max Tokens</label>
                <input
                  id="max-tokens"
                  type="number"
                  min="1"
                  max="2000"
                  value={maxTokens}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMaxTokens(parseInt(e.target.value))}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="top-k" className="block text-sm font-medium mb-1">Top K Results</label>
                <input
                  id="top-k"
                  type="number"
                  min="1"
                  max="10"
                  value={topK}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTopK(parseInt(e.target.value))}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="query" className="block text-sm font-medium mb-1">Your Question</label>
              <textarea
                id="query"
                value={query}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setQuery(e.target.value)}
                placeholder="Ask a question about your uploaded documents..."
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
              />
            </div>

          <Button 
            onClick={handleQuery} 
            disabled={!query.trim() || !selectedCollection || querying}
            className="w-full"
          >
            {querying ? 'Generating Answer...' : 'Generate Answer'}
          </Button>
        </CardContent>
      </Card>

      {/* Results Section */}
      {ragResponse && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Answer</CardTitle>
            <CardDescription>
              Response based on {ragResponse.retrieved_documents.length} relevant document chunks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Answer */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium">Answer</label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(ragResponse.answer)}
                >
                  📋 Copy
                </Button>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="whitespace-pre-wrap">{ragResponse.answer}</p>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-muted rounded-lg">
                <div className="font-medium">Tokens Used</div>
                <div className="text-muted-foreground">{ragResponse.model_response.tokens_used}</div>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <div className="font-medium">Response Time</div>
                <div className="text-muted-foreground">{ragResponse.model_response.latency_ms.toFixed(0)}ms</div>
              </div>
            </div>

            {/* Retrieved Context */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium">Retrieved Context</label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowContext(!showContext)}
                >
                  👁️ {showContext ? 'Hide' : 'Show'} Context
                </Button>
              </div>
              
              {showContext && (
                <div className="space-y-3">
                  {ragResponse.retrieved_documents.map((doc, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">#{doc.rank}</Badge>
                          <span className="text-sm font-medium">
                            {doc.metadata.source}
                          </span>
                        </div>
                        <Badge variant="secondary">
                          {(doc.similarity_score * 100).toFixed(1)}% match
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {doc.text.length > 200 
                          ? `${doc.text.substring(0, 200)}...` 
                          : doc.text
                        }
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default RAG 