import type {
  CoverageRecommendation,
  DetectedItem,
  HazardWarning,
  ItemBreakdown,
  ManualItem,
  PolicyType,
} from "@/types";
import { simulateDisaster } from "@/utils/disasterSimulator";
import { createItemBreakdown, getUpgradeRecommendations } from "@/utils/valueCalculator";

interface RecommendationArgs {
  detectedItems: DetectedItem[];
  manualItems: ManualItem[];
  policyType: PolicyType;
  hazards?: HazardWarning[];
}

const SCHEDULED_VALUABLE_CATEGORIES = [
  "jewelry",
  "bicycle",
  "furs",
  "art_collectibles",
  "musical_instruments",
];

function hasCategory(items: ItemBreakdown[], category: string): boolean {
  return items.some((item) => item.category.toLowerCase() === category);
}

function calculateExposureReductionPercent(current: number, improved: number): number {
  if (current <= 0) return 0;
  return Math.max(0, Math.round(((current - improved) / current) * 100));
}

export function getCoverageRecommendations({
  detectedItems,
  manualItems,
  policyType,
  hazards = [],
}: RecommendationArgs): CoverageRecommendation[] {
  const breakdown = createItemBreakdown(detectedItems, manualItems, policyType);

  if (breakdown.length === 0) {
    return [];
  }

  const recommendations: CoverageRecommendation[] = [];
  const seen = new Set<string>();
  const uncoveredItems = breakdown.filter((item) => item.status !== "covered");
  const uncoveredValue = uncoveredItems.reduce((sum, item) => sum + item.estimatedValue, 0);
  const hasScheduledValuablesExposure =
    uncoveredItems.some((item) =>
      SCHEDULED_VALUABLE_CATEGORIES.includes(item.category.toLowerCase()),
    ) ||
    manualItems.some((item) => SCHEDULED_VALUABLE_CATEGORIES.includes(item.category.toLowerCase()));

  const pushRecommendation = (recommendation: CoverageRecommendation): void => {
    if (seen.has(recommendation.id)) return;
    seen.add(recommendation.id);
    recommendations.push(recommendation);
  };

  const fireSimulation = simulateDisaster({
    disasterType: "fire",
    detectedItems,
    manualItems,
    policyType,
  });

  if (policyType === "none") {
    pushRecommendation({
      id: "coverage-get-insured",
      title: "Start with renter's coverage now",
      description:
        "You currently have no household protection. A basic policy would sharply reduce direct replacement losses.",
      priority: "high",
      estimatedMonthlyCost: 17,
      exposureReductionPercent: calculateExposureReductionPercent(
        fireSimulation.currentPolicyOutOfPocket,
        fireSimulation.recommendedPolicyOutOfPocket,
      ),
    });
  }

  if (uncoveredValue >= 5000) {
    pushRecommendation({
      id: "coverage-increase-property-limit",
      title: "Increase personal property protection",
      description: `You have about $${Math.round(uncoveredValue).toLocaleString()} in uncovered or partially covered belongings. A higher limit would reduce replacement exposure.`,
      priority: "high",
      estimatedMonthlyCost: 12,
      exposureReductionPercent: calculateExposureReductionPercent(
        fireSimulation.currentPolicyOutOfPocket,
        fireSimulation.recommendedPolicyOutOfPocket,
      ),
    });
  }

  if (hasScheduledValuablesExposure) {
    pushRecommendation({
      id: "coverage-schedule-valuables",
      title: "Schedule high-value valuables separately",
      description:
        "Items like jewelry, bikes, collectibles, and specialty gear often hit sub-limits. Scheduled coverage is a targeted fix.",
      priority: "high",
      estimatedMonthlyCost: 9,
    });
  }

  if (hazards.some((hazard) => !hazard.positive)) {
    pushRecommendation({
      id: "prevention-reduce-hazard-risk",
      title: "Reduce visible household hazards",
      description:
        "Prevention matters as much as coverage. Visible fire-risk patterns increase claim probability and loss severity.",
      priority: "medium",
      estimatedMonthlyCost: 5,
    });
  }

  if (hasCategory(uncoveredItems, "car") || hasCategory(uncoveredItems, "motorcycle")) {
    pushRecommendation({
      id: "coverage-add-auto",
      title: "Separate vehicle coverage from home contents",
      description:
        "Vehicles are not protected by renters coverage. Add or improve auto coverage so major assets are not excluded.",
      priority: "medium",
      estimatedMonthlyCost: 28,
    });
  }

  for (const textRecommendation of getUpgradeRecommendations(breakdown, policyType).slice(0, 3)) {
    pushRecommendation({
      id: `coverage-rule-${textRecommendation.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      title: "Policy action",
      description: textRecommendation,
      priority: "low",
    });
  }

  return recommendations.slice(0, 5);
}
