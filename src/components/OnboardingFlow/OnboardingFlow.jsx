import { useState, useCallback, useEffect } from 'react'
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

  // Step indicator component
  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      <div className={`flex items-center gap-2 transition-all duration-300 ${currentStep >= 1 ? 'opacity-100' : 'opacity-50'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
          currentStep >= 1 
            ? 'bg-blue-600 text-white' 
            : 'bg-gray-200 text-gray-500'
        }`}>
          1
        </div>
        <span className={`text-sm font-medium ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
          Policy
        </span>
      </div>
      
      <div className="w-12 h-0.5 bg-gray-200 rounded">
        <div 
          className="h-full bg-blue-600 rounded transition-all duration-500"
          style={{ width: currentStep >= 2 ? '100%' : '0%' }}
        />
      </div>
      
      <div className={`flex items-center gap-2 transition-all duration-300 ${currentStep >= 2 ? 'opacity-100' : 'opacity-50'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
          currentStep >= 2 
            ? 'bg-blue-600 text-white' 
            : 'bg-gray-200 text-gray-500'
        }`}>
          2
        </div>
        <span className={`text-sm font-medium ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
          Camera
        </span>
      </div>
    </div>
  )

  // Step 1: Policy Selection
  const PolicySelectionStep = () => (
    <div className={`space-y-6 transition-all duration-300 ${direction === 'forward' ? 'animate-in fade-in slide-in-from-right-4' : 'animate-in fade-in slide-in-from-left-4'}`}>
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
            <button
              key={policy.id}
              role="radio"
              aria-checked={isSelected}
              aria-label={policy.label}
              tabIndex={0}
              onClick={() => handlePolicySelect(policy.id)}
              onKeyDown={(e) => handlePolicyKeyDown(e, policy.id)}
              className={`
                relative flex flex-col items-center p-6 rounded-xl border-2 
                transition-all duration-200 cursor-pointer
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                ${isSelected 
                  ? `border-${policy.color}-500 bg-${policy.color}-50 shadow-md` 
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                }
              `}
            >
              {/* Selected Indicator */}
              {isSelected && (
                <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center bg-${policy.color}-500`}>
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}
              
              <Icon className={`
                w-10 h-10 mb-3 transition-colors
                ${isSelected 
                  ? `text-${policy.color}-600` 
                  : 'text-gray-400'
                }
              `} />
              
              <h3 className={`
                font-semibold text-lg mb-1
                ${isSelected 
                  ? `text-${policy.color}-700` 
                  : 'text-gray-700'
                }
              `}>
                {policy.label}
              </h3>
              
              <p className={`text-sm text-center ${isSelected ? `text-${policy.color}-600` : 'text-gray-500'}`}>
                {policy.description}
              </p>
            </button>
          )
        })}
      </div>

      {/* Continue Button */}
      <button
        onClick={handleNext}
        onKeyDown={handleContinueKeyDown}
        disabled={!selectedPolicy || isTransitioning}
        tabIndex={0}
        className={`
          w-full py-4 px-6 rounded-xl font-semibold text-lg
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          ${selectedPolicy && !isTransitioning
            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md cursor-pointer'
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
      </button>
    </div>
  )

  // Step 2: Camera Instruction
  const CameraInstructionStep = () => (
    <div className={`space-y-6 transition-all duration-300 ${direction === 'forward' ? 'animate-in fade-in slide-in-from-right-4' : 'animate-in fade-in slide-in-from-left-4'}`}>
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">Point Your Camera</h2>
        <p className="text-gray-600">
          Scan your room to detect items and see your insurance coverage.
        </p>
      </div>

      {/* Camera Illustration / Instructions */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 text-center">
        <div className="relative w-32 h-32 mx-auto mb-6">
          <div className="absolute inset-0 bg-blue-200 rounded-full animate-pulse opacity-30" />
          <div className="relative w-full h-full bg-white rounded-full shadow-lg flex items-center justify-center">
            <Camera className="w-14 h-14 text-blue-600" />
          </div>
        </div>
        
        <h3 className="font-semibold text-gray-900 mb-4">How it works:</h3>
        <ul className="space-y-3 text-left max-w-sm mx-auto">
          <li className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-green-600 font-bold text-sm">1</span>
            </div>
            <span className="text-gray-700">Point your camera at objects in your room</span>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-green-600 font-bold text-sm">2</span>
            </div>
            <span className="text-gray-700">AI detects items and shows coverage status</span>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-green-600 font-bold text-sm">3</span>
            </div>
            <span className="text-gray-700">Green = Covered, Red = Not Covered</span>
          </li>
        </ul>
      </div>

      {/* Privacy Note */}
      <p className="text-sm text-gray-500 text-center">
        All processing happens on your device. No images are sent to any server.
      </p>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={handleBack}
          disabled={isTransitioning}
          tabIndex={0}
          className="
            flex-1 py-3 px-4 rounded-xl font-medium
            border-2 border-gray-200 text-gray-700
            hover:border-gray-300 hover:bg-gray-50
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2
          "
        >
          <span className="flex items-center justify-center gap-2">
            <ChevronLeft className="w-5 h-5" />
            Back
          </span>
        </button>
        
        <button
          onClick={handleNext}
          disabled={isTransitioning}
          tabIndex={0}
          className="
            flex-[2] py-3 px-4 rounded-xl font-semibold
            bg-blue-600 text-white hover:bg-blue-700
            shadow-md
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          "
        >
          {isTransitioning ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Starting...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Camera className="w-5 h-5" />
              Start Camera
            </span>
          )}
        </button>
      </div>
    </div>
  )

  return (
    <div 
      className="min-h-screen bg-gray-100 flex items-center justify-center p-4"
      data-testid="onboarding-flow"
    >
      <div className="w-full max-w-md">
        {/* Header Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">InsureScope</h1>
        </div>

        {/* Step Indicator */}
        <StepIndicator />

        {/* Step Content */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          {currentStep === 1 && <PolicySelectionStep />}
          {currentStep === 2 && <CameraInstructionStep />}
        </div>

        {/* Skip Option (only on step 1) */}
        {currentStep === 1 && (
          <p className="text-center mt-6 text-sm text-gray-500">
            Already have an account?{' '}
            <button 
              onClick={() => {
                setSelectedPolicy('renters')
                setPolicyType('renters')
                completeOnboarding()
                if (onComplete) onComplete()
              }}
              className="text-blue-600 hover:text-blue-700 underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1"
            >
              Skip to main view
            </button>
          </p>
        )}
      </div>
    </div>
  )
}

export default OnboardingFlow
