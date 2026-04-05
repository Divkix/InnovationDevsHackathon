import { motion, useSpring, useTransform } from "framer-motion";
import { AlertTriangle, CheckCircle, DollarSign, Shield, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { calculateValues, formatCurrency, formatPercentage, getUpgradeRecommendations } from "@/utils/valueCalculator";
import type { CoverageStatus, DashboardProps, ItemBreakdown } from "../../types";

interface AnimatedNumberProps {
  value: number;
  formatter: (value: number) => string;
}

function AnimatedNumber({ value, formatter }: AnimatedNumberProps) {
  const spring = useSpring(value, { stiffness: 100, damping: 20 });
  useEffect(() => { spring.set(value); }, [value, spring]);
  const display = useTransform(spring, (current) => formatter(current));
  const [displayValue, setDisplayValue] = useState(formatter(value));
  useEffect(() => {
    const unsubscribe = display.on("change", (latest) => setDisplayValue(latest));
    return () => unsubscribe();
  }, [display]);
  return <span>{displayValue}</span>;
}

export function Dashboard({ detectedItems = [], manualItems = [], policyType = "renters", onItemClick }: DashboardProps) {
  const calculationResult = useMemo(() => {
    const safeDetectedItems = Array.isArray(detectedItems) ? detectedItems : [];
    const safeManualItems = Array.isArray(manualItems) ? manualItems : [];
    return calculateValues(safeDetectedItems, safeManualItems, policyType || "renters");
  }, [detectedItems, manualItems, policyType]);

  const recommendations = useMemo(() =>
    getUpgradeRecommendations(calculationResult.items, policyType),
    [calculationResult.items, policyType]
  );

  const { totalValue, protectedValue, unprotectedValue, coverageGapPercentage, items } = calculationResult;
  const allCovered = items.length > 0 && unprotectedValue === 0;
  const hasItems = items.length > 0;
  const hasRecommendations = recommendations.length > 0;

  const statusColors: Record<CoverageStatus, { bg: string; text: string; border: string }> = {
    covered: { bg: "bg-swiss-fg", text: "text-swiss-bg", border: "border-swiss-fg" },
    conditional: { bg: "bg-swiss", text: "text-swiss-fg", border: "border-swiss-fg" },
    not_covered: { bg: "bg-swiss-accent", text: "text-swiss-bg", border: "border-swiss-accent" },
  };

  const statusLabels: Record<CoverageStatus, string> = {
    covered: "Covered",
    conditional: "Conditional",
    not_covered: "Not Covered",
  };

  return (
    <div data-testid="dashboard-container" className="w-full h-full bg-swiss overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-swiss-fg pb-4">
          <h2 className="text-2xl font-black text-swiss-fg uppercase tracking-widest">
            Financial Summary
          </h2>
          <div className="flex items-center gap-2 text-sm">
            <Shield className="w-5 h-5" />
            <span className="uppercase tracking-widest font-bold">
              {policyType === "none" ? "No Insurance" : `${policyType}'s Insurance`}
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-2 border-swiss-fg">
          {/* Total Value */}
          <div className="p-6 border-b-2 sm:border-b-0 sm:border-r-2 border-swiss-fg bg-swiss">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-swiss-fg/60" />
              <span className="text-xs font-bold uppercase tracking-widest text-swiss-fg/60">
                Total Value
              </span>
            </div>
            <p className="text-3xl font-black text-swiss-fg">
              <AnimatedNumber value={totalValue} formatter={formatCurrency} />
            </p>
          </div>

          {/* Protected Value */}
          <div className="p-6 border-b-2 lg:border-b-0 lg:border-r-2 border-swiss-fg bg-swiss">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-swiss-fg" />
              <span className="text-xs font-bold uppercase tracking-widest text-swiss-fg/60">
                Protected
              </span>
            </div>
            <p className="text-3xl font-black text-swiss-fg">
              <AnimatedNumber value={protectedValue} formatter={formatCurrency} />
            </p>
          </div>

          {/* Unprotected Value — MOST PROMINENT */}
          <div
            data-testid="unprotected-section"
            className="p-6 bg-swiss-accent text-swiss-bg sm:col-span-2 lg:col-span-1 border-b-2 lg:border-b-0 lg:border-r-2 border-swiss-fg"
          >
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-swiss-bg/80" />
              <span className="text-xs font-black uppercase tracking-widest text-swiss-bg/80">
                Unprotected
              </span>
            </div>
            <p className="text-5xl font-black text-swiss-bg tracking-tight">
              <AnimatedNumber value={unprotectedValue} formatter={formatCurrency} />
            </p>
          </div>

          {/* Coverage Gap */}
          <div className="p-6 bg-swiss sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-swiss-fg/60" />
              <span className="text-xs font-bold uppercase tracking-widest text-swiss-fg/60">
                Coverage Gap
              </span>
            </div>
            <p className="text-3xl font-black text-swiss-fg">
              <AnimatedNumber value={coverageGapPercentage} formatter={(v) => formatPercentage(v)} />
            </p>
          </div>
        </div>

        {/* Empty State */}
        {!hasItems && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-2 border-swiss-fg p-12 text-center swiss-dots"
          >
            <div className="flex justify-center mb-4">
              <div className="border-2 border-swiss-fg p-4">
                <DollarSign className="w-8 h-8 text-swiss-fg" />
              </div>
            </div>
            <h3 className="text-xl font-black text-swiss-fg uppercase tracking-widest mb-2">
              No Items Detected
            </h3>
            <p className="text-swiss-fg/70 max-w-md mx-auto">
              Point your camera at objects to begin scanning. Detected items will appear here.
            </p>
          </motion.div>
        )}

        {/* All Covered Message */}
        {allCovered && hasItems && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="border-2 border-swiss-fg p-6 bg-swiss-fg text-swiss-bg"
          >
            <div className="flex items-center gap-4">
              <div className="border-2 border-swiss-bg p-2">
                <CheckCircle className="w-6 h-6 text-swiss-bg" />
              </div>
              <div>
                <h3 className="font-black uppercase tracking-widest text-lg">
                  All items fully covered
                </h3>
                <p className="text-swiss-bg/80">
                  Your current insurance policy protects all detected items.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Item Breakdown Table */}
        {hasItems && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-2 border-swiss-fg"
          >
            <div className="px-6 py-4 border-b-2 border-swiss-fg bg-swiss-muted swiss-grid-pattern">
              <h3 className="font-black uppercase tracking-widest text-swiss-fg">Item Breakdown</h3>
            </div>
            <div>
              {items.map((item: ItemBreakdown, index: number) => {
                const colors = statusColors[item.status];
                return (
                  <motion.button
                    key={item.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    data-testid="item-row"
                    onClick={() => onItemClick?.(item)}
                    className="w-full px-6 py-4 flex items-center justify-between border-b border-swiss-fg/20 hover:bg-swiss-muted transition-colors text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 ${colors.bg} ${item.status === 'conditional' ? 'border-2 border-swiss-fg' : ''}`} />
                      <div>
                        <p className="font-bold text-swiss-fg capitalize">{item.category}</p>
                        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${colors.text}`}>
                          {statusLabels[item.status]}
                        </span>
                      </div>
                    </div>
                    <p className="font-black text-swiss-fg text-lg">{formatCurrency(item.estimatedValue)}</p>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Recommendations */}
        {hasRecommendations && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-2 border-swiss-accent"
          >
            <div className="px-6 py-4 border-b-2 border-swiss-accent bg-swiss-accent text-swiss-bg">
              <h3 className="font-black uppercase tracking-widest flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Recommendations
              </h3>
            </div>
            <div className="p-6 swiss-diagonal">
              <ul className="space-y-4">
                {recommendations.map((recommendation: string, index: number) => (
                  <motion.li
                    key={recommendation}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    <span className="inline-flex items-center justify-center w-8 h-8 bg-swiss-fg text-swiss-bg font-black text-sm shrink-0">
                      {index + 1}
                    </span>
                    <span className="text-swiss-fg font-medium">{recommendation}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
