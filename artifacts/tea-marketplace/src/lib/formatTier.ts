const TIER_LABELS: Record<string, string> = {
  PRODUCER:   "Tea Factory",
  OFF_TAKER:  "Tea Buyer",
  ENABLER:    "Licensed Broker",
  FINANCIER:  "Financier",
  ADMIN:      "Exchange Administrator",
};

export function formatTier(tier: string | null | undefined): string {
  if (!tier) return "";
  return TIER_LABELS[tier] ?? tier.replace(/_/g, " ");
}
