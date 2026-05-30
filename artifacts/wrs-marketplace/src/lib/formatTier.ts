const TIER_LABELS: Record<string, string> = {
  PRODUCER: "Producer",
  OFF_TAKER: "Off-Taker",
  ENABLER: "Warehouse Operator",
  FINANCIER: "Financier",
  COOPERATIVE: "Cooperative",
};

export function formatTier(tier: string | null | undefined): string {
  if (!tier) return "";
  return TIER_LABELS[tier] ?? tier.replace(/_/g, " ");
}
