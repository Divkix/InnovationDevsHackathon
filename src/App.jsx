import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppContext } from './context/AppContext.jsx'
import { useGemini } from './hooks/useGemini.js'
import { Dashboard } from './components/Dashboard/Dashboard.jsx'
import { PolicySelector } from './components/PolicySelector/PolicySelector.jsx'
import { CameraView } from './components/CameraView/CameraView.jsx'
import { TabNavigation } from './components/TabNavigation/TabNavigation.jsx'
import { DetailModal } from './components/DetailModal/DetailModal.jsx'
import { OnboardingFlow } from './components/OnboardingFlow/OnboardingFlow.jsx'
import { AddItemForm, ManualItemsList } from './components/AddItemForm/AddItemForm.jsx'
import { Plus, Package, MessageCircle, Shield } from 'lucide-react'

function App() {
  const { 
    policyType, 
    activeTab,
    manualItems,
    detectedItems,
    selectedItemId,
    onboardingComplete,
    manualModeEnabled,
    removeManualItem,
    setActiveTab,
    setSelectedItem,
    enableManualMode,
    disableManualMode,
  } = useAppContext()

  // Gemini hook for AI assistance
  const gemini = useGemini()

  // Handle camera errors (shown in error state)
  const [, setCameraError] = useState(null)

  // State for Add Item form modal
  const [isAddItemFormOpen, setIsAddItemFormOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)

  // Handle manual mode fallback
  const handleManualMode = () => {
    // When camera is unavailable, enable manual mode
    enableManualMode()
  }

  // Handle enabling camera from manual mode
  const handleEnableCamera = () => {
    disableManualMode()
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
    <div className="min-h-screen bg-[#F7F7F7] flex flex-col overflow-x-hidden">
      {/* Manual Mode Banner */}
      <AnimatePresence>
        {manualModeEnabled && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-gray-800 text-white px-4 py-2 text-center text-sm"
          >
            <span className="font-medium">Manual Mode Active</span> — Camera is disabled. 
            <button 
              onClick={handleEnableCamera}
              className="ml-2 underline hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-white rounded px-1"
            >
              Enable Camera
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header with State Farm Branding */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-3 sm:px-4 py-3 sticky top-0 z-40 safe-top">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          {/* Logo - State Farm Style */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#E31837] rounded-lg flex items-center justify-center shadow-md">
              <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="flex flex-col items-start">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">InsureScope</h1>
              <span className="text-[10px] sm:text-xs text-[#E31837] font-medium tracking-wider uppercase hidden sm:block">By State Farm</span>
            </div>
          </div>
          
          {/* Right side: Gemini button + Policy Selector */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Gemini Ask Button - Only show when API key is set */}
            <AnimatePresence>
              {gemini && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="hidden sm:flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  aria-label="Ask about coverage"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span className="hidden md:inline">Ask about coverage</span>
                </motion.button>
              )}
            </AnimatePresence>
            
            {/* Policy Selector in Header */}
            <PolicySelector 
              variant="compact" 
              detectedItems={Array.from(detectedItems?.values() || [])}
              manualItems={manualItems}
            />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {/* Camera Tab Content */}
          {activeTab === 'camera' && (
            <motion.div
              key="camera-tab"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="h-full p-3 sm:p-4 pb-24 md:pb-4"
            >
              <div className="max-w-5xl xl:max-w-6xl mx-auto h-full relative camera-container">
                {/* Add Item Button - Camera View */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleOpenAddItem}
                  className="absolute top-3 right-3 sm:top-4 sm:right-4 z-30 flex items-center gap-2 px-3 sm:px-4 py-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 text-gray-700 font-medium hover:bg-white transition-all focus:outline-none focus:ring-2 focus:ring-[#E31837] text-sm sm:text-base"
                  aria-label="Add manual item"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Add Item</span>
                </motion.button>
                
                <CameraView 
                  onError={setCameraError}
                  onManualMode={handleManualMode}
                  onItemClick={(item) => setSelectedItem(item.id)}
                />
              </div>
            </motion.div>
          )}

          {/* Dashboard Tab Content */}
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard-tab"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="h-full overflow-y-auto p-3 sm:p-4 pb-24 md:pb-4"
            >
              <div className="max-w-5xl xl:max-w-6xl mx-auto space-y-4">
                {/* Add Item Button - Dashboard View */}
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between flex-wrap gap-2"
                >
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Package className="w-5 h-5 text-[#E31837]" />
                    Your Items
                  </h2>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleOpenAddItem}
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-[#E31837] text-white rounded-lg font-medium hover:bg-[#B8122C] transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:ring-offset-2 text-sm sm:text-base"
                    aria-label="Add manual item"
                  >
                    <Plus className="w-4 h-4" />
                    Add Item
                  </motion.button>
                </motion.div>

                <Dashboard 
                  detectedItems={Array.from(detectedItems?.values() || [])}
                  manualItems={manualItems}
                  policyType={policyType}
                  onItemClick={(item) => setSelectedItem(item.id)}
                />
                
                {/* Manual Items Section */}
                <AnimatePresence>
                  {manualItems.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
                    >
                      <div className="px-3 sm:px-4 py-3 border-b border-gray-200 bg-gray-50">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm sm:text-base">
                          <Package className="w-4 h-4 text-[#E31837]" />
                          Manual Items
                          <span className="text-xs sm:text-sm font-normal text-gray-500 ml-1">
                            ({manualItems.length} item{manualItems.length !== 1 ? 's' : ''})
                          </span>
                        </h3>
                      </div>
                      <div className="p-3 sm:p-4">
                        <ManualItemsList 
                          items={manualItems}
                          onEdit={handleEditItem}
                          onRemove={handleRemoveItem}
                          onItemClick={(item) => setSelectedItem(item.id)}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
