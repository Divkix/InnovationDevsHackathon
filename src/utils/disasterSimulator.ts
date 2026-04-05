import type {
  DetectedItem,
  DisasterSimulationResult,
  DisasterType,
  ItemBreakdown,
  ManualItem,
  PolicyType,
} from "@/types";
import { createItemBreakdown } from "@/utils/valueCalculator";

interface SimulationArgs {
  disasterType: DisasterType;
  detectedItems: DetectedItem[];
  manualItems: ManualItem[];
  policyType: PolicyType;
}

function roundCurrency(value: number): number {
  return Math.round(value);
}

function getLossRate(disasterType: DisasterType, item: ItemBreakdown): number {
  const category = item.category.toLowerCase();
  const electronics = [
    "laptop",
    "tv",
    "cell phone",
    "mouse",
    "keyboard",
    "remote",
    "cameras",
    "gaming_equipment",
  ];
  const theftTargets = [
    "laptop",
    "tv",
    "cell phone",
    "bicycle",
    "handbag",
    "backpack",
    "jewelry",
    "cameras",
  ];
  const floodTargets = [
    "couch",
    "bed",
    "chair",
    "dining table",
    "refrigerator",
    "microwave",
    "oven",
  ];

  switch (disasterType) {
    case "fire":
      return 0.9;
    case "theft":
      if (theftTargets.includes(category)) return 0.85;
      if (electronics.includes(category)) return 0.7;
      return 0.2;
    case "flood":
      if (floodTargets.includes(category) || electronics.includes(category)) return 0.65;
      return 0.25;
    case "earthquake":
      if (electronics.includes(category)) return 0.55;
      return 0.4;
    default:
      return 0.4;
  }
}

function getCurrentCoverageRate(item: ItemBreakdown): number {
  switch (item.status) {
    case "covered":
      return 0.8;
    case "conditional":
      return 0.45;
    default:
      return 0;
  }
}

function getRecommendedCoverageRate(item: ItemBreakdown): number {
  switch (item.status) {
    case "covered":
      return 0.9;
    case "conditional":
      return 0.85;
    default:
      return 0.75;
  }
}

function buildInsight(
  disasterType: DisasterType,
  currentPolicyOutOfPocket: number,
  recommendedPolicyOutOfPocket: number,
): string {
  const reduction =
    currentPolicyOutOfPocket <= 0
      ? 0
      : Math.round(
          ((currentPolicyOutOfPocket - recommendedPolicyOutOfPocket) / currentPolicyOutOfPocket) *
            100,
        );

  if (disasterType === "fire") {
    return `A fire scenario can wipe out most room contents quickly. Stronger coverage could cut out-of-pocket loss by about ${Math.max(reduction, 0)}%.`;
  }

  if (disasterType === "theft") {
    return `Theft hits portable valuables first. Better protection could reduce direct replacement burden by about ${Math.max(reduction, 0)}%.`;
  }

  if (disasterType === "flood") {
    return "Flood damage often concentrates on furniture and electronics. Coverage upgrades materially reduce replacement shock.";
  }

  return "Earthquake losses are broad and uneven. A stronger policy meaningfully lowers your uncovered exposure.";
}

export function simulateDisaster({
  disasterType,
  detectedItems,
  manualItems,
  policyType,
}: SimulationArgs): DisasterSimulationResult {
  const itemBreakdown = createItemBreakdown(detectedItems, manualItems, policyType);

  const impactedItems = itemBreakdown
    .map((item) => {
      const lossAmount = roundCurrency(item.estimatedValue * getLossRate(disasterType, item));
      const coveredAmount = roundCurrency(lossAmount * getCurrentCoverageRate(item));
      const outOfPocketAmount = Math.max(0, lossAmount - coveredAmount);

      return {
        itemId: item.id,
        category: item.category,
        estimatedValue: item.estimatedValue,
        lossAmount,
        coveredAmount,
        outOfPocketAmount,
      };
    })
    .filter((item) => item.lossAmount > 0)
    .sort((a, b) => b.lossAmount - a.lossAmount);

  const totalLoss = impactedItems.reduce((sum, item) => sum + item.lossAmount, 0);
  const currentPolicyOutOfPocket = impactedItems.reduce(
    (sum, item) => sum + item.outOfPocketAmount,
    0,
  );

  const recommendedPolicyOutOfPocket = itemBreakdown.reduce((sum, item) => {
    const lossAmount = roundCurrency(item.estimatedValue * getLossRate(disasterType, item));
    const coveredAmount = roundCurrency(lossAmount * getRecommendedCoverageRate(item));
    return sum + Math.max(0, lossAmount - coveredAmount);
  }, 0);

  const uncoveredItems = itemBreakdown.filter((item) => item.status !== "covered").length;

  return {
    type: disasterType,
    totalLoss,
    currentPolicyOutOfPocket,
    recommendedPolicyOutOfPocket,
    uncoveredItems,
    impactedItems,
    insight: buildInsight(disasterType, currentPolicyOutOfPocket, recommendedPolicyOutOfPocket),
  };
}
