import { cn } from "@/lib/utils";

export type CommoditySelection = {
  commodity: string;
  subType: string | null;
};

type Props = {
  value: CommoditySelection[];
  onChange: (value: CommoditySelection[]) => void;
  singleSelect?: boolean;
  coffeeOnly?: boolean;
  teaOnly?: boolean;
};

const COMMODITIES = [
  "Coffee",
  "Tea",
  "Grain",
  "Avocado",
  "Honey",
  "Nuts",
  "Other",
];

export const COMMODITY_SUBTYPES: Record<string, string[]> = {
  Coffee: ["Arabica AA", "Arabica AB", "Arabica PB", "Robusta"],
  Tea: ["Orthodox", "CTC", "Green Tea", "Purple Tea", "White Tea"],
  Grain: ["Maize", "Wheat", "Rice", "Sorghum", "Green Grams", "Beans"],
};

export function normalizeLegacyCommodity(value: string): CommoditySelection {
  const normalized = value.trim();
  const lower = normalized.toLowerCase();

  if (lower.includes("coffee")) {
    const subType = COMMODITY_SUBTYPES.Coffee.find((item) => lower.includes(item.toLowerCase().replace("arabica ", "")))
      ?? (lower.includes("robusta") ? "Robusta" : null);
    return { commodity: "Coffee", subType };
  }

  if (lower.includes("tea")) {
    const subType = COMMODITY_SUBTYPES.Tea.find((item) => lower.includes(item.toLowerCase()))
      ?? (lower.includes("orthodox") ? "Orthodox" : null);
    return { commodity: "Tea", subType };
  }

  const grainSubType = COMMODITY_SUBTYPES.Grain.find((item) => lower === item.toLowerCase());
  if (grainSubType) return { commodity: "Grain", subType: grainSubType };

  if (lower === "grain") return { commodity: "Grain", subType: null };

  if (
    lower.includes("nut") ||
    ["macadamia", "almond", "cashew", "peanut", "pecan", "walnut"].some((item) =>
      lower.includes(item),
    )
  ) {
    return { commodity: "Nuts", subType: null };
  }

  if (lower === "avocado") return { commodity: "Avocado", subType: null };
  if (lower === "honey") return { commodity: "Honey", subType: null };
  if (lower === "other") return { commodity: "Other", subType: null };
  return { commodity: "Other", subType: null };
}

export function CommoditySelect({
  value = [],
  onChange,
  singleSelect = false,
  coffeeOnly = false,
  teaOnly = false,
}: Props) {
  const marketOnly = coffeeOnly || teaOnly;
  const marketCommodity = coffeeOnly ? "Coffee" : "Tea";
  const toggleCommodity = (comm: string) => {
    const existing = value.find((v) => v.commodity === comm);
    if (existing) {
      onChange(value.filter((v) => v.commodity !== comm));
    } else {
      const newValue = singleSelect ? [] : [...value];
      newValue.push({ commodity: comm, subType: null });
      onChange(newValue);
    }
  };

  const setSubType = (comm: string, subType: string) => {
    const currentSelections = value.filter((v) => v.commodity === comm);
    const isGrain = comm === "Grain";
    const isSelected = currentSelections.some((v) => v.subType === subType);
    const nextSelections = isGrain
      ? isSelected
        ? currentSelections.filter((v) => v.subType !== subType)
        : [
            ...currentSelections.filter((v) => v.subType !== null),
            { commodity: comm, subType },
          ]
      : [{ commodity: comm, subType }];
    const replacement = nextSelections.length
      ? nextSelections
      : [{ commodity: comm, subType: null }];
    const firstIndex = value.findIndex((v) => v.commodity === comm);
    const nextValue = value.filter((v) => v.commodity !== comm);
    nextValue.splice(Math.min(firstIndex, nextValue.length), 0, ...replacement);
    onChange(nextValue);
  };

  const selectedCommodities = Array.from(new Set(value.map((v) => v.commodity)));

  return (
    <div className="commodity-select">
      <div className="commodity-option-list">
        {(marketOnly ? [marketCommodity] : COMMODITIES).map((comm) => {
          const isSelected = value.some((v) => v.commodity === comm);
          return (
            <button
              key={comm}
              type="button"
              onClick={() => toggleCommodity(comm)}
              aria-pressed={isSelected}
              data-testid={`commodity-${comm.toLowerCase()}`}
              className={cn(
                "commodity-option",
                isSelected && "is-selected",
              )}
            >
              <span>{comm}</span>
              {isSelected && <span className="commodity-option-check" aria-hidden="true">✓</span>}
            </button>
          );
        })}
      </div>

      {selectedCommodities.some((comm) => COMMODITY_SUBTYPES[comm] && !(marketOnly && comm === marketCommodity)) && (
        <div className="commodity-subtype-groups">
          {selectedCommodities.map((comm) => {
            const subTypes = COMMODITY_SUBTYPES[comm];
            if (!subTypes || (marketOnly && comm === marketCommodity)) return null;
            const selections = value.filter((v) => v.commodity === comm);

            return (
              <div key={comm} className="commodity-subtype-group animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="commodity-subtype-label">
                  Select {comm} {comm === "Grain" ? "sub-types" : "sub-type"}
                </div>
                <div className="commodity-subtype-list">
                  {subTypes.map((st) => {
                    const isSelected = selections.some((v) => v.subType === st);
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setSubType(comm, st)}
                        aria-pressed={isSelected}
                        data-testid={`commodity-subtype-${st.toLowerCase().replace(/\s+/g, "-")}`}
                        className={cn(
                          "commodity-subtype-option",
                          isSelected && "is-selected",
                        )}
                      >
                        <span>{st}</span>
                        {isSelected && <span className="commodity-option-check" aria-hidden="true">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
