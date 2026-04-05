import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppContext } from '@/context/AppContext.jsx'
import { Home, Shield, Car, ShieldAlert, Camera, ChevronLeft, Check, ArrowRight } from 'lucide-react'

/**
 * Policy configuration with display names and icons
 */
const POLICY_OPTIONS = [
  {
    id: 'renters',
    label: "Renter's Insurance",
    icon: Home,
    description: 'Coverage for personal property in rented homes',
    color: 'blue'
  },
  {
    id: 'homeowners',
    label: "Homeowner's Insurance",
    icon: Shield,
    description: 'Full property and belongings coverage',
    color: 'green'
  },
  {
    id: 'auto',
    label: 'Auto Insurance',
    icon: Car,
    description: 'Vehicle coverage and roadside protection',
    color: 'indigo'
  },
  {
    id: 'none',
    label: 'No Insurance',
    icon: ShieldAlert,
    description: 'See what is unprotected (demo mode)',
    color: 'red'
  }
]

/**
 * OnboardingFlow component - Multi-step onboarding for new users
 * 
 * Step 1: Policy Selection (4 options, Continue disabled until selection)
 * Step 2: Camera Instruction (guidance text + Start Camera button)
 * Step 3: Transition to camera view (onboarding completes here)
 * 
 * Features:
 * - Step indicator showing progress
 * - Back navigation preserving selection
 * - Forward navigation with transitions
 * - Persisted completion (skip on return)
 * - Rapid-click protection (prevents double submissions)
 * - Keyboard accessible (Tab, Enter/Space, focus indicators)
 * 
 * @param {Object} props
 * @param {Function} props.onComplete - Callback when onboarding is completed
 */
export function OnboardingFlow({ onComplete }) {
  const { policyType, setPolicyType, completeOnboarding } = useAppContext()
  
  // Local state for the flow
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedPolicy, setSelectedPolicy] = useState(policyType || null)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [direction, setDirection] = useState('forward') // 'forward' or 'backward'

  /**
   * Handle policy selection
   */
  const handlePolicySelect = useCallback((policyId) => {
    setSelectedPolicy(policyId)
    setPolicyType(policyId)
  }, [setPolicyType])

  /**
   * Navigate to next step with rapid-click protection
   */
  const handleNext = useCallback(() => {
    if (isTransitioning) return
    
    setIsTransitioning(true)
    setDirection('forward')
    
    setTimeout(() => {
      if (currentStep === 1) {
        setCurrentStep(2)
      } else if (currentStep === 2) {
        // Step 3 completes onboarding
        completeOnboarding()
        if (onComplete) {
          onComplete()
        }
      }
      setIsTransitioning(false)
    }, 300) // Small delay for visual feedback and rapid-click protection
  }, [currentStep, isTransitioning, completeOnboarding, onComplete])

  /**
   * Navigate back
   */
  const handleBack = useCallback(() => {
    if (isTransitioning) return
    if (currentStep === 1) return
    
    setIsTransitioning(true)
    setDirection('backward')
    
    setTimeout(() => {
      setCurrentStep(prev => prev - 1)
      setIsTransitioning(false)
    }, 300)
  }, [currentStep, isTransitioning])

  /**
   * Handle keyboard navigation for policy selection
   */
  const handlePolicyKeyDown = useCallback((event, policyId) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handlePolicySelect(policyId)
    }
  }, [handlePolicySelect])

  /**
   * Handle Enter key on continue button
   */
  const handleContinueKeyDown = useCallback((event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (selectedPolicy && !isTransitioning) {
        handleNext()
      }
    }
  }, [selectedPolicy, isTransitioning, handleNext])

  // Step indicator component with State Farm branding
  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      <div className={`flex items-center gap-2 transition-all duration-300 ${currentStep >= 1 ? 'opacity-100' : 'opacity-50'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
          currentStep >= 1 
            ? 'bg-[#E31837] text-white' 
            : 'bg-gray-200 text-gray-500'
        }`}>
          1
        </div>
        <span className={`text-sm font-medium ${currentStep >= 1 ? 'text-[#E31837]' : 'text-gray-400'}`}>
          Policy
        </span>
      </div>
      
      <div className="w-12 h-0.5 bg-gray-200 rounded">
        <div 
          className="h-full bg-[#E31837] rounded transition-all duration-500"
          style={{ width: currentStep >= 2 ? '100%' : '0%' }}
        />
      </div>
      
      <div className={`flex items-center gap-2 transition-all duration-300 ${currentStep >= 2 ? 'opacity-100' : 'opacity-50'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
          currentStep >= 2 
            ? 'bg-[#E31837] text-white' 
            : 'bg-gray-200 text-gray-500'
        }`}>
          2
        </div>
        <span className={`text-sm font-medium ${currentStep >= 2 ? 'text-[#E31837]' : 'text-gray-400'}`}>
          Camera
        </span>
      </div>
    </div>
  )

  // Step 1: Policy Selection
  const PolicySelectionStep = () => (
    <motion.div 
      initial={{ opacity: 0, x: direction === 'forward' ? 20 : -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: direction === 'forward' ? -20 : 20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">Select Your Insurance</h2>
        <p className="text-gray-600">
          Choose your current policy type. You can change this later.
        </p>
      </div>

      {/* Policy Options Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" role="radiogroup" aria-label="Select insurance policy type">
        {POLICY_OPTIONS.map((policy) => {
          const Icon = policy.icon
          const isSelected = selectedPolicy === policy.id
          
          return (
            <motion.button
              key={policy.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              role="radio"
              aria-checked={isSelected}
              aria-label={policy.label}
              tabIndex={0}
              onClick={() => handlePolicySelect(policy.id)}
              onKeyDown={(e) => handlePolicyKeyDown(e, policy.id)}
              className={`
                relative flex flex-col items-center p-6 rounded-xl border-2 
                transition-all duration-200 cursor-pointer
                focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:ring-offset-2
                ${isSelected 
                  ? 'border-[#E31837] bg-red-50 shadow-md' 
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                }
              `}
            >
              {/* Selected Indicator */}
              {isSelected && (
                <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center bg-[#E31837]">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}
              
              <Icon className={`
                w-10 h-10 mb-3 transition-colors
                ${isSelected 
                  ? 'text-[#E31837]' 
                  : 'text-gray-400'
                }
              `} />
              
              <h3 className={`
                font-semibold text-lg mb-1
                ${isSelected 
                  ? 'text-[#E31837]' 
                  : 'text-gray-700'
                }
              `}>
                {policy.label}
              </h3>
              
              <p className={`text-sm text-center ${isSelected ? 'text-red-600' : 'text-gray-500'}`}>
                {policy.description}
              </p>
            </motion.button>
          )
        })}
      </div>

      {/* Continue Button */}
      <motion.button
        whileHover={selectedPolicy ? { scale: 1.02 } : {}}
        whileTap={selectedPolicy ? { scale: 0.98 } : {}}
        onClick={handleNext}
        onKeyDown={handleContinueKeyDown}
        disabled={!selectedPolicy || isTransitioning}
        tabIndex={0}
        className={`
          w-full py-4 px-6 rounded-xl font-semibold text-lg
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:ring-offset-2
          ${selectedPolicy && !isTransitioning
            ? 'bg-[#E31837] text-white hover:bg-[#B8122C] shadow-md cursor-pointer'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }
        `}
        aria-disabled={!selectedPolicy || isTransitioning}
      >
        {isTransitioning ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Continuing...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            Continue
            <ArrowRight className="w-5 h-5" />
          </span>
        )}
      </motion.button>
    </motion.div>
  )

  // Step 2: Camera Instruction
  const CameraInstructionStep = () => (
    <motion.div 
      initial={{ opacity: 0, x: direction === 'forward' ? 20 : -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: direction === 'forward' ? -20 : 20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">Point Your Camera</h2>
        <p className="text-gray-600">
          Scan your room to detect items and see your insurance coverage.
        </p>
      </div>

      {/* Camera Illustration / Instructions - State Farm branded */}
      <div className="bg-gradient-to-br from-red-50 to-gray-50 rounded-2xl p-6 sm:p-8 text-center border border-red-100">
        <div className="relative w-28 h-28 sm:w-32 sm:h-32 mx-auto mb-6">
          <motion.div 
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 bg-[#E31837]/20 rounded-full" 
          />
          <div className="relative w-full h-full bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-red-100">
            <Camera className="w-12 h-12 sm:w-14 sm:h-14 text-[#E31837]" />
          </div>
        </div>
        
        <h3 className="font-semibold text-gray-900 mb-4">How it works:</h3>
        <ul className="space-y-3 text-left max-w-sm mx-auto">
          <li className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-[#E31837]/10 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-[#E31837] font-bold text-sm">1</span>
            </div>
            <span className="text-gray-700 text-sm sm:text-base">Point your camera at objects in your room</span>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-[#E31837]/10 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-[#E31837] font-bold text-sm">2</span>
            </div>
            <span className="text-gray-700 text-sm sm:text-base">AI detects items and shows coverage status</span>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-[#E31837]/10 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-[#E31837] font-bold text-sm">3</span>
            </div>
            <span className="text-gray-700 text-sm sm:text-base">Green = Covered, Red = Not Covered</span>
          </li>
        </ul>
      </div>

      {/* Privacy Note */}
      <p className="text-xs sm:text-sm text-gray-500 text-center px-4">
        All processing happens on your device. No images are sent to any server.
      </p>

      {/* Action Buttons */}
      <div className="flex gap-3 sm:gap-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleBack}
          disabled={isTransitioning}
          tabIndex={0}
          className="
            flex-1 py-3 px-3 sm:px-4 rounded-xl font-medium
            border-2 border-gray-200 text-gray-700
            hover:border-gray-300 hover:bg-gray-50
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2
            text-sm sm:text-base
          "
        >
          <span className="flex items-center justify-center gap-1 sm:gap-2">
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            Back
          </span>
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleNext}
          disabled={isTransitioning}
          tabIndex={0}
          className="
            flex-[2] py-3 px-3 sm:px-4 rounded-xl font-semibold
            bg-[#E31837] text-white hover:bg-[#B8122C]
            shadow-md
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:ring-offset-2
            text-sm sm:text-base
          "
        >
          {isTransitioning ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Starting...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
              Start Camera
            </span>
          )}
        </motion.button>
      </div>
    </motion.div>
  )

  return (
    <div 
      className="min-h-screen bg-[#F7F7F7] flex items-center justify-center p-3 sm:p-4"
      data-testid="onboarding-flow"
    >
      <div className="w-full max-w-md">
        {/* Header Logo - State Farm Style */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-3 mb-6 sm:mb-8"
        >
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#E31837] rounded-xl flex items-center justify-center shadow-lg">
            <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">InsureScope</h1>
            <span className="text-xs text-[#E31837] font-medium tracking-wider uppercase">By State Farm</span>
          </div>
        </motion.div>

        {/* Step Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <StepIndicator />
        </motion.div>

        {/* Step Content */}
        <div className="bg-white rounded-2xl shadow-lg p-5 sm:p-6">
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <PolicySelectionStep />
              </motion.div>
            )}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <CameraInstructionStep />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Skip Option (only on step 1) */}
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center mt-4 sm:mt-6 text-xs sm:text-sm text-gray-500"
        >
          Already have an account?{' '}
          <button 
            onClick={() => {
              setSelectedPolicy('renters')
              setPolicyType('renters')
              completeOnboarding()
              if (onComplete) onComplete()
            }}
            className="text-[#E31837] hover:text-[#B8122C] underline focus:outline-none focus:ring-2 focus:ring-[#E31837] rounded px-1"
          >
            Skip to main view
          </button>
        </motion.p>
      </div>
    </div>
  )
}

export default OnboardingFlow
