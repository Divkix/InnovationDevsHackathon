import { AnimatePresence, motion } from "framer-motion";
import { Droplets, Flame, Package, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactElement } from "react";
import type { DisasterSimulationResult, DisasterType } from "@/types";
import { formatCurrency } from "@/utils/valueCalculator";

const DISASTER_TYPES: DisasterType[] = ["fire", "theft", "flood", "earthquake"];

interface DisasterConfig {
  label: string;
  Icon: LucideIcon;
  selectedBg: string;
  description: string;
}

const DISASTER_CONFIG: Record<DisasterType, DisasterConfig> = {
  fire: {
    label: "Fire",
    Icon: Flame,
    selectedBg: "bg-swiss-accent",
    description: "Structure, contents, smoke damage",
  },
  theft: {
    label: "Theft",
    Icon: Package,
    selectedBg: "bg-swiss-fg",
    description: "Burglary, robbery, mysterious disappearance",
  },
  flood: {
    label: "Flood",
    Icon: Droplets,
    selectedBg: "bg-swiss-fg",
    description: "Water intrusion, sewer backup",
  },
  earthquake: {
    label: "Earthquake",
    Icon: Zap,
    selectedBg: "bg-swiss-fg",
    description: "Structural damage, aftershock losses",
  },
};

export interface DisasterSimulatorProps {
  result: DisasterSimulationResult | null;
  selectedType: DisasterType | null;
  onSelectType: (type: DisasterType | null) => void;
}

export function DisasterSimulator({
  result,
  selectedType,
  onSelectType,
}: DisasterSimulatorProps): ReactElement {
  const selectedConfig = selectedType ? DISASTER_CONFIG[selectedType] : null;
  const SelectedIcon = selectedConfig?.Icon ?? null;

  return (
    <div className="border-2 border-swiss-fg bg-swiss w-full">
      {/* PILL SELECTOR SECTION */}
      <div className="px-6 py-5 border-b-2 border-swiss-fg">
        <p className="text-xs uppercase tracking-widest text-swiss-fg/50 mb-3 font-bold">
          Simulate Disaster Type
        </p>
        <div className="flex flex-wrap gap-2">
          {DISASTER_TYPES.map((type) => {
            const config = DISASTER_CONFIG[type];
            const isSelected = selectedType === type;
            const { Icon } = config;
            return (
              <motion.button
                key={type}
                whileTap={{ scale: 0.97 }}
                onClick={() => onSelectType(isSelected ? null : type)}
                aria-pressed={isSelected}
                className={`flex items-center gap-2 px-4 py-3 border-2 font-bold uppercase tracking-wider text-sm swiss-touch-target transition-colors duration-200 ${
                  isSelected
                    ? `${config.selectedBg} text-swiss-bg border-transparent`
                    : "bg-swiss text-swiss-fg border-swiss-fg hover:bg-swiss-muted"
                }`}
              >
                <Icon className="w-4 h-4" />
                {config.label}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ANIMATED RESULTS PANEL */}
      <AnimatePresence mode="wait">
        {!selectedType && (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-8 text-center swiss-dots"
          >
            <p className="text-swiss-fg/40 uppercase tracking-widest text-sm font-bold">
              Select a disaster type above to simulate impact on your coverage
            </p>
          </motion.div>
        )}

        {selectedType && (!result || result.type !== selectedType) && (
          <motion.div
            key={`pending-${selectedType}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-6 space-y-3"
          >
            <div className="flex items-center gap-3">
              {SelectedIcon && (
                <SelectedIcon className="w-5 h-5 text-swiss-fg" />
              )}
              <p className="text-sm text-swiss-fg/70">
                {selectedConfig?.description}
              </p>
            </div>
            <p className="text-swiss-fg/40 italic text-sm">
              Simulation will run once items are detected...
            </p>
          </motion.div>
        )}

        {selectedType && result && result.type === selectedType && (
          <motion.div
            key={`result-${selectedType}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-6 space-y-5"
          >
            {/* TOP STAT GRID */}
            <div className="grid grid-cols-2 border-2 border-swiss-fg">
              <div className="p-6 border-r-2 border-swiss-fg">
                <p className="text-xs uppercase tracking-widest font-bold text-swiss-fg/50 mb-1">
                  Total Loss
                </p>
                <p className="text-3xl font-black text-swiss-fg">
                  {formatCurrency(result.totalLoss)}
                </p>
              </div>
              <div className="p-6 bg-swiss-accent text-swiss-bg">
                <p className="text-xs uppercase tracking-widest font-black text-swiss-bg/80 mb-1">
                  Your Out-of-Pocket
                </p>
                <p className="text-3xl font-black text-swiss-bg">
                  {formatCurrency(result.currentPolicyOutOfPocket)}
                </p>
              </div>
            </div>

            {/* SAVINGS ROW */}
            {result.recommendedPolicyOutOfPocket <
              result.currentPolicyOutOfPocket && (
              <div className="flex items-center justify-between p-4 border-2 border-swiss-fg bg-swiss-muted">
                <div>
                  <p className="text-xs uppercase tracking-widest font-bold text-swiss-fg/50">
                    With Recommended Policy
                  </p>
                  <p className="text-xl font-black text-swiss-fg">
                    {formatCurrency(result.recommendedPolicyOutOfPocket)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wider font-bold text-swiss-fg/50">
                    You Save
                  </p>
                  <p className="text-xl font-black text-swiss-fg">
                    {formatCurrency(
                      result.currentPolicyOutOfPocket -
                        result.recommendedPolicyOutOfPocket
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* UNCOVERED ITEMS */}
            {result.uncoveredItems > 0 && (
              <div className="flex items-center gap-3 p-3 border-l-4 border-swiss-accent bg-swiss-muted">
                <span className="font-black text-swiss-accent text-2xl">
                  {result.uncoveredItems}
                </span>
                <p className="text-sm text-swiss-fg font-bold uppercase tracking-wider">
                  {`item${result.uncoveredItems !== 1 ? "s" : ""} not covered under current policy`}
                </p>
              </div>
            )}

            {/* INSIGHT */}
            <div className="p-4 bg-swiss-muted border-2 border-swiss-fg/20">
              <p className="text-xs uppercase tracking-widest font-bold text-swiss-fg/50 mb-1">
                Analysis
              </p>
              <p className="text-sm text-swiss-fg/80">{result.insight}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default DisasterSimulator;
