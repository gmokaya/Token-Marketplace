import { useEffect, useRef } from "react";
import { ClerkProvider, Show, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { Switch, Route, useLocation, Router as WouterRouter } from 'wouter';
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/layout/Layout";

import Home from "@/pages/Home";
import SignInPage from "@/pages/SignInPage";
import SignUpPage from "@/pages/SignUpPage";
import BrokerDashboard from "@/pages/broker/BrokerDashboard";
import NewTeaLot from "@/pages/broker/NewTeaLot";
import EditTeaLot from "@/pages/broker/EditTeaLot";
import LiveAuction from "@/pages/auction/LiveAuction";
import Market from "@/pages/market/Market";
import LotDetail from "@/pages/lots/LotDetail";
import LotSettlement from "@/pages/lots/LotSettlement";
import Mandates from "@/pages/mandates/Mandates";
import AdminAuctions from "@/pages/admin/AdminAuctions";
import NewAuction from "@/pages/admin/NewAuction";
import Profile from "@/pages/Profile";

const clerkPubKey = publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

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
    fontFamily: "'Jost', sans-serif",
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
      signUpUrl={`${basePath}/sign-up`}
      signInFallbackRedirectUrl={`${basePath}/`}
      signUpFallbackRedirectUrl={`${basePath}/`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Switch>
            {/* ── Full-screen pages — no Layout wrapper ── */}
            <Route path="/" component={Home} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />

            {/* ── App pages — wrapped in Layout ── */}
            <Route>
              <Layout>
                <Switch>
                  <Route path="/profile"><ProtectedRoute><Profile /></ProtectedRoute></Route>

                  <Route path="/broker"><ProtectedRoute><BrokerDashboard /></ProtectedRoute></Route>
                  <Route path="/broker/lots/new"><ProtectedRoute><NewTeaLot /></ProtectedRoute></Route>
                  <Route path="/broker/lots/:lotId/edit"><ProtectedRoute><EditTeaLot /></ProtectedRoute></Route>

                  <Route path="/auction/:sessionId"><ProtectedRoute><LiveAuction /></ProtectedRoute></Route>
                  <Route path="/market"><ProtectedRoute><Market /></ProtectedRoute></Route>

                  <Route path="/lots/:lotId"><ProtectedRoute><LotDetail /></ProtectedRoute></Route>
                  <Route path="/lots/:lotId/settlement"><ProtectedRoute><LotSettlement /></ProtectedRoute></Route>

                  <Route path="/mandates"><ProtectedRoute><Mandates /></ProtectedRoute></Route>

                  <Route path="/admin/auctions"><ProtectedRoute><AdminAuctions /></ProtectedRoute></Route>
                  <Route path="/admin/auctions/new"><ProtectedRoute><NewAuction /></ProtectedRoute></Route>

                  <Route>
                    <div className="flex items-center justify-center h-[50vh] text-muted-foreground">
                      404 Not Found
                    </div>
                  </Route>
                </Switch>
              </Layout>
            </Route>
          </Switch>
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
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
