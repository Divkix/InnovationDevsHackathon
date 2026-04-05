import { useCallback, useMemo } from 'react'
import { useAppContext } from '@/context/AppContext.jsx'
import { lookupCoverage, VALID_POLICY_TYPES } from '@/utils/coverageLookup.js'
import { calculateValues, formatCurrency, formatPercentage } from '@/utils/valueCalculator.js'
import { 
  Home, 
  Shield, 
  Car, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  ShieldAlert 
} from 'lucide-react'

/**
 * Policy configuration with display names and icons
 */
const POLICY_CONFIG = {
  renters: {
    label: "Renter's Insurance",
    shortLabel: "Renter's",
    icon: Home,
    description: 'Personal property coverage',
    color: 'blue'
  },
  homeowners: {
    label: "Homeowner's Insurance",
    shortLabel: "Homeowner's",
    icon: Shield,
    description: 'Full property coverage',
    color: 'green'
  },
  auto: {
    label: 'Auto Insurance',
    shortLabel: 'Auto',
    icon: Car,
    description: 'Vehicle coverage only',
    color: 'indigo'
  },
  none: {
    label: 'No Insurance',
    shortLabel: 'None',
    icon: ShieldAlert,
    description: 'No coverage - everything red',
    color: 'red'
  }
}

/**
 * PolicySelector component - Policy type switcher accessible from main views
 * 
 * Displays 4 options: Renter's, Homeowner's, Auto, No Insurance
 * Implements the 'Red Moment': switching to 'No Insurance' turns ALL items red
 * 
 * @param {Object} props
 * @param {Array} props.detectedItems - Array of detected items from camera
 * @param {Array} props.manualItems - Array of manually added items  
 * @param {string} props.variant - 'default' or 'compact' for header bar
 */
export function PolicySelector({ 
  detectedItems = [], 
  manualItems = [],
  variant = 'default' 
}) {
  const { policyType, setPolicyType } = useAppContext()

  /**
   * Calculate current coverage values
   */
  const coverageValues = useMemo(() => {
    const safeDetectedItems = Array.isArray(detectedItems) ? detectedItems : []
    const safeManualItems = Array.isArray(manualItems) ? manualItems : []
    
    return calculateValues(safeDetectedItems, safeManualItems, policyType)
  }, [detectedItems, manualItems, policyType])

  /**
   * Check if currently in 'Red Moment' (No Insurance mode)
   */
  const isRedMoment = useMemo(() => {
    return policyType === 'none'
  }, [policyType])

  /**
   * Handle policy selection
   */
  const handlePolicySelect = useCallback((newPolicyType) => {
    if (VALID_POLICY_TYPES.includes(newPolicyType)) {
      setPolicyType(newPolicyType)
    }
  }, [setPolicyType])

  /**
   * Handle keyboard selection
   */
  const handleKeyDown = useCallback((event, policyType) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handlePolicySelect(policyType)
    }
  }, [handlePolicySelect])

  const {
    totalValue,
    protectedValue,
    unprotectedValue,
    coverageGapPercentage
  } = coverageValues

  /**
   * Compact variant for header bar
   */
  if (variant === 'compact') {
    const currentConfig = POLICY_CONFIG[policyType] || POLICY_CONFIG.renters
    const CurrentIcon = currentConfig.icon

    return (
      <div 
        data-testid="policy-selector" 
        className="policy-selector compact flex items-center gap-2"
      >
        <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm border border-gray-200">
          <CurrentIcon className={`w-4 h-4 text-${currentConfig.color}-500`} />
          <span className="text-sm font-medium text-gray-700">
            Current Policy:
          </span>
          <span className={`text-sm font-semibold text-${currentConfig.color}-600 capitalize`}>
            {currentConfig.shortLabel}
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          {VALID_POLICY_TYPES.map((type) => {
            const config = POLICY_CONFIG[type]
            const Icon = config.icon
            const isActive = policyType === type
            
            return (
              <button
                key={type}
                data-testid="policy-option"
                onClick={() => handlePolicySelect(type)}
                onKeyDown={(e) => handleKeyDown(e, type)}
                aria-label={`Select ${config.label}`}
                aria-pressed={isActive}
                className={`
                  p-2 rounded-md transition-all duration-150
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
                  ${isActive 
                    ? `bg-${config.color}-100 text-${config.color}-700 ring-2 ring-${config.color}-500` 
                    : 'hover:bg-gray-100 text-gray-500'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  /**
   * Default/full variant
   */
  return (
    <div 
      data-testid="policy-selector" 
      className="policy-selector w-full max-w-2xl mx-auto"
    >
      {/* Red Moment Indicator */}
      {isRedMoment && (
        <div 
          data-testid="red-moment-indicator"
          className="mb-4 bg-red-50 border-2 border-red-200 rounded-lg p-4 animate-pulse"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            <div>
              <h3 className="font-bold text-red-800">⚠️ RED MOMENT ACTIVATED</h3>
              <p className="text-red-700 text-sm">
                All items not covered — No insurance protection!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Policy Options Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {VALID_POLICY_TYPES.map((type) => {
          const config = POLICY_CONFIG[type]
          const Icon = config.icon
          const isActive = policyType === type
          
          return (
            <button
              key={type}
              data-testid="policy-option"
              onClick={() => handlePolicySelect(type)}
              onKeyDown={(e) => handleKeyDown(e, type)}
              aria-label={`Select ${config.label}`}
              aria-pressed={isActive}
              className={`
                relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 
                transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500
                ${isActive 
                  ? `border-${config.color}-500 bg-${config.color}-50 text-${config.color}-700 shadow-md` 
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 text-gray-600'
                }
                ${type === 'none' && !isActive ? 'border-red-200 hover:border-red-300' : ''}
                ${type === 'none' && isActive ? 'bg-red-50 border-red-500' : ''}
              `}
            >
              {/* Selected Indicator */}
              {isActive && (
                <div className={`
                  absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center
                  ${type === 'none' ? 'bg-red-500' : `bg-${config.color}-500`}
                `}>
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
              )}
              
              <Icon className={`
                w-8 h-8 
                ${isActive 
                  ? (type === 'none' ? 'text-red-500' : `text-${config.color}-500`)
                  : 'text-gray-400'
                }
              `} />
              
              <div className="text-center">
                <p className={`
                  font-semibold text-sm
                  ${isActive 
                    ? (type === 'none' ? 'text-red-700' : `text-${config.color}-700`)
                    : 'text-gray-700'
                  }
                `}>
                  {config.label}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {config.description}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Coverage Summary Panel */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Coverage Summary
            <span className="text-sm font-normal text-gray-500 ml-2 capitalize">
              ({POLICY_CONFIG[policyType]?.label || policyType})
            </span>
          </h3>
        </div>
        
        <div className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Total Value */}
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                Total Value
              </p>
              <p 
                data-testid="total-value"
                className="text-xl font-bold text-gray-900"
              >
                {formatCurrency(totalValue)}
              </p>
            </div>
            
            {/* Protected Value */}
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                Protected
              </p>
              <p 
                data-testid="protected-value"
                className={`
                  text-xl font-bold
                  ${isRedMoment ? 'text-gray-400' : 'text-green-600'}
                `}
              >
                {formatCurrency(protectedValue)}
              </p>
            </div>
            
            {/* Unprotected Value */}
            <div className="text-center">
              <p className="text-xs text-red-500 uppercase tracking-wide mb-1 font-semibold">
                Unprotected
              </p>
              <p 
                data-testid="unprotected-value"
                className={`
                  text-2xl font-black
                  ${isRedMoment ? 'text-red-600' : 'text-red-500'}
                `}
              >
                {formatCurrency(unprotectedValue)}
              </p>
            </div>
            
            {/* Coverage Gap */}
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                Gap
              </p>
              <p 
                data-testid="coverage-gap"
                className={`
                  text-xl font-bold
                  ${coverageGapPercentage === 100 ? 'text-red-600' : 'text-gray-900'}
                `}
              >
                {formatPercentage(coverageGapPercentage)}
              </p>
            </div>
          </div>
          
          {/* Visual indicator for coverage ratio */}
          <div className="mt-4">
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden flex">
              <div 
                className={`
                  h-full transition-all duration-500
                  ${isRedMoment ? 'bg-red-500 w-0' : 'bg-green-500'}
                `}
                style={{ 
                  width: isRedMoment ? '0%' : `${100 - coverageGapPercentage}%` 
                }}
              />
              <div 
                className={`
                  h-full transition-all duration-500
                  ${isRedMoment ? 'bg-red-500 w-full' : 'bg-red-500'}
                `}
                style={{ 
                  width: isRedMoment ? '100%' : `${coverageGapPercentage}%` 
                }}
              />
            </div>
            <div className="flex justify-between mt-1 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-green-500" />
                Covered
              </span>
              <span className="flex items-center gap-1">
                <XCircle className="w-3 h-3 text-red-500" />
                Not Covered
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PolicySelector
