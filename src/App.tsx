import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, Package, Plus, Shield } from "lucide-react";
import { type ReactElement, useState } from "react";
import { AddItemForm, ManualItemsList } from "./components/AddItemForm/AddItemForm";
import { CameraView } from "./components/CameraView/CameraView";
import { Dashboard } from "./components/Dashboard/Dashboard";
import { DetailModal } from "./components/DetailModal/DetailModal";
import { OnboardingFlow } from "./components/OnboardingFlow/OnboardingFlow";
import { PolicySelector } from "./components/PolicySelector/PolicySelector";
import { SwissButton } from "./components/Swiss";
import { TabNavigation } from "./components/TabNavigation/TabNavigation";
import { useAppContext } from "./context/AppContext";
import { useGemini } from "./hooks/useGemini";
import type { ManualItem } from "./types";

function App(): ReactElement {
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
  } = useAppContext();

  const gemini = useGemini();
  const [, setCameraError] = useState<Error | string | null>(null);
  const [isAddItemFormOpen, setIsAddItemFormOpen] = useState<boolean>(false);
  const [editItem, setEditItem] = useState<ManualItem | null>(null);

  const handleManualMode = (): void => enableManualMode();
  const handleEnableCamera = (): void => disableManualMode();

  const selectedItem = selectedItemId
    ? detectedItems.get(selectedItemId) || manualItems.find((item) => item.id === selectedItemId)
    : null;

  const detailModalItem =
    selectedItem && selectedItemId
      ? {
          ...selectedItem,
          source: (detectedItems.has(selectedItemId) ? "camera" : "dashboard") as
            | "camera"
            | "dashboard",
        }
      : null;

  const handleCloseDetailModal = (): void => setSelectedItem(null);
  const handleOpenAddItem = (): void => {
    setEditItem(null);
    setIsAddItemFormOpen(true);
  };
  const handleEditItem = (item: ManualItem): void => {
    setEditItem(item);
    setIsAddItemFormOpen(true);
  };
  const handleRemoveItem = (item: ManualItem): void => {
    if (confirm(`Remove "${item.name}"?`)) removeManualItem(item.id);
  };
  const handleCloseAddItem = (): void => {
    setIsAddItemFormOpen(false);
    setEditItem(null);
  };

  if (!onboardingComplete) {
    return <OnboardingFlow onComplete={() => {}} />;
  }

  return (
    <div className="min-h-screen bg-swiss flex flex-col overflow-x-hidden">
      {/* Manual Mode Banner — Swiss Style */}
      <AnimatePresence>
        {manualModeEnabled && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-swiss-fg text-swiss-bg px-4 py-3 text-center border-b-2 border-swiss-accent"
          >
            <span className="font-bold uppercase tracking-widest text-sm">Manual Mode Active</span>
            <span className="mx-2 text-swiss-accent">—</span>
            <span className="text-sm">Camera disabled.</span>
            <button
              onClick={handleEnableCamera}
              className="ml-3 underline hover:text-swiss-accent uppercase text-sm font-bold"
            >
              Enable Camera
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header — Swiss Style */}
      <header className="bg-swiss border-b-4 border-swiss-fg px-6 py-5 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-swiss-fg border-2 border-swiss-fg flex items-center justify-center">
              <Shield className="w-7 h-7 text-swiss-bg" />
            </div>
            <h1 className="text-2xl font-black text-swiss-fg uppercase tracking-tight">
              InsureScope
            </h1>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            <AnimatePresence>
              {gemini && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="hidden md:flex items-center gap-2 px-4 py-2 bg-swiss-fg text-swiss-bg border-2 border-swiss-fg uppercase font-bold text-sm tracking-widest hover:bg-swiss-accent hover:border-swiss-accent transition-colors duration-200"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Ask</span>
                </motion.button>
              )}
            </AnimatePresence>
            <PolicySelector
              variant="compact"
              detectedItems={Array.from(detectedItems?.values() || [])}
              manualItems={manualItems}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {activeTab === "camera" && (
            <motion.div
              key="camera-tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-full p-4 pb-24 md:pb-4"
            >
              <div className="max-w-6xl mx-auto h-full relative">
                <SwissButton
                  onClick={handleOpenAddItem}
                  variant="secondary"
                  className="absolute top-4 right-4 z-30"
                >
                  <Plus className="w-4 h-4" />
                  Add Item
                </SwissButton>
                <CameraView
                  onError={setCameraError}
                  onManualMode={handleManualMode}
                  onItemClick={(item) => setSelectedItem(item.id)}
                />
              </div>
            </motion.div>
          )}

          {activeTab === "dashboard" && (
            <motion.div
              key="dashboard-tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-full overflow-y-auto p-4 pb-24 md:pb-4"
            >
              <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex items-center justify-between border-b-2 border-swiss-fg pb-4">
                  <h2 className="text-xl font-black text-swiss-fg uppercase tracking-widest flex items-center gap-2">
                    <Package className="w-6 h-6" />
                    Your Items
                  </h2>
                  <SwissButton onClick={handleOpenAddItem} variant="accent">
                    <Plus className="w-4 h-4" />
                    Add Item
                  </SwissButton>
                </div>

                <Dashboard
                  detectedItems={Array.from(detectedItems?.values() || [])}
                  manualItems={manualItems}
                  policyType={policyType}
                  onItemClick={(item) => setSelectedItem(item.id)}
                />

                <AnimatePresence>
                  {manualItems.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="border-2 border-swiss-fg bg-swiss-muted swiss-grid-pattern"
                    >
                      <div className="px-6 py-4 border-b-2 border-swiss-fg bg-swiss-fg text-swiss-bg">
                        <h3 className="font-black uppercase tracking-widest flex items-center gap-2">
                          <Package className="w-5 h-5" />
                          Manual Items
                          <span className="text-sm font-normal ml-2">({manualItems.length})</span>
                        </h3>
                      </div>
                      <div className="p-6">
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

      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      <DetailModal
        isOpen={!!selectedItemId}
        onClose={handleCloseDetailModal}
        item={detailModalItem}
        policyType={policyType}
      />
      <AddItemForm isOpen={isAddItemFormOpen} onClose={handleCloseAddItem} editItem={editItem} />
    </div>
  );
}

export default App;
