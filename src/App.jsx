import { useState } from 'react'
import { useAppContext } from './context/AppContext.jsx'
import { Dashboard } from './components/Dashboard/Dashboard.jsx'
import { PolicySelector } from './components/PolicySelector/PolicySelector.jsx'
import { CameraView } from './components/CameraView/CameraView.jsx'
import { TabNavigation } from './components/TabNavigation/TabNavigation.jsx'
import { DetailModal } from './components/DetailModal/DetailModal.jsx'
import { OnboardingFlow } from './components/OnboardingFlow/OnboardingFlow.jsx'
import { AddItemForm, ManualItemsList } from './components/AddItemForm/AddItemForm.jsx'
import { Plus, Package } from 'lucide-react'

function App() {
  const { 
    policyType, 
    activeTab,
    manualItems,
    detectedItems,
    selectedItemId,
    onboardingComplete,
    removeManualItem,
    setActiveTab,
    setSelectedItem,
  } = useAppContext()

  // Handle camera errors (shown in error state)
  const [, setCameraError] = useState(null)

  // State for Add Item form modal
  const [isAddItemFormOpen, setIsAddItemFormOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)

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

  // Handle opening Add Item form
  const handleOpenAddItem = () => {
    setEditItem(null)
    setIsAddItemFormOpen(true)
  }

  // Handle editing an item
  const handleEditItem = (item) => {
    setEditItem(item)
    setIsAddItemFormOpen(true)
  }

  // Handle removing an item
  const handleRemoveItem = (item) => {
    if (confirm(`Are you sure you want to remove "${item.name}"?`)) {
      removeManualItem(item.id)
    }
  }

  // Handle closing Add Item form
  const handleCloseAddItem = () => {
    setIsAddItemFormOpen(false)
    setEditItem(null)
  }

  // Show onboarding if not complete
  if (!onboardingComplete) {
    return (
      <OnboardingFlow 
        onComplete={() => {
          // Onboarding complete - App will re-render and show main view
        }} 
      />
    )
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
            <div className="max-w-4xl mx-auto h-full relative">
              {/* Add Item Button - Camera View */}
              <button
                onClick={handleOpenAddItem}
                className="absolute top-4 right-4 z-30 flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 text-gray-700 font-medium hover:bg-white transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Add manual item"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </button>
              
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
            <div className="max-w-4xl mx-auto space-y-4">
              {/* Add Item Button - Dashboard View */}
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-600" />
                  Your Items
                </h2>
                <button
                  onClick={handleOpenAddItem}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  aria-label="Add manual item"
                >
                  <Plus className="w-4 h-4" />
                  Add Item
                </button>
              </div>

              <Dashboard 
                detectedItems={Array.from(detectedItems?.values() || [])}
                manualItems={manualItems}
                policyType={policyType}
                onItemClick={(item) => setSelectedItem(item.id)}
              />
              
              {/* Manual Items Section */}
              {manualItems.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Package className="w-4 h-4 text-blue-600" />
                      Manual Items
                      <span className="text-sm font-normal text-gray-500 ml-1">
                        ({manualItems.length} item{manualItems.length !== 1 ? 's' : ''})
                      </span>
                    </h3>
                  </div>
                  <div className="p-4">
                    <ManualItemsList 
                      items={manualItems}
                      onEdit={handleEditItem}
                      onRemove={handleRemoveItem}
                      onItemClick={(item) => setSelectedItem(item.id)}
                    />
                  </div>
                </div>
              )}
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

      {/* Add Item Form Modal */}
      <AddItemForm
        isOpen={isAddItemFormOpen}
        onClose={handleCloseAddItem}
        editItem={editItem}
      />
    </div>
  )
}

export default App
