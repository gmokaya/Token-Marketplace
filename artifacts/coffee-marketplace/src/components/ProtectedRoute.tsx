import { Show, useClerk } from "@clerk/react";
import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  customFetch,
  useGetMe,
  getGetMeQueryKey,
} from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  return (
    <>
      <Show when="signed-out">
        <RedirectToSignIn />
      </Show>
      <Show when="signed-in">
        <EnsureProfile>{children}</EnsureProfile>
      </Show>
    </>
  );
}

/** Redirect imperatively so Clerk carries the current full URL as redirect_url.
 *  After sign-in the user is returned to the exact page they requested. */
function RedirectToSignIn() {
  const { redirectToSignIn } = useClerk();
  useEffect(() => {
    redirectToSignIn({ redirectUrl: window.location.href });
  }, [redirectToSignIn]);
  return null;
}

function EnsureProfile({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const {
    data: user,
    error: userError,
    isLoading: userLoading,
  } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      retry: false,
    },
  });
  const {
    data: onboarding,
    error: onboardingError,
    isLoading: onboardingLoading,
  } = useQuery({
    queryKey: ["/api/onboarding/me"],
    queryFn: () => customFetch("/api/onboarding/me"),
    retry: false,
    enabled: !userLoading && !userError && Boolean(user),
  });
  const error = userError ?? onboardingError;
  const isLoading = userLoading || onboardingLoading;
  const onboardingStatus = (onboardingError as { status?: number } | null)?.status;
  const isMissing = onboardingStatus === 404;
  const destination = user?.tier === "ADMIN" ? "/dashboard" : "/market";

  useEffect(() => {
    if (isLoading) return;
    if (isMissing && location !== "/onboarding") {
      setLocation("/onboarding");
    } else if (
      !isMissing &&
      !error &&
      onboarding &&
      location === "/onboarding"
    ) {
      setLocation(destination, { replace: true });
    }
  }, [destination, error, isLoading, isMissing, location, onboarding, setLocation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="w-12 h-12 rounded-full" />
          <Skeleton className="w-48 h-4" />
        </div>
      </div>
    );
  }

  if (isMissing && location !== "/onboarding") return null;
  if (!isMissing && !error && onboarding && location === "/onboarding")
    return null;

  if (error && !isMissing) {
    return (
      <div className="p-8 text-center text-destructive">
        <p>Error loading profile. Please try refreshing.</p>
      </div>
    );
  }

  return <>{children}</>;
}
