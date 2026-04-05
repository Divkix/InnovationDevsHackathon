import { useState } from 'react'
import { useAppContext } from './context/AppContext.jsx'
import { Dashboard } from './components/Dashboard/Dashboard.jsx'
import { PolicySelector } from './components/PolicySelector/PolicySelector.jsx'
import { CameraView } from './components/CameraView/CameraView.jsx'
import { TabNavigation } from './components/TabNavigation/TabNavigation.jsx'
import { DetailModal } from './components/DetailModal/DetailModal.jsx'

function App() {
  const { 
    policyType, 
    activeTab,
    manualItems,
    detectedItems,
    selectedItemId,
    setActiveTab,
    setSelectedItem,
  } = useAppContext()

  // Handle camera errors (shown in error state)
  const [, setCameraError] = useState(null)

  // Handle manual mode fallback
  const handleManualMode = () => {
    // When camera is unavailable, switch to dashboard
    // User can add items manually
    setActiveTab('dashboard')
  }

  // Find selected item from detected or manual items
  const selectedItem = selectedItemId ? 
    (detectedItems.get(selectedItemId) || manualItems.find(item => item.id === selectedItemId)) : 
    null

  // Prepare item for DetailModal
  const detailModalItem = selectedItem ? {
    ...selectedItem,
    // Add source based on which collection it came from
    source: detectedItems.has(selectedItemId) ? 'camera' : 'dashboard'
  } : null

  // Handle modal close
  const handleCloseDetailModal = () => {
    setSelectedItem(null)
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header with Policy Selector */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-4 py-3 sticky top-0 z-40">
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

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden">
        {/* Camera Tab Content */}
        {activeTab === 'camera' && (
          <div className="h-full p-4 pb-24 md:pb-4">
            <div className="max-w-4xl mx-auto h-full">
              <CameraView 
                onError={setCameraError}
                onManualMode={handleManualMode}
                onItemClick={(item) => setSelectedItem(item.id)}
              />
            </div>
          </div>
        )}

        {/* Dashboard Tab Content */}
        {activeTab === 'dashboard' && (
          <div className="h-full overflow-y-auto p-4 pb-24 md:pb-4">
            <div className="max-w-4xl mx-auto">
              <Dashboard 
                detectedItems={Array.from(detectedItems?.values() || [])}
                manualItems={manualItems}
                policyType={policyType}
                onItemClick={(item) => setSelectedItem(item.id)}
              />
            </div>
          </div>
        )}
      </main>

      {/* Tab Navigation - Responsive: bottom on mobile, top content area on desktop */}
      <TabNavigation 
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Detail Modal */}
      <DetailModal
        isOpen={!!selectedItemId}
        onClose={handleCloseDetailModal}
        item={detailModalItem}
        policyType={policyType}
      />
    </div>
  )
}

export default App
