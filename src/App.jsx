import { useState } from 'react'
import { useAppContext } from './context/AppContext.jsx'
import { Dashboard } from './components/Dashboard/Dashboard.jsx'
import { PolicySelector } from './components/PolicySelector/PolicySelector.jsx'
import { Camera, LayoutDashboard } from 'lucide-react'

function App() {
  const { 
    policyType, 
    onboardingComplete, 
    activeTab,
    manualItems,
    detectedItems,
    setActiveTab,
  } = useAppContext()

  // Render Dashboard when active tab is 'dashboard'
  if (activeTab === 'dashboard') {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col">
        {/* Header with Policy Selector */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-4 py-3 sticky top-0 z-50">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">IS</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900">InsureScope</h1>
            </div>
            
            {/* Policy Selector in Header */}
            <PolicySelector 
              variant="compact" 
              detectedItems={Array.from(detectedItems?.values() || [])}
              manualItems={manualItems}
            />
          </div>
        </header>

        {/* Tab Navigation */}
        <div className="bg-white border-b border-gray-200 px-4 py-2">
          <div className="max-w-6xl mx-auto flex gap-4">
            <button
              onClick={() => setActiveTab('camera')}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
                ${activeTab === 'camera' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-600 hover:bg-gray-100'
                }
              `}
            >
              <Camera className="w-4 h-4" />
              Camera
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
                ${activeTab === 'dashboard' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-600 hover:bg-gray-100'
                }
              `}
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </button>
          </div>
        </div>

        {/* Dashboard Content */}
        <main className="flex-1 p-4">
          <Dashboard 
            detectedItems={Array.from(detectedItems?.values() || [])}
            manualItems={manualItems}
            policyType={policyType}
          />
        </main>
      </div>
    )
  }

  // Camera view with header
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header with Policy Selector */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-4 py-3 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">IS</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">InsureScope</h1>
          </div>
          
          {/* Policy Selector in Header */}
          <PolicySelector 
            variant="compact" 
            detectedItems={Array.from(detectedItems?.values() || [])}
            manualItems={manualItems}
          />
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200 px-4 py-2">
        <div className="max-w-6xl mx-auto flex gap-4">
          <button
            onClick={() => setActiveTab('camera')}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
              ${activeTab === 'camera' 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-600 hover:bg-gray-100'
              }
            `}
          >
            <Camera className="w-4 h-4" />
            Camera
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
              ${activeTab === 'dashboard' 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-600 hover:bg-gray-100'
              }
            `}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </button>
        </div>
      </div>

      {/* Main Content - Full Policy Selector Demo */}
      <main className="flex-1 p-4 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Full Policy Selector */}
          <PolicySelector 
            detectedItems={Array.from(detectedItems?.values() || [])}
            manualItems={manualItems}
          />
          
          {/* Info Card */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">About Policy Selection</h3>
            <p className="text-blue-800 text-sm">
              Select your insurance policy type above to see how different policies cover your detected items. 
              Try "No Insurance" to see the <strong>Red Moment</strong> — when all items appear red and unprotected!
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
