import { cn } from "@/lib/utils";

const VOLUMES = [
  "Under 1 metric ton",
  "1–5 metric tons",
  "5–20 metric tons",
  "20–100 metric tons",
  "100+ metric tons"
];

export function VolumeSelect({ value, onChange }: { value?: string; onChange: (val: string) => void }) {
  return (
    <div className="flex flex-col gap-2.5" role="radiogroup" aria-label="Annual volume requirement">
      {VOLUMES.map((vol) => {
        const isSelected = value === vol;
        return (
          <button
            key={vol}
            type="button"
            onClick={() => onChange(vol)}
            role="radio"
            aria-checked={isSelected}
            data-testid={`volume-${VOLUMES.indexOf(vol)}`}
            className={cn(
              "flex items-center w-full px-5 py-3.5 rounded-xl border text-[15px] font-medium transition-all duration-200 text-left",
              isSelected 
                ? "bg-[#606A5C] border-[#606A5C] text-white shadow-sm" 
                : "bg-[#f5f5f7] border-[#e5e5ea] text-[#1d1d1f] hover:bg-[#e5e5ea]"
            )}
          >
            {vol}
          </button>
        );
      })}
    </div>
  );
}
