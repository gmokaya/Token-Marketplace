import { useEffect, useLayoutEffect, useRef } from "react";
import { ClerkProvider, useAuth, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { useAutoLogout } from "@/lib/useAutoLogout";
import { shadcn } from '@clerk/themes';
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from 'wouter';
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  customFetch,
  getGetMeQueryKey,
  setAuthTokenGetter,
  setBaseUrl,
  useGetMe,
} from "@workspace/api-client-react";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/layout/Layout";

import Home from "@/pages/Home";
import SignInPage from "@/pages/SignInPage";
import OnboardingPage from "@/pages/OnboardingPage";
import Dashboard from "@/pages/Dashboard";
import Profile from "@/pages/Profile";

import BrokerDashboard from "@/pages/broker/BrokerDashboard";
import NewTeaLot from "@/pages/broker/NewTeaLot";
import EditTeaLot from "@/pages/broker/EditTeaLot";
import BrokerMandateHolders from "@/pages/broker/BrokerMandateHolders";
import BrokerAuctions from "@/pages/broker/BrokerAuctions";

import LiveAuction from "@/pages/auction/LiveAuction";
import Market from "@/pages/market/Market";
import LotDetail from "@/pages/lots/LotDetail";
import LotSettlement from "@/pages/lots/LotSettlement";
import Mandates from "@/pages/mandates/Mandates";

import AdminAuctions from "@/pages/admin/AdminAuctions";
import NewAuction from "@/pages/admin/NewAuction";
import AdminLots from "@/pages/admin/AdminLots";
import AdminEwrs from "@/pages/admin/AdminEwrs";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminEarnings from "@/pages/admin/AdminEarnings";
import AdminAudit from "@/pages/admin/AdminAudit";

import ApiAccess from "@/pages/settings/ApiAccess";

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
setBaseUrl("/api/v1/tea");

function stripBase(path: string) {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || "/" : path;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

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
      Boolean(userQuery.data),
    retry: false,
  });
  const onboardingStatus = (onboardingQuery.error as { status?: number } | null)?.status;
  const hasNoOnboarding = onboardingStatus === 404;

  useEffect(() => {
    if (!isLoaded || !isSignedIn || userQuery.isLoading || onboardingQuery.isLoading) {
      return;
    }
    if (userQuery.error || (onboardingQuery.error && !hasNoOnboarding)) return;

    const destination =
      hasNoOnboarding
        ? "/onboarding"
        : userQuery.data?.tier === "ADMIN"
          ? "/dashboard"
          : "/market";
    setLocation(destination, { replace: true });
  }, [
    hasNoOnboarding,
    isLoaded,
    isSignedIn,
    onboardingQuery.error,
    onboardingQuery.isLoading,
    setLocation,
    userQuery.data?.tier,
    userQuery.error,
    userQuery.isLoading,
  ]);

  if (!isLoaded || (isSignedIn && (userQuery.isLoading || onboardingQuery.isLoading))) {
    return <AuthRoutingState />;
  }

  if (!isSignedIn) return <Home />;
  if (userQuery.error || (onboardingQuery.error && !hasNoOnboarding)) {
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
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
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
    colorPrimary: "#0a2a2a",
    colorForeground: "hsl(155 100% 12%)",
    colorMutedForeground: "hsl(180 20% 40%)",
    colorDanger: "hsl(0 84% 40%)",
    colorBackground: "hsl(0 0% 100%)",
    colorInput: "hsl(180 20% 85%)",
    colorInputForeground: "hsl(155 100% 12%)",
    colorNeutral: "hsl(155 20% 85%)",
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
            {/* Full-screen pages, no Layout wrapper */}
            <Route path="/" component={HomeRedirect} />
            <Route path="/sign-up"><Redirect to="/sign-in?mode=sign-up" /></Route>
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/onboarding"><ProtectedRoute><OnboardingPage /></ProtectedRoute></Route>

            {/* App pages, wrapped in Layout */}
            <Route>
              <ProtectedRoute>
                <Layout>
                  <Switch>
                  <Route path="/profile"><ProtectedRoute><Profile /></ProtectedRoute></Route>
                  <Route path="/dashboard"><ProtectedRoute><Dashboard /></ProtectedRoute></Route>

                  {/* Broker */}
                  <Route path="/broker"><ProtectedRoute><BrokerDashboard /></ProtectedRoute></Route>
                  <Route path="/broker/mandate-holders"><ProtectedRoute><BrokerMandateHolders /></ProtectedRoute></Route>
                  <Route path="/broker/auctions"><ProtectedRoute><BrokerAuctions /></ProtectedRoute></Route>
                  <Route path="/broker/lots/new"><ProtectedRoute><NewTeaLot /></ProtectedRoute></Route>
                  <Route path="/broker/lots/:lotId/edit"><ProtectedRoute><EditTeaLot /></ProtectedRoute></Route>

                  {/* Market */}
                  <Route path="/market"><ProtectedRoute><Market /></ProtectedRoute></Route>
                  <Route path="/lots/:lotId"><ProtectedRoute><LotDetail /></ProtectedRoute></Route>
                  <Route path="/lots/:lotId/settlement"><ProtectedRoute><LotSettlement /></ProtectedRoute></Route>

                  {/* Auctions */}
                  <Route path="/auction/:sessionId"><ProtectedRoute><LiveAuction /></ProtectedRoute></Route>

                  {/* Mandates */}
                  <Route path="/mandates"><ProtectedRoute><Mandates /></ProtectedRoute></Route>

                  {/* Admin */}
                  <Route path="/admin/auctions"><ProtectedRoute><AdminAuctions /></ProtectedRoute></Route>
                  <Route path="/admin/auctions/new"><ProtectedRoute><NewAuction /></ProtectedRoute></Route>
                  <Route path="/admin/lots"><ProtectedRoute><AdminLots /></ProtectedRoute></Route>
                  <Route path="/admin/ewrs"><ProtectedRoute><AdminEwrs /></ProtectedRoute></Route>
                  <Route path="/admin/users"><ProtectedRoute><AdminUsers /></ProtectedRoute></Route>
                  <Route path="/admin/earnings"><ProtectedRoute><AdminEarnings /></ProtectedRoute></Route>
                  <Route path="/admin/audit"><ProtectedRoute><AdminAudit /></ProtectedRoute></Route>

                  <Route path="/settings/api-access"><ProtectedRoute><ApiAccess /></ProtectedRoute></Route>

                  <Route>
                    <div className="flex items-center justify-center h-[50vh] text-muted-foreground">
                      404 Not Found
                    </div>
                  </Route>
                  </Switch>
                </Layout>
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
