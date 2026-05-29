const TIER_LABELS: Record<string, string> = {
  PRODUCER: "Producer",
  OFF_TAKER: "Off-Taker",
  ENABLER: "Exchange Administrator",
  FINANCIER: "Financier",
};

export function formatTier(tier: string | null | undefined): string {
  if (!tier) return "";
  return TIER_LABELS[tier] ?? tier.replace(/_/g, " ");
}
