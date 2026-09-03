import { useEffect, useLayoutEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, useAuth, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { useAutoLogout } from "@/lib/useAutoLogout";
import { shadcn } from '@clerk/themes';
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from 'wouter';
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  customFetch,
  getAuthenticatedEntryDestination,
  getGetMeQueryKey,
  setAuthTokenGetter,
  setBaseUrl,
  useGetMe,
} from "@workspace/api-client-react";

import Home from "@/pages/Home";
import SignInPage from "@/pages/SignInPage";
import Dashboard from "@/pages/Dashboard";
import OnboardingPage from "@/pages/OnboardingPage";
import Profile from "@/pages/Profile";
import Market from "@/pages/market/Market";
import AdminEarnings from "@/pages/AdminEarnings";
import AdminUsers from "@/pages/AdminUsers";
import AuditLog from "@/pages/AuditLog";
import ApiAccess from "@/pages/settings/ApiAccess";
import LotDetail from "@/pages/lots/LotDetail";
import LotSettlement from "@/pages/lots/LotSettlement";
import Auctions from "@/pages/auction/Auctions";
import LiveAuction from "@/pages/auction/LiveAuction";
import Mandates from "@/pages/mandates/Mandates";
import Warehouses from "@/pages/warehouses/Warehouses";
import WarehouseDetail from "@/pages/warehouses/WarehouseDetail";

// Admin pages
import AdminAuctions from "@/pages/admin/AdminAuctions";
import AdminEwrs from "@/pages/admin/AdminEwrs";
import AdminLots from "@/pages/admin/AdminLots";
import NewAuction from "@/pages/admin/NewAuction";

// Broker pages
import BrokerDashboard from "@/pages/broker/BrokerDashboard";

import { ProtectedRoute } from "@/components/ProtectedRoute";

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
setBaseUrl("/api/v1/grain");

function stripBase(path: string) {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || "/" : path;
}

const queryClient = new QueryClient();

function HomeRedirect() {
  const { isLoaded, isSignedIn } = useAuth();
  const [, setLocation] = useLocation();
  const userQuery = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      enabled: isLoaded && Boolean(isSignedIn),
      retry: false,
    },
  });
  const onboardingQuery = useQuery({
    queryKey: ["/api/onboarding/me"],
    queryFn: () => customFetch("/api/onboarding/me"),
    enabled:
      isLoaded &&
      Boolean(isSignedIn) &&
      !userQuery.isLoading &&
      !userQuery.error &&
      Boolean(userQuery.data) &&
      userQuery.data?.tier !== "ADMIN",
    retry: false,
  });
  const isAdmin = userQuery.data?.tier === "ADMIN";
  const onboardingStatus = (onboardingQuery.error as { status?: number } | null)?.status;
  const hasNoOnboarding = !isAdmin && onboardingStatus === 404;

  useEffect(() => {
    if (
      !isLoaded ||
      !isSignedIn ||
      userQuery.isLoading ||
      (!isAdmin && onboardingQuery.isLoading)
    ) {
      return;
    }
    if (
      userQuery.error ||
      (!isAdmin && onboardingQuery.error && !hasNoOnboarding)
    ) {
      return;
    }

    const destination = getAuthenticatedEntryDestination({
      hasOnboarding: isAdmin || !hasNoOnboarding,
      tier: userQuery.data?.tier,
    });
    setLocation(destination, { replace: true });
  }, [
    hasNoOnboarding,
    isAdmin,
    isLoaded,
    isSignedIn,
    onboardingQuery.error,
    onboardingQuery.isLoading,
    setLocation,
    userQuery.data?.tier,
    userQuery.error,
    userQuery.isLoading,
  ]);

  if (
    !isLoaded ||
    (isSignedIn &&
      (userQuery.isLoading || (!isAdmin && onboardingQuery.isLoading)))
  ) {
    return <AuthRoutingState />;
  }

  if (!isSignedIn) return <Home />;
  if (
    userQuery.error ||
    (!isAdmin && onboardingQuery.error && !hasNoOnboarding)
  ) {
    return <AuthRoutingState error />;
  }

  return null;
}

function AuthRoutingState({ error = false }: { error?: boolean }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center text-muted-foreground">
      <p aria-live="polite">
        {error
          ? "We couldn't load your marketplace profile. Please refresh and try again."
          : "Preparing your marketplace…"}
      </p>
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

function ClerkAuthBridge() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const queryClient = useQueryClient();

  useLayoutEffect(() => {
    if (!isLoaded) return;
    setAuthTokenGetter(isSignedIn ? getToken : null);
    if (isSignedIn) {
      void queryClient.invalidateQueries({ queryKey: ["/api/users/me"], refetchType: "active" });
    }
    return () => setAuthTokenGetter(null);
  }, [getToken, isLoaded, isSignedIn, queryClient]);

  return null;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo-dark.png`,
  },
  variables: {
    colorPrimary: "#252a30",
    colorForeground: "hsl(210 14% 12%)",
    colorMutedForeground: "hsl(210 8% 43%)",
    colorDanger: "hsl(0 84% 40%)",
    colorBackground: "hsl(0 0% 100%)",
    colorInput: "hsl(210 12% 84%)",
    colorInputForeground: "hsl(210 14% 12%)",
    colorNeutral: "hsl(210 12% 84%)",
    fontFamily: "'PT Sans', sans-serif",
    borderRadius: "0rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-card rounded-none w-[440px] max-w-full overflow-hidden border border-border",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
  },
};

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-in?mode=sign-up`}
      signInFallbackRedirectUrl={`${basePath}/`}
      signUpFallbackRedirectUrl={`${basePath}/`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkAuthBridge />
        <ClerkQueryClientCacheInvalidator />
        <AutoLogout />
        <TooltipProvider>
          <Switch>
            {/* Public pages */}
            <Route path="/" component={HomeRedirect} />
            <Route path="/sign-up"><Redirect to="/sign-in?mode=sign-up" /></Route>
            <Route path="/sign-in/*?" component={SignInPage} />

            {/* Authenticated pages */}
            <Route path="/onboarding"><ProtectedRoute><OnboardingPage /></ProtectedRoute></Route>

            {/* Admin routes */}
            <Route>
              <ProtectedRoute>
                <Switch>
                  <Route path="/dashboard"><Dashboard /></Route>
                  <Route path="/profile"><Profile /></Route>
                  <Route path="/market"><Market /></Route>
                  <Route path="/lots/:listingId"><LotDetail /></Route>
                  <Route path="/lots/:orderId/settlement"><LotSettlement /></Route>
                  <Route path="/auctions"><Auctions /></Route>
                  <Route path="/auctions/:auctionId"><LiveAuction /></Route>
                  <Route path="/mandates"><Mandates /></Route>
                  <Route path="/warehouses"><Warehouses /></Route>
                  <Route path="/warehouses/:code"><WarehouseDetail /></Route>
                  <Route path="/admin/auctions"><AdminAuctions /></Route>
                  <Route path="/admin/auctions/new"><NewAuction /></Route>
                  <Route path="/admin/ewrs"><AdminEwrs /></Route>
                  <Route path="/admin/lots"><AdminLots /></Route>
                  <Route path="/admin/users"><AdminUsers /></Route>
                  <Route path="/admin/earnings"><AdminEarnings /></Route>
                  <Route path="/admin/audit"><AuditLog /></Route>

                  {/* Broker routes */}
                  <Route path="/broker"><BrokerDashboard /></Route>

                  {/* Settings */}
                  <Route path="/settings/api-access"><ApiAccess /></Route>

                  <Route>
                    <div className="flex items-center justify-center h-screen text-muted-foreground">
                      404 Not Found
                    </div>
                  </Route>
                </Switch>
              </ProtectedRoute>
            </Route>
          </Switch>
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function AutoLogout() {
  useAutoLogout();
  return null;
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
      <Toaster />
    </WouterRouter>
  );
}

export default App;
