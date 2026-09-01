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
  "Macadamia",
  "Soybeans",
  "Sesame",
  "Sunflower",
  "Cocoa",
  "Spices",
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
  return { commodity: normalized, subType: null };
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
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2.5">
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
                "inline-flex items-center justify-center px-4 py-2.5 rounded-full text-[14px] font-medium transition-all duration-200 cursor-pointer border",
                isSelected
                  ? "bg-[#606A5C] border-[#606A5C] text-white shadow-sm"
                  : "bg-[#f5f5f7] border-[#e5e5ea] text-[#1d1d1f] hover:bg-[#e5e5ea]"
              )}
            >
              {comm}
            </button>
          );
        })}
      </div>

      {value.some(v => COMMODITY_SUBTYPES[v.commodity]) && (
        <div className="space-y-4 pt-2">
          {value.map((v) => {
            const subTypes = COMMODITY_SUBTYPES[v.commodity];
            if (!subTypes) return null;

            return (
              <div key={v.commodity} className="animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="text-[13px] font-medium text-[#86868b] mb-2 px-1">
                  Select {v.commodity} sub-type
                </div>
                <div className="flex flex-wrap gap-2.5">
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
                          "inline-flex items-center justify-center px-3 py-1.5 rounded-full text-[13px] font-medium transition-all duration-200 cursor-pointer border",
                          isSelected
                            ? "bg-[#606A5C] border-[#606A5C] text-white shadow-sm"
                            : "bg-[#f5f5f7] border-[#e5e5ea] text-[#1d1d1f] hover:bg-[#e5e5ea]"
                        )}
                      >
                        {st}
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
