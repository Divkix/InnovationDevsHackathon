import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";
import type { ReactElement } from "react";
import type { CoverageRecommendation } from "@/types";

export interface RecommendationCardsProps {
  recommendations: CoverageRecommendation[];
}

const MAX_DISPLAY = 3;

export function RecommendationCards({ recommendations }: RecommendationCardsProps): ReactElement {
  return (
    <div className="w-full space-y-3">
      {recommendations.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-8 border-2 border-swiss-fg swiss-diagonal text-center"
        >
          <div className="flex justify-center mb-4">
            <div className="border-2 border-swiss-fg p-3">
              <TrendingUp className="w-6 h-6 text-swiss-fg/40" />
            </div>
          </div>
          <p className="text-swiss-fg/50 text-sm max-w-xs mx-auto">
            Add items via camera or manually, then run the disaster simulator to receive personalized recommendations.
          </p>
        </motion.div>
      )}

      <AnimatePresence>
        {recommendations.slice(0, MAX_DISPLAY).map((rec, index) => {
          const hasFooter =
            rec.exposureReductionPercent !== undefined || rec.estimatedMonthlyCost !== undefined;

          return (
            <motion.div
              key={rec.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ delay: index * 0.08 }}
              className="border-2 border-swiss-fg bg-swiss"
            >
              <div
                className={`px-5 py-4 flex items-start justify-between gap-4${hasFooter ? " border-b border-swiss-fg/10" : ""}`}
              >
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-swiss-fg uppercase tracking-wide text-sm leading-snug">
                    {rec.title}
                  </h4>
                  <p className="text-sm text-swiss-fg/70 mt-1 leading-relaxed">
                    {rec.description}
                  </p>
                </div>

                <span
                  className={`shrink-0 text-xs font-black uppercase tracking-widest px-2 py-1 ${
                    rec.priority === "high"
                      ? "bg-swiss-accent text-swiss-bg"
                      : rec.priority === "medium"
                        ? "bg-swiss-fg text-swiss-bg"
                        : "border-2 border-swiss-fg text-swiss-fg bg-swiss"
                  }`}
                >
                  {rec.priority}
                </span>
              </div>

              {hasFooter && (
                <div className="px-5 py-3 flex items-center gap-4 bg-swiss-muted border-t border-swiss-fg/10">
                  {rec.exposureReductionPercent !== undefined && (
                    <div className="flex items-center gap-1.5">
                      <TrendingDown className="w-4 h-4 text-swiss-fg" />
                      <span className="text-xs font-black text-swiss-fg">
                        {rec.exposureReductionPercent}%
                      </span>
                      <span className="text-xs text-swiss-fg/50 uppercase tracking-wider">
                        less exposure
                      </span>
                    </div>
                  )}

                  {rec.estimatedMonthlyCost !== undefined && (
                    <div className="flex items-center gap-1.5 ml-auto">
                      <span className="text-xs text-swiss-fg/50 uppercase tracking-wider">
                        from
                      </span>
                      <span className="text-xs font-black text-swiss-fg">
                        ${rec.estimatedMonthlyCost}/mo
                      </span>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>

      {recommendations.length > MAX_DISPLAY && (
        <div className="flex items-center gap-2 px-4 py-3 border border-swiss-fg/20 bg-swiss-muted">
          <ArrowRight className="w-4 h-4 text-swiss-fg/40" />
          <p className="text-xs text-swiss-fg/50 uppercase tracking-wider font-bold">
            {`+${recommendations.length - MAX_DISPLAY} more recommendation${recommendations.length - MAX_DISPLAY !== 1 ? "s" : ""} available`}
          </p>
        </div>
      )}
    </div>
  );
}

export default RecommendationCards;
