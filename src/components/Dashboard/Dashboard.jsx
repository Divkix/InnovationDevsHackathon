import { useMemo, useEffect, useState } from 'react'
import { motion, useSpring, useTransform } from 'framer-motion'
import { isTestEnvironment } from '@/utils/testUtils.js'
import {
  calculateValues,
  formatCurrency,
  formatPercentage,
  getUpgradeRecommendations
} from '@/utils/valueCalculator.js'
import { Shield, AlertTriangle, CheckCircle, DollarSign, TrendingUp } from 'lucide-react'

/**
 * AnimatedNumber component - Animates number changes with spring physics
 */
function AnimatedNumber({ value, formatter }) {
  const spring = useSpring(value, { 
    stiffness: 100, 
    damping: 20,
    duration: 0.5 
  })
  
  useEffect(() => {
    spring.set(value)
  }, [value, spring])
  
  const display = useTransform(spring, (current) => formatter(current))
  const [displayValue, setDisplayValue] = useState(formatter(value))
  
  useEffect(() => {
    const unsubscribe = display.on('change', (latest) => {
      setDisplayValue(latest)
    })
    return () => unsubscribe()
  }, [display])
  
  return <span>{displayValue}</span>
}

/**
 * Dashboard component - Financial summary dashboard
 * 
 * Displays:
 * - Total Detected Asset Value (sum of all items)
 * - Protected Value (green items only)
 * - UNPROTECTED VALUE (red + yellow items, BIG RED prominent)
 * - Coverage Gap % (unprotected/total * 100)
 * - Per-item breakdown list with name, value, and color-coded status (clickable)
 * - Empty/zero state with helpful message when no items
 * - Upgrade recommendations when items are uncovered
 * - Positive message when all covered
 * 
 * @param {Object} props
 * @param {Array} props.detectedItems - Array of detected items from camera
 * @param {Array} props.manualItems - Array of manually added items
 * @param {string} props.policyType - The active policy type
 * @param {Function} props.onItemClick - Callback when an item is clicked
 */
export function Dashboard({ detectedItems = [], manualItems = [], policyType = 'renters', onItemClick }) {
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

  // Status color mapping for Tailwind classes - State Farm branding
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
      icon: 'text-[#E31837]'
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

        {/* Financial Summary Cards - Responsive Grid */}
        <motion.div 
          className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ staggerChildren: 0.1 }}
        >
          {/* Total Value */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5"
          >
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-gray-500" />
              <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                Total Value
              </span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-gray-900">
              <AnimatedNumber value={totalValue} formatter={formatCurrency} />
            </p>
          </motion.div>

          {/* Protected Value */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5"
          >
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-green-500" />
              <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                Protected
              </span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-green-600">
              <AnimatedNumber value={protectedValue} formatter={formatCurrency} />
            </p>
          </motion.div>

          {/* Unprotected Value - State Farm Red - MOST PROMINENT */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            data-testid="unprotected-section"
            className="bg-gradient-to-br from-[#E31837] to-[#B8122C] rounded-xl shadow-lg p-4 sm:p-5 col-span-1 xs:col-span-2 lg:col-span-1 transform hover:scale-[1.02] transition-transform"
          >
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-white/90" />
              <span className="text-xs font-bold text-white/90 uppercase tracking-wide">
                UNPROTECTED
              </span>
            </div>
            <p className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight drop-shadow-sm">
              <AnimatedNumber value={unprotectedValue} formatter={formatCurrency} />
            </p>
          </motion.div>

          {/* Coverage Gap */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5"
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-gray-500" />
              <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                Coverage Gap
              </span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-gray-900">
              <AnimatedNumber value={coverageGapPercentage} formatter={(v) => formatPercentage(v)} />
            </p>
          </motion.div>
        </motion.div>

        {/* Empty State Message */}
        {!hasItems && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-50 border border-blue-200 rounded-xl p-6 sm:p-8 text-center"
          >
            <div className="flex justify-center mb-3">
              <div className="bg-blue-100 rounded-full p-3">
                <DollarSign className="w-6 h-6 text-[#E31837]" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Items Detected
            </h3>
            <p className="text-gray-600 max-w-md mx-auto text-sm sm:text-base">
              Point your camera at objects to begin scanning. Detected items will appear here with their insurance coverage status.
            </p>
          </motion.div>
        )}

        {/* All Covered Message */}
        {allCovered && hasItems && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-green-50 border border-green-200 rounded-xl p-4 sm:p-6"
          >
            <div className="flex items-center gap-3">
              <div className="bg-green-100 rounded-full p-2">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-green-900">
                  All items are fully covered!
                </h3>
                <p className="text-green-700 text-sm sm:text-base">
                  Your current insurance policy protects all detected items.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Per-Item Breakdown */}
        {hasItems && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
          >
            <div className="px-3 sm:px-4 py-3 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Item Breakdown</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {items.map((item, index) => {
                const colors = statusColors[item.status] || statusColors.not_covered
                return (
                  <motion.button
                    key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    data-testid="item-row"
                    onClick={() => onItemClick && onItemClick(item)}
                    className="w-full px-3 sm:px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#E31837]"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <div className={`w-3 h-3 rounded-full shrink-0 ${
                        item.status === 'covered' ? 'bg-green-500' :
                        item.status === 'conditional' ? 'bg-yellow-500' :
                        'bg-[#E31837]'
                      }`} />
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 capitalize text-sm sm:text-base truncate">
                          {item.category}
                        </p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
                          {statusLabels[item.status]}
                        </span>
                      </div>
                    </div>
                    <p className="font-semibold text-gray-900 text-sm sm:text-base shrink-0 ml-2">
                      {formatCurrency(item.estimatedValue)}
                    </p>
                  </motion.button>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* Upgrade Recommendations */}
        {hasRecommendations && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-orange-50 border border-orange-200 rounded-xl p-4"
          >
            <h3 className="font-semibold text-orange-900 mb-3 flex items-center gap-2 text-sm sm:text-base">
              <TrendingUp className="w-5 h-5" />
              Recommendations
            </h3>
            <ul className="space-y-2">
              {recommendations.map((recommendation, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-2 text-orange-800 text-sm sm:text-base"
                >
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-orange-200 text-orange-700 text-xs font-medium shrink-0 mt-0.5">
                    {index + 1}
                  </span>
                  <span>{recommendation}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default Dashboard
