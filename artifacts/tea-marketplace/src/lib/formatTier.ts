const TIER_LABELS: Record<string, string> = {
  PRODUCER:   "Producer",
  OFF_TAKER:  "Trader",
  ENABLER:    "Broker",
  FINANCIER:  "Exchange",
  ADMIN:      "Exchange Admin",
};

export function formatTier(tier: string | null | undefined): string {
  if (!tier) return "";
  return TIER_LABELS[tier] ?? tier.replace(/_/g, " ");
}
