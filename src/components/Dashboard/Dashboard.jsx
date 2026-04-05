import { useMemo } from 'react'
import {
  calculateValues,
  formatCurrency,
  formatPercentage,
  getUpgradeRecommendations
} from '@/utils/valueCalculator.js'
import { Shield, AlertTriangle, CheckCircle, DollarSign, TrendingUp } from 'lucide-react'

/**
 * Dashboard component - Financial summary dashboard
 * 
 * Displays:
 * - Total Detected Asset Value (sum of all items)
 * - Protected Value (green items only)
 * - UNPROTECTED VALUE (red + yellow items, BIG RED prominent)
 * - Coverage Gap % (unprotected/total * 100)
 * - Per-item breakdown list with name, value, and color-coded status
 * - Empty/zero state with helpful message when no items
 * - Upgrade recommendations when items are uncovered
 * - Positive message when all covered
 * 
 * @param {Object} props
 * @param {Array} props.detectedItems - Array of detected items from camera
 * @param {Array} props.manualItems - Array of manually added items
 * @param {string} props.policyType - The active policy type
 */
export function Dashboard({ detectedItems = [], manualItems = [], policyType = 'renters' }) {
  // Calculate all dashboard values using the value calculator
  const calculationResult = useMemo(() => {
    // Handle null/undefined inputs gracefully
    const safeDetectedItems = Array.isArray(detectedItems) ? detectedItems : []
    const safeManualItems = Array.isArray(manualItems) ? manualItems : []
    const safePolicyType = policyType || 'renters'

    return calculateValues(safeDetectedItems, safeManualItems, safePolicyType)
  }, [detectedItems, manualItems, policyType])

  // Get upgrade recommendations
  const recommendations = useMemo(() => {
    return getUpgradeRecommendations(calculationResult.items, policyType)
  }, [calculationResult.items, policyType])

  // Destructure calculated values
  const {
    totalValue,
    protectedValue,
    unprotectedValue,
    coverageGapPercentage,
    items
  } = calculationResult

  // Determine if all items are covered
  const allCovered = items.length > 0 && unprotectedValue === 0
  const hasItems = items.length > 0
  const hasRecommendations = recommendations.length > 0

  // Status color mapping for Tailwind classes
  const statusColors = {
    covered: {
      bg: 'bg-green-100',
      text: 'text-green-700',
      border: 'border-green-200',
      icon: 'text-green-500'
    },
    conditional: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-700',
      border: 'border-yellow-200',
      icon: 'text-yellow-500'
    },
    not_covered: {
      bg: 'bg-red-100',
      text: 'text-red-700',
      border: 'border-red-200',
      icon: 'text-red-500'
    }
  }

  // Status label mapping
  const statusLabels = {
    covered: 'Covered',
    conditional: 'Conditional',
    not_covered: 'Not Covered'
  }

  return (
    <div
      data-testid="dashboard-container"
      className="w-full h-full bg-gray-50 overflow-y-auto"
    >
      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Financial Summary</h2>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Shield className="w-4 h-4" />
            <span className="capitalize">{policyType === 'none' ? 'No Insurance' : `${policyType}'s Insurance`}</span>
          </div>
        </div>

        {/* Financial Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Total Value */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-gray-500" />
              <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                Total Detected Asset Value
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(totalValue)}
            </p>
          </div>

          {/* Protected Value */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-green-500" />
              <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                Protected Value
              </span>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(protectedValue)}
            </p>
          </div>

          {/* Unprotected Value - BIG RED NUMBER */}
          <div
            data-testid="unprotected-section"
            className="bg-white rounded-lg shadow-md border-2 border-red-200 p-4 col-span-2 lg:col-span-1"
          >
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-xs font-bold text-red-600 uppercase tracking-wide">
                UNPROTECTED VALUE
              </span>
            </div>
            <p className="text-4xl lg:text-5xl font-black text-red-600 tracking-tight">
              {formatCurrency(unprotectedValue)}
            </p>
          </div>

          {/* Coverage Gap */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-gray-500" />
              <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                Coverage Gap
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatPercentage(coverageGapPercentage)}
            </p>
          </div>
        </div>

        {/* Empty State Message */}
        {!hasItems && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <div className="flex justify-center mb-3">
              <div className="bg-blue-100 rounded-full p-3">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              No Items Detected
            </h3>
            <p className="text-blue-700 max-w-md mx-auto">
              Point your camera at objects to begin scanning. Detected items will appear here with their insurance coverage status.
            </p>
          </div>
        )}

        {/* All Covered Message */}
        {allCovered && hasItems && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 rounded-full p-2">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-green-900">
                  All items are fully covered!
                </h3>
                <p className="text-green-700">
                  Your current insurance policy protects all detected items.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Per-Item Breakdown */}
        {hasItems && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-gray-900">Item Breakdown</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {items.map((item) => {
                const colors = statusColors[item.status] || statusColors.not_covered
                return (
                  <div
                    key={item.id}
                    data-testid="item-row"
                    className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${colors.bg.replace('bg-', 'bg-').replace('100', '500')}`} />
                      <div>
                        <p className="font-medium text-gray-900 capitalize">
                          {item.category}
                        </p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
                          {statusLabels[item.status]}
                        </span>
                      </div>
                    </div>
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(item.estimatedValue)}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Upgrade Recommendations */}
        {hasRecommendations && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h3 className="font-semibold text-orange-900 mb-3 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Recommendations
            </h3>
            <ul className="space-y-2">
              {recommendations.map((recommendation, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-orange-800"
                >
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-orange-200 text-orange-700 text-xs font-medium shrink-0 mt-0.5">
                    {index + 1}
                  </span>
                  <span>{recommendation}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard
