import { AnimatePresence, motion } from "framer-motion";
import {
  FileText,
  Globe,
  MessageCircle,
  Package,
  Plus,
  Shield,
  Volume2,
  VolumeX,
} from "lucide-react";
import { type ReactElement, useMemo, useState } from "react";
import { AddItemForm, ManualItemsList } from "./components/AddItemForm/AddItemForm";
import { CameraView } from "./components/CameraView/CameraView";
import { Dashboard } from "./components/Dashboard/Dashboard";
import { DetailModal } from "./components/DetailModal/DetailModal";
import { OnboardingFlow } from "./components/OnboardingFlow/OnboardingFlow";
import { PolicySelector } from "./components/PolicySelector/PolicySelector";
import { QuoteHandoffModal } from "./components/QuoteHandoffModal";
import { QuotePacketCard } from "./components/QuotePacketCard";
import { TabNavigation } from "./components/TabNavigation/TabNavigation";
import { useAppContext } from "./context/AppContext";
import { useGemini } from "./hooks/useGemini";
import type { ManualItem } from "./types";
import { getCopy, SUPPORTED_LANGUAGES } from "./utils/language";

function App(): ReactElement {
  const {
    policyType,
    activeTab,
    manualItems,
    detectedItems,
    selectedItemId,
    onboardingComplete,
    manualModeEnabled,
    language,
    ttsEnabled,
    removeManualItem,
    setActiveTab,
    setSelectedItem,
    setLanguage,
    setTtsEnabled,
    enableManualMode,
    disableManualMode,
  } = useAppContext();

  // Gemini hook for AI assistance
  const gemini = useGemini();
  const copy = getCopy(language);
  const detectedItemsList = useMemo(() => Array.from(detectedItems.values()), [detectedItems]);

  // Handle camera errors (shown in error state)
  const [, setCameraError] = useState<Error | string | null>(null);

  // State for Add Item form modal
  const [isAddItemFormOpen, setIsAddItemFormOpen] = useState<boolean>(false);
  const [editItem, setEditItem] = useState<ManualItem | null>(null);
  const [isQuoteHandoffOpen, setIsQuoteHandoffOpen] = useState<boolean>(false);

  // Handle manual mode fallback
  const handleManualMode = (): void => {
    // When camera is unavailable, enable manual mode
    enableManualMode();
  };

  // Handle enabling camera from manual mode
  const handleEnableCamera = (): void => {
    disableManualMode();
  };

  // Find selected item from detected or manual items
  const selectedItem = selectedItemId
    ? detectedItems.get(selectedItemId) || manualItems.find((item) => item.id === selectedItemId)
    : null;

  // Prepare item for DetailModal
  const detailModalItem =
    selectedItem && selectedItemId
      ? {
          ...selectedItem,
          // Add source based on which collection it came from
          source: (detectedItems.has(selectedItemId) ? "camera" : "dashboard") as
            | "camera"
            | "dashboard",
        }
      : null;

  // Handle modal close
  const handleCloseDetailModal = (): void => {
    setSelectedItem(null);
  };

  // Handle opening Add Item form
  const handleOpenAddItem = (): void => {
    setEditItem(null);
    setIsAddItemFormOpen(true);
  };

  // Handle editing an item
  const handleEditItem = (item: ManualItem): void => {
    setEditItem(item);
    setIsAddItemFormOpen(true);
  };

  // Handle removing an item
  const handleRemoveItem = (item: ManualItem): void => {
    if (confirm(`Are you sure you want to remove "${item.name}"?`)) {
      removeManualItem(item.id);
    }
  };

  // Handle closing Add Item form
  const handleCloseAddItem = (): void => {
    setIsAddItemFormOpen(false);
    setEditItem(null);
  };

  const handleOpenQuoteHandoff = (): void => {
    setIsQuoteHandoffOpen(true);
  };

  const handleCloseQuoteHandoff = (): void => {
    setIsQuoteHandoffOpen(false);
  };

  // Show onboarding if not complete
  if (!onboardingComplete) {
    return (
      <OnboardingFlow
        onComplete={() => {
          // Onboarding complete - App will re-render and show main view
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[var(--swiss-bg)] text-[var(--swiss-fg)] flex flex-col overflow-x-hidden">
      {/* Manual Mode Banner */}
      <AnimatePresence>
        {manualModeEnabled && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="swiss-accent-block border-b-2 border-[var(--swiss-border)] px-4 py-2 text-center text-sm"
          >
            <span className="font-medium">{copy.common.manualModeActive}</span> —{" "}
            {copy.common.cameraDisabled}
            <button
              onClick={handleEnableCamera}
              className="ml-2 underline hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-white rounded px-1"
            >
              {copy.common.enableCamera}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header with State Farm Branding */}
      <header className="bg-[var(--swiss-bg)] border-b-2 border-[var(--swiss-border)] px-3 sm:px-6 py-3 sticky top-0 z-40 safe-top swiss-grid-pattern">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo - State Farm Style */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[var(--swiss-accent)] border-2 border-[var(--swiss-border)] flex items-center justify-center">
              <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="flex flex-col items-start">
              <h1 className="text-lg sm:text-2xl font-black leading-tight uppercase tracking-[-0.05em]">
                InsureScope
              </h1>
              <span className="swiss-label text-[var(--swiss-accent)] hidden sm:block">
                By State Farm
              </span>
            </div>
          </div>

          {/* Right side: Gemini button + Policy Selector */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Gemini Ask Button - Only show when API key is set */}
            <AnimatePresence>
              {gemini && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={() => setActiveTab("camera")}
                  className="hidden sm:flex items-center gap-2 px-4 py-3 swiss-button text-xs"
                  aria-label="Ask about coverage"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span className="hidden md:inline">{copy.common.askAboutCoverage}</span>
                </motion.button>
              )}
            </AnimatePresence>

            <div className="hidden md:flex items-center gap-1 swiss-panel px-1 py-1">
              <Globe className="w-4 h-4 text-[var(--swiss-fg)] ml-1" />
              {SUPPORTED_LANGUAGES.map((entry) => {
                const active = entry.code === language;
                return (
                  <button
                    key={entry.code}
                    type="button"
                    onClick={() => setLanguage(entry.code)}
                    aria-pressed={active}
                    className={`px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] transition-colors ${
                      active
                        ? "bg-[var(--swiss-accent)] text-white"
                        : "text-gray-500 hover:bg-[var(--swiss-muted)]"
                    }`}
                  >
                    {entry.code.toUpperCase()}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setTtsEnabled(!ttsEnabled)}
              className="hidden sm:flex items-center gap-2 px-4 py-3 swiss-button-secondary text-xs"
              aria-pressed={ttsEnabled}
              aria-label={ttsEnabled ? "Disable voice playback" : "Enable voice playback"}
            >
              {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={handleOpenQuoteHandoff}
              className="hidden sm:flex items-center gap-2 px-4 py-3 swiss-button-secondary text-xs"
              aria-label="Generate quote handoff"
            >
              <FileText className="w-4 h-4" />
              <span className="hidden md:inline">Quote Packet</span>
            </button>

            {/* Policy Selector in Header */}
            <PolicySelector
              variant="compact"
              detectedItems={detectedItemsList}
              manualItems={manualItems}
            />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {/* Camera Tab Content */}
          {activeTab === "camera" && (
            <motion.div
              key="camera-tab"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="h-full p-3 sm:p-6 pb-24 md:pb-6"
            >
              <div className="max-w-6xl mx-auto h-full relative camera-container swiss-panel">
                {/* Add Item Button - Camera View */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleOpenAddItem}
                  className="absolute top-3 right-3 sm:top-4 sm:right-4 z-30 flex items-center gap-2 px-4 py-3 swiss-button-secondary text-xs"
                  aria-label="Add manual item"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">{copy.common.addItem}</span>
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
          {activeTab === "dashboard" && (
            <motion.div
              key="dashboard-tab"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="h-full overflow-y-auto p-3 sm:p-6 pb-24 md:pb-6"
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
                  detectedItems={detectedItemsList}
                  manualItems={manualItems}
                  policyType={policyType}
                  onItemClick={(item) => setSelectedItem(item.id)}
                />

                <QuotePacketCard
                  detectedItems={detectedItemsList}
                  manualItems={manualItems}
                  policyType={policyType}
                  language={language}
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
                            ({manualItems.length} item{manualItems.length !== 1 ? "s" : ""})
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
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Detail Modal */}
      <DetailModal
        isOpen={!!selectedItemId}
        onClose={handleCloseDetailModal}
        item={detailModalItem}
        policyType={policyType}
      />

      {/* Add Item Form Modal */}
      <AddItemForm isOpen={isAddItemFormOpen} onClose={handleCloseAddItem} editItem={editItem} />

      {/* Quote Handoff Modal */}
      <QuoteHandoffModal isOpen={isQuoteHandoffOpen} onClose={handleCloseQuoteHandoff} />
    </div>
  );
}

export default App;
