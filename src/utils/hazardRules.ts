import type { BoundingBox, DetectedItem, Detection } from "@/types";

type HazardSeverity = "low" | "medium" | "high";

export interface HazardWarning {
  id: string;
  title: string;
  severity: HazardSeverity;
  message: string;
  relatedCategories: string[];
  positive?: boolean;
}

interface HazardSubject {
  category: string;
  boundingBox?: BoundingBox;
}

const CATEGORY_ALIASES: Record<string, string> = {
  backpack: "handbag",
  handbag: "handbag",
  cellphone: "cell phone",
};

function normalizeCategory(category: string): string {
  const normalized = category.toLowerCase().trim();
  return CATEGORY_ALIASES[normalized] || normalized;
}

function getCategory(subject: HazardSubject | Detection | DetectedItem): string {
  if ("category" in subject && typeof subject.category === "string") {
    return normalizeCategory(subject.category);
  }

  if ("categories" in subject) {
    return normalizeCategory(subject.categories?.[0]?.categoryName || "unknown");
  }

  return "unknown";
}

function getBoundingBox(
  subject: HazardSubject | Detection | DetectedItem,
): BoundingBox | undefined {
  if ("boundingBox" in subject) {
    return subject.boundingBox;
  }

  return undefined;
}

function getCenter(box: BoundingBox): { x: number; y: number } {
  return {
    x: box.originX + box.width / 2,
    y: box.originY + box.height / 2,
  };
}

function areNearby(a: BoundingBox, b: BoundingBox): boolean {
  const centerA = getCenter(a);
  const centerB = getCenter(b);
  const distance = Math.hypot(centerA.x - centerB.x, centerA.y - centerB.y);
  const threshold = Math.max(a.width, a.height, b.width, b.height) * 1.4;
  return distance <= threshold;
}

function findByCategory(
  items: Array<HazardSubject | Detection | DetectedItem>,
  category: string,
): Array<HazardSubject | Detection | DetectedItem> {
  const normalized = normalizeCategory(category);
  return items.filter((item) => getCategory(item) === normalized);
}

function hasCategory(
  items: Array<HazardSubject | Detection | DetectedItem>,
  category: string,
): boolean {
  return findByCategory(items, category).length > 0;
}

export function getHazardWarnings(
  items: Array<HazardSubject | Detection | DetectedItem>,
): HazardWarning[] {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const warnings: HazardWarning[] = [];
  const seen = new Set<string>();

  const pushWarning = (warning: HazardWarning): void => {
    if (seen.has(warning.id)) return;
    seen.add(warning.id);
    warnings.push(warning);
  };

  const toasters = findByCategory(items, "toaster");
  const books = findByCategory(items, "book");

  for (const toaster of toasters) {
    const toasterBox = getBoundingBox(toaster);

    for (const book of books) {
      const bookBox = getBoundingBox(book);
      const nearRiskItems = toasterBox && bookBox ? areNearby(toasterBox, bookBox) : true;

      if (nearRiskItems) {
        pushWarning({
          id: "hazard-toaster-book",
          title: "Kitchen Fire Risk",
          severity: "high",
          message:
            "A toaster appears close to paper items. Keep books and other combustibles away from heating appliances.",
          relatedCategories: ["toaster", "book"],
        });
      }
    }
  }

  const hasMicrowave = hasCategory(items, "microwave");
  const hasOven = hasCategory(items, "oven");
  const hasExtinguisher =
    hasCategory(items, "fire extinguisher") || hasCategory(items, "extinguisher");

  if ((hasMicrowave || hasOven) && !hasExtinguisher) {
    pushWarning({
      id: "hazard-missing-extinguisher",
      title: "Missing Fire Extinguisher",
      severity: "medium",
      message:
        "Kitchen appliances are present, but no fire extinguisher is visible. This is a simple prevention upgrade with high value.",
      relatedCategories:
        hasMicrowave && hasOven ? ["microwave", "oven"] : [hasMicrowave ? "microwave" : "oven"],
    });
  }

  if (hasCategory(items, "refrigerator") && hasMicrowave && hasOven) {
    pushWarning({
      id: "hazard-kitchen-appliance-cluster",
      title: "Kitchen Appliance Concentration",
      severity: "low",
      message:
        "Multiple major kitchen appliances are visible. Consider placing a fire extinguisher nearby and checking outlets regularly.",
      relatedCategories: ["refrigerator", "microwave", "oven"],
    });
  }

  if (hasExtinguisher) {
    pushWarning({
      id: "hazard-extinguisher-positive",
      title: "Visible Fire Protection",
      severity: "low",
      message:
        "A fire extinguisher is visible. Prevention steps like this strengthen household safety and can reduce loss severity.",
      relatedCategories: ["fire extinguisher"],
      positive: true,
    });
  }

  return warnings;
}

export function getHazardCategories(warnings: HazardWarning[]): Set<string> {
  return new Set(
    warnings
      .filter((warning) => !warning.positive)
      .flatMap((warning) => warning.relatedCategories.map(normalizeCategory)),
  );
}
