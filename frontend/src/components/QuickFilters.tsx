import React from 'react'
import { Button } from './ui/button'
import { getActiveFilterCount } from '../utils/modelUtils'

interface QuickFiltersProps {
  // Filter states
  showDownloadedOnly: boolean
  setShowDownloadedOnly: (value: boolean) => void
  showLoadedOnly: boolean
  setShowLoadedOnly: (value: boolean) => void
  showReadyToUseOnly: boolean
  setShowReadyToUseOnly: (value: boolean) => void
  showRecommendedOnly: boolean
  setShowRecommendedOnly: (value: boolean) => void
  showNoAuthRequired: boolean
  setShowNoAuthRequired: (value: boolean) => void
  showHostedOnly: boolean
  setShowHostedOnly: (value: boolean) => void
  maxModelSize: number
  setMaxModelSize: (value: number) => void
  
  // Optional props
  showRefreshButton?: boolean
  onRefresh?: () => void
  showQuickStartButton?: boolean
  defaultMaxModelSize?: number
  showSizeLegend?: boolean
}

const QuickFilters: React.FC<QuickFiltersProps> = ({
  showDownloadedOnly,
  setShowDownloadedOnly,
  showLoadedOnly,
  setShowLoadedOnly,
  showReadyToUseOnly,
  setShowReadyToUseOnly,
  showRecommendedOnly,
  setShowRecommendedOnly,
  showNoAuthRequired,
  setShowNoAuthRequired,
  showHostedOnly,
  setShowHostedOnly,
  maxModelSize,
  setMaxModelSize,
  showRefreshButton = false,
  onRefresh,
  showQuickStartButton = false,
  defaultMaxModelSize = 10,
  showSizeLegend = false
}) => {
  const handleClearAll = () => {
    setShowDownloadedOnly(false)
    setShowLoadedOnly(false)
    setShowReadyToUseOnly(false)
    setShowRecommendedOnly(false)
    setShowNoAuthRequired(false)
    setShowHostedOnly(false)
    setMaxModelSize(defaultMaxModelSize)
  }

  const handleQuickStart = () => {
    setShowDownloadedOnly(false)
    setShowLoadedOnly(false)
    setShowRecommendedOnly(true)
    setShowNoAuthRequired(true)
    setShowHostedOnly(false)
  }

  return (
    <>
      {/* Compact Filters and Controls */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">Quick Filters</h3>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              className="text-xs px-2 py-1 h-6"
              disabled={getActiveFilterCount({
                showDownloadedOnly,
                showLoadedOnly,
                showReadyToUseOnly,
                showRecommendedOnly,
                showNoAuthRequired,
                showSmallModelsOnly: maxModelSize < 70,
                showHostedOnly
              }) === 0}
            >
              Clear All
            </Button>
            
            {showQuickStartButton && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleQuickStart}
                className="text-xs px-2 py-1 h-6 bg-green-50 border-green-200 text-green-800 hover:bg-green-100"
              >
                Quick Start
              </Button>
            )}
            
            {showRefreshButton && onRefresh && (
              <Button
                onClick={onRefresh}
                variant="outline"
                size="sm"
                className="text-xs px-2 py-1 h-6"
              >
                🔄 Refresh
              </Button>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* No Auth Required */}
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setShowNoAuthRequired(!showNoAuthRequired)}
              className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors focus:outline-none ${
                showNoAuthRequired ? 'bg-yellow-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-2 w-2 transform rounded-full bg-white transition-transform ${
                  showNoAuthRequired ? 'translate-x-4' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-xs font-medium text-gray-700">No Auth</span>
          </div>

          {/* Hosted */}
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setShowHostedOnly(!showHostedOnly)}
              className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors focus:outline-none ${
                showHostedOnly ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-2 w-2 transform rounded-full bg-white transition-transform ${
                  showHostedOnly ? 'translate-x-4' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-xs font-medium text-gray-700">☁️ Hosted</span>
          </div>

          {/* Ready to Use */}
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setShowReadyToUseOnly(!showReadyToUseOnly)}
              className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors focus:outline-none ${
                showReadyToUseOnly ? 'bg-green-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-2 w-2 transform rounded-full bg-white transition-transform ${
                  showReadyToUseOnly ? 'translate-x-4' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-xs font-medium text-gray-700">✅ Ready to Use</span>
          </div>

          {/* Recommended */}
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setShowRecommendedOnly(!showRecommendedOnly)}
              className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors focus:outline-none ${
                showRecommendedOnly ? 'bg-purple-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-2 w-2 transform rounded-full bg-white transition-transform ${
                  showRecommendedOnly ? 'translate-x-4' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-xs font-medium text-gray-700">Recommended</span>
          </div>

          {/* Model Size Slider */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium text-gray-700">Max Parameters:</span>
            <div className="flex items-center space-x-1">
              <input
                type="range"
                min="0.1"
                max="70"
                step="0.1"
                value={maxModelSize}
                onChange={(e) => setMaxModelSize(parseFloat(e.target.value))}
                className="w-16 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(maxModelSize / 70) * 100}%, #e5e7eb ${(maxModelSize / 70) * 100}%, #e5e7eb 100%)`
                }}
              />
              <span className="text-xs font-medium text-gray-700 min-w-[2rem]">
                {maxModelSize === 70 ? 'All' : `${maxModelSize}B`}
              </span>
            </div>
            <span className="text-xs text-gray-500">(local models only)</span>
          </div>
        </div>
      </div>

      {/* Size Legend - Optional */}
      {showSizeLegend && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-4 text-blue-800">
              <span className="font-medium">Size Guide:</span>
              <span>• &lt; 1B: Very Small (DialoGPT)</span>
              <span>• 1-2B: Small (Testing)</span>
              <span>• 3-8B: Medium (Good Balance)</span>
              <span>• 14-17B: Large (High Performance)</span>
              <span>• 27-70B: Very Large (GPU Required)</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default QuickFilters 