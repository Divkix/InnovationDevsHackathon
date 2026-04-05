import { useState, useCallback } from 'react'
import { Minus, Plus } from 'lucide-react'

/**
 * Default confidence threshold value (50%)
 */
export const DEFAULT_CONFIDENCE_THRESHOLD = 0.5

/**
 * Minimum confidence threshold value (10%)
 */
export const MIN_CONFIDENCE_THRESHOLD = 0.1

/**
 * Maximum confidence threshold value (90%)
 */
export const MAX_CONFIDENCE_THRESHOLD = 0.9

/**
 * Step value for threshold adjustments (5%)
 */
export const THRESHOLD_STEP = 0.05

/**
 * Format threshold value as percentage string
 * @param {number} value - Threshold value (0.1 to 0.9)
 * @returns {string} Percentage string (e.g., "50%")
 */
export function formatThresholdPercentage(value) {
  return `${Math.round(value * 100)}%`
}

/**
 * ConfidenceThresholdSlider component - Collapsible slider for adjusting detection confidence threshold
 *
 * Features:
 * - Slider range: 0.1 to 0.9 (10% to 90%)
 * - Default value: 0.5 (50%)
 * - Value displayed as percentage
 * - Collapsible/minimizable to not obstruct camera view
 * - Shows current threshold badge when minimized
 *
 * @param {Object} props
 * @param {number} props.value - Current threshold value (0.1 to 0.9)
 * @param {Function} props.onChange - Callback when threshold changes, receives new value
 * @param {boolean} [props.defaultCollapsed=false] - Whether to start in collapsed state
 * @param {string} [props.className] - Additional CSS classes
 * @returns {JSX.Element}
 */
export function ConfidenceThresholdSlider({
  value,
  onChange,
  defaultCollapsed = false,
  className = ''
}) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)

  /**
   * Handle slider value change
   */
  const handleChange = useCallback((event) => {
    const newValue = parseFloat(event.target.value)
    if (onChange) {
      onChange(newValue)
    }
  }, [onChange])

  /**
   * Toggle collapsed state
   */
  const toggleCollapse = useCallback(() => {
    setIsCollapsed(prev => !prev)
  }, [])

  // Collapsed state - show compact badge with expand button
  if (isCollapsed) {
    return (
      <div
        data-testid="confidence-threshold-slider"
        className={`bg-gray-900/90 backdrop-blur-sm rounded-lg shadow-lg p-2 ${className}`}
      >
        <button
          data-testid="expand-button"
          onClick={toggleCollapse}
          className="flex items-center gap-2 text-white hover:text-blue-400 transition-colors"
          aria-label="Expand threshold slider"
        >
          <Plus className="w-4 h-4" />
          <span
            data-testid="threshold-badge"
            className="text-sm font-medium bg-blue-600 px-2 py-0.5 rounded"
          >
            {formatThresholdPercentage(value)}
          </span>
        </button>
      </div>
    )
  }

  // Expanded state - show full slider
  return (
    <div
      data-testid="confidence-threshold-slider"
      className={`bg-gray-900/90 backdrop-blur-sm rounded-lg shadow-lg p-3 ${className}`}
    >
      {/* Header with label and minimize button */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-white text-sm font-medium">Confidence Threshold</span>
        <button
          data-testid="minimize-button"
          onClick={toggleCollapse}
          className="text-gray-400 hover:text-white transition-colors p-1"
          aria-label="Minimize threshold slider"
        >
          <Minus className="w-4 h-4" />
        </button>
      </div>

      {/* Slider and value display */}
      <div className="flex items-center gap-3">
        <input
          data-testid="threshold-slider"
          type="range"
          min={MIN_CONFIDENCE_THRESHOLD}
          max={MAX_CONFIDENCE_THRESHOLD}
          step={THRESHOLD_STEP}
          value={value}
          onChange={handleChange}
          className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400"
          aria-label="Confidence threshold"
        />
        <span
          data-testid="threshold-value"
          className="text-white text-sm font-semibold min-w-[3rem] text-right"
        >
          {formatThresholdPercentage(value)}
        </span>
      </div>

      {/* Helper text */}
      <p className="text-gray-400 text-xs mt-2">
        Lower = more detections, Higher = fewer but more confident
      </p>
    </div>
  )
}

export default ConfidenceThresholdSlider
