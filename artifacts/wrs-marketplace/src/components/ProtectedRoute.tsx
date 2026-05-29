import { Show } from "@clerk/react";
import { Redirect } from "wouter";
import { ReactNode } from "react";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Onboarding } from "./Onboarding";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  return (
    <>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
      <Show when="signed-in">
        <EnsureProfile>{children}</EnsureProfile>
      </Show>
    </>
  );
}

function EnsureProfile({ children }: { children: ReactNode }) {
  const { data: user, error, isLoading } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      retry: false,
    }
  });

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

  // If 404, we need onboarding
  if (error && (error as any)?.status === 404) {
    return <Onboarding />;
  }

  // Error but not 404
  if (error) {
    return (
      <div className="p-8 text-center text-destructive">
        <p>Error loading profile. Please try refreshing.</p>
      </div>
    );
  }

  return <>{children}</>;
}
