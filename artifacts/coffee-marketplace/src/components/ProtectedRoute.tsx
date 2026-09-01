import { useAuth, useClerk } from "@clerk/react";
import { ReactNode, useEffect } from "react";
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

  return <>{children}</>;
}

function RedirectToSignIn() {
  const { redirectToSignIn } = useClerk();

  useEffect(() => {
    redirectToSignIn({ redirectUrl: window.location.href });
  }, [redirectToSignIn]);

  return null;
}
