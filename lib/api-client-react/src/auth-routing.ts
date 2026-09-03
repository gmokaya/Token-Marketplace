export type AuthenticatedEntryState = {
  hasOnboarding: boolean;
  tier?: string | null;
};

export function getAuthenticatedEntryDestination({
  hasOnboarding,
  tier,
}: AuthenticatedEntryState): "/onboarding" | "/market" | "/dashboard" {
  if (tier === "ADMIN") return "/dashboard";
  if (!hasOnboarding) return "/onboarding";
  return "/market";
}