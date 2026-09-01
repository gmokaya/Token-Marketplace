import { useAuth, useClerk } from "@clerk/react";
import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { customFetch, useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { Loader2 } from "lucide-react";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!isSignedIn) {
    return <RedirectToSignIn />;
  }

  return <EnsureOnboarding>{children}</EnsureOnboarding>;
}

function RedirectToSignIn() {
  const { redirectToSignIn } = useClerk();

  useEffect(() => {
    redirectToSignIn({ redirectUrl: window.location.href });
  }, [redirectToSignIn]);

  return null;
}

function EnsureOnboarding({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const { data: user, error: userError, isLoading: userLoading } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      retry: false,
    },
  });
  const { data: onboarding, error: onboardingError, isLoading: onboardingLoading } = useQuery({
    queryKey: ["/api/onboarding/me"],
    queryFn: () => customFetch("/api/onboarding/me"),
    retry: false,
    enabled: !userLoading && !userError && Boolean(user),
  });
  const error = userError ?? onboardingError;
  const isLoading = userLoading || onboardingLoading;
  const isMissing = onboardingError && (onboardingError as any)?.status === 404;

  useEffect(() => {
    if (isLoading) return;
    if (isMissing && location !== "/onboarding") {
      setLocation("/onboarding");
    } else if (!isMissing && !error && onboarding && location === "/onboarding") {
      setLocation("/dashboard");
    }
  }, [error, isLoading, isMissing, location, onboarding, setLocation]);

  if (isLoading || (isMissing && location !== "/onboarding") || (!isMissing && !error && onboarding && location === "/onboarding")) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (error && !isMissing) {
    return <div className="p-8 text-center text-destructive">Error loading your profile. Please try refreshing.</div>;
  }

  return <>{children}</>;
}
