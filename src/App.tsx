import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, Package, Plus, Shield } from "lucide-react";
import { type ReactElement, useCallback, useState } from "react";
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
import type { DisasterType, ManualItem } from "./types";

function App(): ReactElement {
  const {
    policyType,
    activeTab,
    manualItems,
    detectedItems,
    selectedItemId,
    onboardingComplete,
    manualModeEnabled,
    privacyMode,
    activeSimulatorType,
    hazardWarnings,
    simulationResult,
    recommendations,
    removeManualItem,
    setActiveTab,
    setSelectedItem,
    enableManualMode,
    disableManualMode,
    setPrivacyMode,
    setActiveSimulatorType,
  } = useAppContext();

  const gemini = useGemini();
  const [, setCameraError] = useState<Error | string | null>(null);
  const [isAddItemFormOpen, setIsAddItemFormOpen] = useState<boolean>(false);
  const [editItem, setEditItem] = useState<ManualItem | null>(null);

  const handleManualMode = (): void => enableManualMode();
  const handleEnableCamera = (): void => disableManualMode();

  const handleSimulatorChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>): void => {
      setActiveSimulatorType((e.target.value as DisasterType) || null);
    },
    [setActiveSimulatorType],
  );

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

                {/* Hazard Warnings Section - owned by Matin */}
                <section
                  data-section="hazard-warnings"
                  data-owner="matin"
                  className="border-2 border-swiss-fg bg-swiss-muted swiss-grid-pattern"
                >
                  <div className="px-6 py-4 border-b-2 border-swiss-fg bg-swiss-fg text-swiss-bg">
                    <h3 className="font-black uppercase tracking-widest">Hazard Warnings</h3>
                  </div>
                  <div className="p-6">
                    {hazardWarnings.length > 0 ? (
                      <ul className="space-y-3">
                        {hazardWarnings.map((warning) => (
                          <li
                            key={warning.id}
                            className={`p-4 border-2 ${
                              warning.severity === 'high' ? 'border-red-500 bg-red-50' :
                              warning.severity === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                              'border-green-500 bg-green-50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold">{warning.title}</span>
                              <span className={`text-xs uppercase px-2 py-1 ${
                                warning.severity === 'high' ? 'bg-red-500 text-white' :
                                warning.severity === 'medium' ? 'bg-yellow-500 text-black' :
                                'bg-green-500 text-white'
                              }`}>{warning.severity}</span>
                            </div>
                            <p className="text-sm mt-2 text-swiss-fg/80">{warning.message}</p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-swiss-fg/60 italic">No hazards detected. Scan items to see warnings.</p>
                    )}
                  </div>
                </section>

                {/* Disaster Simulator Section - owned by Matin */}
                <section
                  data-section="disaster-simulator"
                  data-owner="matin"
                  className="border-2 border-swiss-fg bg-swiss-muted swiss-grid-pattern"
                >
                  <div className="px-6 py-4 border-b-2 border-swiss-fg bg-swiss-fg text-swiss-bg flex items-center justify-between">
                    <h3 className="font-black uppercase tracking-widest">Disaster Simulator</h3>
                    <select
                      value={activeSimulatorType || ''}
                      onChange={handleSimulatorChange}
                      className="bg-swiss-bg text-swiss-fg border-2 border-swiss-fg px-3 py-1 text-sm uppercase font-bold"
                    >
                      <option value="">Select disaster type...</option>
                      <option value="fire">Fire</option>
                      <option value="theft">Theft</option>
                      <option value="flood">Flood</option>
                      <option value="earthquake">Earthquake</option>
                    </select>
                  </div>
                  <div className="p-6">
                    {simulationResult ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 border-2 border-swiss-fg">
                            <div className="text-sm uppercase text-swiss-fg/60">Total Loss</div>
                            <div className="text-2xl font-black">${simulationResult.totalLoss.toLocaleString()}</div>
                          </div>
                          <div className="p-4 border-2 border-swiss-fg">
                            <div className="text-sm uppercase text-swiss-fg/60">Your Out-of-Pocket</div>
                            <div className="text-2xl font-black text-red-600">
                              ${simulationResult.currentPolicyOutOfPocket.toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <p className="text-sm text-swiss-fg/80">{simulationResult.insight}</p>
                      </div>
                    ) : (
                      <p className="text-swiss-fg/60 italic">
                        {activeSimulatorType
                          ? `Ready to simulate ${activeSimulatorType}. Integration pending Matin's implementation.`
                          : 'Select a disaster type to see potential impact on your coverage.'}
                      </p>
                    )}
                  </div>
                </section>

                {/* Recommendations Section - owned by Maitreyee */}
                <section
                  data-section="recommendations"
                  data-owner="maitreyee"
                  className="border-2 border-swiss-fg bg-swiss-muted swiss-grid-pattern"
                >
                  <div className="px-6 py-4 border-b-2 border-swiss-fg bg-swiss-fg text-swiss-bg">
                    <h3 className="font-black uppercase tracking-widest">Smart Recommendations</h3>
                  </div>
                  <div className="p-6">
                    {recommendations.length > 0 ? (
                      <ul className="space-y-4">
                        {recommendations.map((rec) => (
                          <li key={rec.id} className="p-4 border-2 border-swiss-fg bg-swiss">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-bold">{rec.title}</h4>
                                <p className="text-sm text-swiss-fg/80 mt-1">{rec.description}</p>
                              </div>
                              <span className={`text-xs uppercase px-2 py-1 ${
                                rec.priority === 'high' ? 'bg-swiss-accent text-swiss-bg' :
                                rec.priority === 'medium' ? 'bg-swiss-fg text-swiss-bg' :
                                'bg-swiss-fg/30 text-swiss-fg'
                              }`}>{rec.priority}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-swiss-fg/60 italic">
                        No recommendations yet. Add more items or run disaster simulation to see personalized suggestions.
                      </p>
                    )}
                  </div>
                </section>

                {/* Privacy Mode Toggle - owned by Maitreyee */}
                <section
                  data-section="privacy-mode"
                  data-owner="maitreyee"
                  className="border-2 border-swiss-accent bg-swiss-muted"
                >
                  <div className="px-6 py-4 border-b-2 border-swiss-accent bg-swiss-accent text-swiss-bg flex items-center justify-between">
                    <h3 className="font-black uppercase tracking-widest flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      Zero Documentation Mode
                    </h3>
                    <button
                      onClick={() => setPrivacyMode(!privacyMode.enabled)}
                      className={`px-4 py-2 uppercase font-bold text-sm border-2 ${
                        privacyMode.enabled
                          ? 'bg-swiss-bg text-swiss-accent border-swiss-bg'
                          : 'bg-swiss-accent text-swiss-bg border-swiss-bg'
                      }`}
                    >
                      {privacyMode.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                  <div className="p-6">
                    <p className="text-swiss-fg/80">{privacyMode.localOnlyMessage}</p>
                    {privacyMode.enabled && (
                      <div className="mt-4 p-3 bg-swiss-accent/10 border border-swiss-accent">
                        <p className="text-sm text-swiss-accent font-bold uppercase">
                          Privacy mode active — all AI processing runs locally in your browser
                        </p>
                      </div>
                    )}
                  </div>
                </section>

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
