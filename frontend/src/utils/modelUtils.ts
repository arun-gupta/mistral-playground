// Shared model utility functions to eliminate code duplication between Models.tsx and Comparison.tsx

/**
 * Get the model family/category from model name
 */
export const getModelFamily = (modelName: string): string => {
  if (modelName.includes('Mistral-7B') || modelName.includes('Mixtral')) return 'mistral'
  if (modelName.includes('Llama-3') || modelName.includes('Meta-Llama-3') || modelName.includes('Llama-2') || modelName.includes('Llama-4')) return 'llama'
  if (modelName.includes('gemma')) return 'gemma'
  if (modelName.includes('DialoGPT')) return 'dialogpt'
  return 'other'
}

/**
 * Get the model size in billions of parameters
 */
export const getModelSize = (modelName: string): number => {
  if (modelName.includes('70B') || modelName.includes('Mixtral-8x7B')) return 70
  if (modelName.includes('17B')) return 17
  if (modelName.includes('14B')) return 14
  if (modelName.includes('13B')) return 13
  if (modelName.includes('8B') || modelName.includes('7B')) return 7
  if (modelName.includes('2B')) return 2
  if (modelName.includes('DialoGPT-large')) return 0.774
  if (modelName.includes('DialoGPT-medium')) return 0.345
  if (modelName.includes('DialoGPT-small')) return 0.117
  return 0
}

/**
 * Check if model is recommended for general use
 */
export const isRecommended = (modelName: string): boolean => {
  const recommended = [
    'microsoft/DialoGPT-small', // Testing - open model, very small
    'microsoft/DialoGPT-medium', // Testing - open model, medium size
    'microsoft/DialoGPT-large', // Testing - open model, large size
    'meta-llama/Meta-Llama-3-8B-Instruct', // Official Meta Llama (requires auth)
    'meta-llama/Llama-3.1-8B-Instruct' // Official Meta Llama (requires auth)
  ]
  return recommended.includes(modelName)
}

/**
 * Check if model requires authentication (gated)
 */
export const isGatedModel = (modelName: string): boolean => {
  const gatedModels = [
    // Official Meta Llama models (require authentication) - Top 3 most useful
    'meta-llama/Llama-3.2-1B',                 // Very small, base model, great for testing
    'meta-llama/Meta-Llama-3-8B-Instruct',     // Medium size, instruction-tuned, good balance
    'meta-llama/Llama-3.3-70B-Instruct',       // Very large, instruction-tuned, maximum performance
    // Google Gemma models (all require authentication) - Top 3 most useful
    'google/gemma-2b-it',                    // Small, instruction-tuned, great for testing
    'google/gemma-7b-it',                    // Medium, instruction-tuned, good balance
    'google/gemma-3-27b-it',                 // Large model for high performance
    // Mistral models that are now gated (including base models) - Keep all as requested
    'mistralai/Mistral-7B-v0.1',               // Base model, now gated
    'mistralai/Mistral-7B-v0.2',               // Base model v2, now gated
    'mistralai/Mistral-7B-Instruct-v0.1',      // Instruction-tuned, gated
    'mistralai/Mistral-7B-Instruct-v0.2',      // Instruction-tuned, gated
    'mistralai/Mistral-7B-Instruct-v0.3',      // Instruction-tuned, gated
    'mistralai/Mistral-7B-Instruct-v0.4',      // Instruction-tuned, gated
    'mistralai/Mistral-7B-Instruct-v0.5'       // Instruction-tuned, gated
  ]
  return gatedModels.includes(modelName)
}

/**
 * Check if model requires GPU (simplified binary logic)
 */
export const isGPURequired = (modelName: string): boolean => {
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

/**
 * Check if model is small (suitable for quick testing and constrained environments)
 */
export const isSmallModel = (modelName: string): boolean => {
  const size = getModelSize(modelName)
  // Small models: 2B parameters or less, or DialoGPT models
  return size <= 2 || modelName.includes('DialoGPT')
}

/**
 * Check if model size is within the specified threshold
 */
export const isModelSizeWithinThreshold = (modelName: string, maxSizeInB: number): boolean => {
  const size = getModelSize(modelName)
  return size <= maxSizeInB
}

/**
 * Check if model is large (requires significant resources)
 */
export const isLargeModel = (modelName: string): boolean => {
  const size = getModelSize(modelName)
  // Large models: >=14B parameters or specific large models
  return size >= 14 || modelName.includes('Mixtral-8x7B') || modelName.includes('70B')
}

/**
 * Get disk space requirement for a model
 */
export const getDiskSpaceRequirement = (modelName: string): string => {
  const size = getModelSize(modelName)
  if (size >= 70) return '140 GB'
  if (size >= 30) return '60 GB'
  if (size >= 14) return '28 GB'
  if (size >= 8) return '16 GB'
  if (size >= 2) return '4 GB'
  return '1 GB'
}

/**
 * Get estimated download time for a model
 */
export const getEstimatedDownloadTime = (modelName: string): string => {
  const size = getModelSize(modelName)
  if (size >= 70) return '2-4 hours'
  if (size >= 30) return '1-2 hours'
  if (size >= 14) return '30-60 minutes'
  if (size >= 8) return '15-30 minutes'
  if (size >= 2) return '5-15 minutes'
  return '1-5 minutes'
}

/**
 * Get model size category for display
 */
export const getModelSizeCategory = (modelName: string): string => {
  const size = getModelSize(modelName)
  if (size >= 70) return 'Very Large'
  if (size >= 30) return 'Large'
  if (size >= 14) return 'Medium-Large'
  if (size >= 8) return 'Medium'
  if (size >= 2) return 'Small'
  return 'Tiny'
}

/**
 * Get model variant type
 */
export const getModelVariant = (modelName: string): string => {
  if (modelName.includes('Instruct')) return 'Instruction-Tuned'
  if (modelName.includes('Chat')) return 'Chat'
  if (modelName.includes('Code')) return 'Code'
  return 'Base'
}

/**
 * Get count of active filters (helper for UI)
 */
export const getActiveFilterCount = (filters: {
  showDownloadedOnly?: boolean
  showLoadedOnly?: boolean
  showRecommendedOnly?: boolean
  showCPUOnly?: boolean
  showNoAuthRequired?: boolean
  showSmallModelsOnly?: boolean
}): number => {
  let count = 0
  if (filters.showDownloadedOnly) count++
  if (filters.showLoadedOnly) count++
  if (filters.showRecommendedOnly) count++
  if (filters.showCPUOnly) count++
  if (filters.showNoAuthRequired) count++
  if (filters.showSmallModelsOnly) count++
  return count
}

/**
 * Get display name for model family
 */
export const getModelFamilyDisplayName = (family: string): string => {
  const displayNames: Record<string, string> = {
    'mistral': 'Mistral AI',
    'llama': 'Meta Llama',
    'gemma': 'Google Gemma',
    'dialogpt': 'Microsoft DialoGPT',
    'other': 'Other Models'
  }
  return displayNames[family] || family
} 