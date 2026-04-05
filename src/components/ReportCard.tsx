import { motion } from "framer-motion";
import { AlertTriangle, Shield, TrendingUp } from "lucide-react";
import type { ReactElement } from "react";
import type { ItemBreakdown, PolicyType } from "@/types";
import { formatCurrency, formatPercentage } from "@/utils/valueCalculator";

export interface ReportCardProps {
  totalValue: number;
  protectedValue: number;
  coverageGapPercentage: number;
  items: ItemBreakdown[];
  policyType: PolicyType;
  topActions?: string[];
}

type LetterGrade = "A" | "B" | "C" | "D" | "F";

interface GradeConfig {
  grade: LetterGrade;
  label: string;
  gradeTextClass: string;
  bgClass: string;
  description: string;
}

function computeGrade(coverageGapPercentage: number, policyType: PolicyType): GradeConfig {
  if (policyType === "none") {
    return { grade: "F", label: "No Insurance", gradeTextClass: "text-swiss-bg", bgClass: "bg-swiss-accent", description: "Zero protection — all assets exposed" };
  }
  if (coverageGapPercentage > 75) {
    return { grade: "F", label: "Critical Gap", gradeTextClass: "text-swiss-bg", bgClass: "bg-swiss-accent", description: "Majority of assets unprotected" };
  }
  if (coverageGapPercentage > 50) {
    return { grade: "D", label: "Severe Gap", gradeTextClass: "text-swiss-bg", bgClass: "bg-swiss-fg", description: "More than half your assets exposed" };
  }
  if (coverageGapPercentage > 25) {
    return { grade: "C", label: "Moderate Gap", gradeTextClass: "text-swiss-fg", bgClass: "bg-swiss-muted", description: "Significant coverage gaps remain" };
  }
  if (coverageGapPercentage > 10) {
    return { grade: "B", label: "Minor Gap", gradeTextClass: "text-swiss-fg", bgClass: "bg-swiss-muted", description: "Most assets protected" };
  }
  return { grade: "A", label: "Well Protected", gradeTextClass: "text-swiss-fg", bgClass: "bg-swiss", description: "Excellent coverage ratio" };
}

function computeTopGaps(items: ItemBreakdown[]): ItemBreakdown[] {
  return items
    .filter((item) => item.status === "not_covered" || item.status === "conditional")
    .sort((a, b) => b.estimatedValue - a.estimatedValue)
    .slice(0, 3);
}

function resolveActions(topActions: string[] | undefined, topGaps: ItemBreakdown[]): string[] {
  if (topActions && topActions.length > 0) return topActions.slice(0, 3);
  return topGaps.map(
    (item) => `Review coverage for ${item.category} (${formatCurrency(item.estimatedValue)} at risk)`
  );
}

export function ReportCard({
  totalValue,
  protectedValue,
  coverageGapPercentage,
  items,
  policyType,
  topActions,
}: ReportCardProps): ReactElement {
  const gradeConfig = computeGrade(coverageGapPercentage, policyType);
  const topGaps = computeTopGaps(items);
  const resolvedActions = resolveActions(topActions, topGaps);
  const unprotectedValue = totalValue - protectedValue;
  const protectedPercent = totalValue > 0 ? ((protectedValue / totalValue) * 100) : 0;

  return (
    <div className="border-2 border-swiss-fg bg-swiss w-full">

      {/* GRADE HEADER */}
      <div className="border-b-2 border-swiss-fg flex flex-col sm:flex-row">

        {/* LEFT: Giant grade box */}
        <div className={`flex items-center justify-center w-full sm:w-36 shrink-0 py-8 sm:py-0 border-b-2 sm:border-b-0 sm:border-r-2 border-swiss-fg ${gradeConfig.bgClass}`}>
          <motion.span
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className={`text-8xl font-black leading-none select-none ${gradeConfig.gradeTextClass}`}
            aria-label={`Coverage grade: ${gradeConfig.grade}`}
          >
            {gradeConfig.grade}
          </motion.span>
        </div>

        {/* RIGHT: Grade details + coverage bar */}
        <div className="flex-1 p-6 space-y-4">

          {/* Grade label + policy */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-black uppercase tracking-widest text-lg text-swiss-fg">
                {gradeConfig.label}
              </h3>
              <p className="text-sm text-swiss-fg/60 mt-0.5">{gradeConfig.description}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs uppercase tracking-widest font-bold text-swiss-fg/50 mb-1">Policy</p>
              <p className="font-bold text-swiss-fg capitalize">
                {policyType === "none" ? "No Insurance" : `${policyType}'s`}
              </p>
            </div>
          </div>

          {/* Coverage progress bar */}
          <div>
            <div className="flex justify-between text-xs uppercase tracking-widest font-bold text-swiss-fg/50 mb-1">
              <span>Protected</span>
              <span>{formatPercentage(protectedPercent)}</span>
            </div>
            <div className="h-3 w-full bg-swiss-muted border border-swiss-fg/20 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${protectedPercent}%` }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
                className="h-full bg-swiss-fg"
              />
            </div>
          </div>

        </div>
      </div>

      {/* SUMMARY STATS */}
      <div className="grid grid-cols-3 border-b-2 border-swiss-fg">

        {/* Total Assets */}
        <div className="p-4 border-r-2 border-swiss-fg">
          <p className="text-xs uppercase tracking-widest font-bold text-swiss-fg/50 mb-1">Total Assets</p>
          <p className="text-lg font-black text-swiss-fg">{formatCurrency(totalValue)}</p>
        </div>

        {/* Protected */}
        <div className="p-4 border-r-2 border-swiss-fg">
          <p className="text-xs uppercase tracking-widest font-bold text-swiss-fg/50 mb-1">Protected</p>
          <p className="text-lg font-black text-swiss-fg">{formatCurrency(protectedValue)}</p>
        </div>

        {/* Exposed */}
        <div className="p-4">
          <p className="text-xs uppercase tracking-widest font-bold text-swiss-fg/50 mb-1">Exposed</p>
          <p className={`text-lg font-black ${unprotectedValue > 0 ? "text-swiss-accent" : "text-swiss-fg"}`}>
            {formatCurrency(unprotectedValue)}
          </p>
        </div>

      </div>

      {/* TOP GAPS SECTION */}
      {topGaps.length > 0 && (
        <div className="border-b-2 border-swiss-fg">

          {/* Section header */}
          <div className="px-5 py-3 bg-swiss-muted border-b border-swiss-fg/20">
            <h4 className="text-xs uppercase tracking-widest font-black text-swiss-fg flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5" />
              Top Coverage Gaps
            </h4>
          </div>

          {/* Gap rows */}
          {topGaps.map((item, index) => (
            <div
              key={item.id}
              className="flex items-center justify-between px-5 py-3 border-b border-swiss-fg/10 last:border-0 border-l-4"
              style={{ borderLeftColor: item.status === "not_covered" ? "#FF3000" : "rgba(0,0,0,0.3)" }}
            >
              {/* Left */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-black text-swiss-fg/30">{`0${index + 1}`}</span>
                <div>
                  <p className="font-bold text-swiss-fg text-sm capitalize">{item.category}</p>
                  <span className={`text-xs uppercase tracking-wider font-bold ${
                    item.status === "not_covered" ? "text-swiss-accent" : "text-swiss-fg/60"
                  }`}>
                    {item.status === "not_covered" ? "Not Covered" : "Conditional"}
                  </span>
                </div>
              </div>

              {/* Right */}
              <p className="font-black text-swiss-fg">{formatCurrency(item.estimatedValue)}</p>
            </div>
          ))}

        </div>
      )}

      {/* TOP ACTIONS SECTION */}
      {resolvedActions.length > 0 && (
        <div>

          {/* Section header */}
          <div className="px-5 py-4 bg-swiss-fg text-swiss-bg">
            <h4 className="text-xs uppercase tracking-widest font-black flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Recommended Actions
            </h4>
          </div>

          {/* Action rows */}
          {resolvedActions.map((action, index) => (
            <div
              key={index}
              className="flex items-start gap-3 px-5 py-4 border-b border-swiss-fg/10 last:border-0 hover:bg-swiss-muted transition-colors duration-150"
            >
              <span className="shrink-0 inline-flex items-center justify-center w-6 h-6 bg-swiss-accent text-swiss-bg font-black text-xs">
                {index + 1}
              </span>
              <p className="text-sm text-swiss-fg">{action}</p>
            </div>
          ))}

        </div>
      )}

      {/* EMPTY STATE */}
      {items.length === 0 && (
        <div className="p-8 text-center swiss-dots border-t-2 border-swiss-fg">
          <Shield className="w-8 h-8 text-swiss-fg/20 mx-auto mb-3" />
          <p className="text-sm text-swiss-fg/40 uppercase tracking-widest font-bold">
            Scan or add items to generate your report
          </p>
        </div>
      )}

    </div>
  );
}

export default ReportCard;
