import { useEffect, useRef, useCallback, useMemo } from 'react'
import { lookupCoverage } from '@/utils/coverageLookup.js'
import coverageRules from '@/data/coverageRules.json'
import { 
  X, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Shield, 
  DollarSign,
  FileText,
  TrendingUp,
  AlertCircle
} from 'lucide-react'

/**
 * Format value as currency
 * @param {number} value
 * @returns {string}
 */
function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value || 0)
}

/**
 * Capitalize first letter of each word
 * @param {string} str
 * @returns {string}
 */
function capitalizeWords(str) {
  if (!str) return ''
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Get policy display name
 * @param {string} policyType
 * @returns {string}
 */
function getPolicyDisplayName(policyType) {
  const policyNames = {
    renters: "Renter's Insurance",
    homeowners: "Homeowner's Insurance",
    auto: 'Auto Insurance',
    none: 'No Insurance'
  }
  return policyNames[policyType] || policyType
}

/**
 * Get common claim scenarios for a category and policy
 * @param {string} category
 * @param {string} policyType
 * @returns {string[]}
 */
function getCommonScenarios(category, policyType) {
  const normalizedCategory = category?.toLowerCase()
  const normalizedPolicy = policyType?.toLowerCase()
  
  // Try to get scenarios from coverage rules
  const policyRules = coverageRules[normalizedPolicy]
  if (policyRules && policyRules[normalizedCategory] && policyRules[normalizedCategory].commonScenarios) {
    return policyRules[normalizedCategory].commonScenarios
  }
  
  // Default scenarios based on coverage status
  const coverage = lookupCoverage(category, policyType)
  
  if (coverage.status === 'covered') {
    return [
      'Theft or burglary',
      'Fire damage',
      'Water damage (non-flood)',
      'Vandalism',
      'Accidental damage (check your policy)'
    ]
  } else if (coverage.status === 'conditional') {
    return [
      'Theft from secured location',
      'Damage during covered peril (conditions apply)',
      'Contact your agent for specific scenarios'
    ]
  } else {
    return [
      'Item is not covered under current policy',
      'Consider alternative coverage options',
      'Speak with an insurance agent for guidance'
    ]
  }
}

/**
 * DetailModal component - Modal showing detailed coverage information
 * 
 * Features:
 * - Shows item name, estimated value, coverage status
 * - Displays why item is/isn't covered
 * - Shows what policy covers it
 * - Lists common claim scenarios
 * - Provides upgrade options
 * - Closes via X button, backdrop click, or Escape key
 * - Focus trap for accessibility
 * - Camera feed dimming when opened from camera view
 * - Content updates on policy change
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is visible
 * @param {Function} props.onClose - Callback when modal should close
 * @param {Object} props.item - The item to display details for
 * @param {string} props.policyType - Current policy type
 */
export function DetailModal({ 
  isOpen, 
  onClose, 
  item, 
  policyType = 'renters'
}) {
  const modalRef = useRef(null)
  const closeButtonRef = useRef(null)
  const previousActiveElement = useRef(null)

  // Get coverage information
  const coverage = useMemo(() => {
    if (!item) return null
    return lookupCoverage(item.category, policyType)
  }, [item, policyType])

  // Get common scenarios
  const scenarios = useMemo(() => {
    if (!item) return []
    return getCommonScenarios(item.category, policyType)
  }, [item, policyType])

  // Status configuration
  const statusConfig = useMemo(() => {
    if (!coverage) return null
    
    const configs = {
      covered: {
        icon: CheckCircle,
        label: 'Covered',
        bgColor: 'bg-green-100',
        textColor: 'text-green-700',
        borderColor: 'border-green-200',
        iconColor: 'text-green-500'
      },
      conditional: {
        icon: AlertTriangle,
        label: 'Conditional',
        bgColor: 'bg-yellow-100',
        textColor: 'text-yellow-700',
        borderColor: 'border-yellow-200',
        iconColor: 'text-yellow-500'
      },
      not_covered: {
        icon: XCircle,
        label: 'Not Covered',
        bgColor: 'bg-red-100',
        textColor: 'text-red-700',
        borderColor: 'border-red-200',
        iconColor: 'text-red-500'
      }
    }
    
    return configs[coverage.status] || configs.not_covered
  }, [coverage])

  // Handle Escape key
  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Escape') {
      onClose()
    }
  }, [onClose])

  // Handle backdrop click
  const handleBackdropClick = useCallback((event) => {
    if (event.target === event.currentTarget) {
      onClose()
    }
  }, [onClose])

  // Focus trap implementation
  const handleModalKeyDown = useCallback((event) => {
    if (event.key !== 'Tab') return

    const modal = modalRef.current
    if (!modal) return

    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    
    if (focusableElements.length === 0) return

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault()
      lastElement.focus()
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault()
      firstElement.focus()
    }
  }, [])

  // Save previously focused element and add event listeners
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement
      
      // Add Escape key listener to document
      document.addEventListener('keydown', handleKeyDown)
      
      // Focus the close button when modal opens
      setTimeout(() => {
        closeButtonRef.current?.focus()
      }, 0)
      
      // Prevent body scroll
      document.body.style.overflow = 'hidden'
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
      
      // Restore focus when modal closes
      if (!isOpen && previousActiveElement.current) {
        previousActiveElement.current.focus()
      }
    }
  }, [isOpen, handleKeyDown])

  // Don't render if not open or no item
  if (!isOpen || !item || !coverage || !statusConfig) {
    return null
  }

  const StatusIcon = statusConfig.icon
  const isFromCamera = item.source === 'camera'
  const policyDisplayName = getPolicyDisplayName(policyType)

  return (
    <div
      data-testid="detail-modal"
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center"
      onKeyDown={handleModalKeyDown}
    >
      {/* Backdrop */}
      <div
        data-testid="modal-backdrop"
        className={`absolute inset-0 ${isFromCamera ? 'bg-black/60' : 'bg-black/50'} backdrop-blur-sm transition-opacity`}
        onClick={handleBackdropClick}
        aria-hidden="true"
      />
      
      {/* Modal Content */}
      <div
        data-testid="modal-content"
        className="relative w-full max-w-lg mx-4 bg-white rounded-xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className={`px-6 py-4 border-b ${statusConfig.borderColor} ${statusConfig.bgColor}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <StatusIcon className={`w-6 h-6 ${statusConfig.iconColor}`} />
              <h2 
                id="modal-title" 
                data-testid="modal-title"
                className="text-xl font-bold text-gray-900"
              >
                Item Details
              </h2>
            </div>
            <button
              ref={closeButtonRef}
              data-testid="modal-close-button"
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-black/10 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Close modal"
              tabIndex={0}
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Item Name and Value */}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Item</p>
              <h3 
                data-testid="item-name" 
                className="text-2xl font-bold text-gray-900 capitalize"
              >
                {capitalizeWords(item.category)}
              </h3>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 mb-1">Estimated Value</p>
              <p 
                data-testid="item-value" 
                className="text-2xl font-bold text-gray-900"
              >
                {formatCurrency(coverage.estimatedValue)}
              </p>
            </div>
          </div>

          {/* Coverage Status Badge */}
          <div className={`p-4 rounded-lg ${statusConfig.bgColor} ${statusConfig.borderColor} border`}>
            <div className="flex items-center gap-3">
              <StatusIcon className={`w-5 h-5 ${statusConfig.iconColor}`} />
              <div>
                <span 
                  data-testid="coverage-status"
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${statusConfig.bgColor} ${statusConfig.textColor}`}
                >
                  {statusConfig.label}
                </span>
              </div>
            </div>
          </div>

          {/* Why Covered / Not Covered */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-500" />
              <h4 className="font-semibold text-gray-900">Coverage Details</h4>
            </div>
            <p 
              data-testid="coverage-note" 
              className="text-gray-700 leading-relaxed pl-7"
            >
              {coverage.note}
            </p>
          </div>

          {/* Policy Information */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-gray-500" />
              <h4 className="font-semibold text-gray-900">Current Policy</h4>
            </div>
            <p 
              data-testid="policy-info" 
              className="text-gray-700 pl-7"
            >
              {policyDisplayName}
            </p>
          </div>

          {/* Conditions (for conditional coverage) */}
          {coverage.status === 'conditional' && coverage.conditions && coverage.conditions.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-500" />
                <h4 className="font-semibold text-gray-900">Conditions That Apply</h4>
              </div>
              <ul data-testid="conditions-list" className="space-y-1 pl-7">
                {coverage.conditions.map((condition, index) => (
                  <li key={index} className="text-gray-700 flex items-start gap-2">
                    <span className="text-yellow-500 mt-1">•</span>
                    {condition}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Common Claim Scenarios */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-gray-500" />
              <h4 className="font-semibold text-gray-900">Common Claim Scenarios</h4>
            </div>
            <ul data-testid="common-scenarios" className="space-y-2 pl-7">
              {scenarios.map((scenario, index) => (
                <li key={index} className="text-gray-700 flex items-start gap-2">
                  <span className="text-gray-400 mt-1">•</span>
                  {scenario}
                </li>
              ))}
            </ul>
          </div>

          {/* Upgrade Options */}
          <div className={`p-4 rounded-lg ${statusConfig.bgColor} border ${statusConfig.borderColor}`}>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className={`w-5 h-5 ${statusConfig.iconColor}`} />
              <h4 className="font-semibold text-gray-900">
                {coverage.status === 'covered' ? 'Coverage Enhancements' : 'How to Get Coverage'}
              </h4>
            </div>
            <p 
              data-testid="upgrade-options" 
              className="text-gray-700 pl-7"
            >
              {coverage.upgrade}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full py-3 px-4 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default DetailModal
