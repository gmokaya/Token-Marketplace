import { cn } from "@/lib/utils";

export type CommoditySelection = {
  commodity: string;
  subType: string | null;
};

type Props = {
  value: CommoditySelection[];
  onChange: (value: CommoditySelection[]) => void;
  singleSelect?: boolean;
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

export function CommoditySelect({ value = [], onChange, singleSelect = false }: Props) {
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
    onChange(
      value.map((v) => {
        if (v.commodity === comm) {
          return { ...v, subType };
        }
        return v;
      })
    );
  };

  return (
    <div className="commodity-select">
      <div className="commodity-option-list">
        {COMMODITIES.map((comm) => {
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

      {value.some(v => COMMODITY_SUBTYPES[v.commodity]) && (
        <div className="commodity-subtype-groups">
          {value.map((v) => {
            const subTypes = COMMODITY_SUBTYPES[v.commodity];
            if (!subTypes) return null;

            return (
              <div key={v.commodity} className="commodity-subtype-group animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="commodity-subtype-label">
                  Select {v.commodity} sub-type
                </div>
                <div className="commodity-subtype-list">
                  {subTypes.map((st) => {
                    const isSelected = v.subType === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setSubType(v.commodity, st)}
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
