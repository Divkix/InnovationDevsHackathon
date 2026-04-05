import { useState } from 'react'
import { useAppContext } from './context/AppContext.jsx'

function App() {
  const [count, setCount] = useState(0)
  const { 
    policyType, 
    onboardingComplete, 
    activeTab,
    manualItems,
    setPolicyType, 
    completeOnboarding,
    setActiveTab,
    addManualItem,
    removeManualItem
  } = useAppContext()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-gray-800 mb-4 text-center">
          InsureScope
        </h1>
        <p className="text-gray-600 text-center mb-6">
          AI-powered insurance coverage analysis
        </p>
        
        {/* AppContext Demo */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-3">App State (AppContext)</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Policy Type:</span>
              <span className="font-medium text-blue-600" data-testid="display-policy">{policyType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Onboarding Complete:</span>
              <span className="font-medium text-blue-600" data-testid="display-onboarding">{onboardingComplete ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Active Tab:</span>
              <span className="font-medium text-blue-600" data-testid="display-tab">{activeTab}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Manual Items:</span>
              <span className="font-medium text-blue-600" data-testid="display-items">{manualItems.length}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 mb-6">
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              onClick={() => setPolicyType('homeowners')}
              className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Homeowners
            </button>
            <button
              onClick={() => setPolicyType('auto')}
              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Auto
            </button>
            <button
              onClick={() => setPolicyType('none')}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              No Insurance
            </button>
          </div>
          
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              onClick={() => setActiveTab(activeTab === 'camera' ? 'dashboard' : 'camera')}
              className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Toggle Tab
            </button>
            <button
              onClick={() => completeOnboarding()}
              className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Complete Onboarding
            </button>
          </div>

          <div className="flex flex-wrap gap-2 justify-center">
            <button
              onClick={() => addManualItem({ id: `item-${Date.now()}`, name: 'New Item', value: 100 })}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Add Manual Item
            </button>
            <button
              onClick={() => manualItems.length > 0 && removeManualItem(manualItems[manualItems.length - 1].id)}
              className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Remove Last Item
            </button>
          </div>
        </div>
        
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={() => setCount((count) => count + 1)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
          >
            Count is {count}
          </button>
          
          <div className="flex gap-2 mt-4">
            <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full font-medium">
              React ✓
            </span>
            <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full font-medium">
              Vite ✓
            </span>
            <span className="px-3 py-1 bg-teal-100 text-teal-800 text-sm rounded-full font-medium">
              Tailwind ✓
            </span>
            <span className="px-3 py-1 bg-orange-100 text-orange-800 text-sm rounded-full font-medium">
              AppContext ✓
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
