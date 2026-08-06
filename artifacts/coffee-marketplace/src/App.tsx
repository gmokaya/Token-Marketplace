import { useEffect, useRef } from "react";
import { ClerkProvider, useClerk } from '@clerk/react';
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
import Dashboard from "@/pages/Dashboard";
import Profile from "@/pages/Profile";

import Market from "@/pages/market/Market";

import LotDetail from "@/pages/lots/LotDetail";
import LotSettlement from "@/pages/lots/LotSettlement";

import ProducerDashboard from "@/pages/producer/ProducerDashboard";
import ProducerEwrs from "@/pages/producer/ProducerEwrs";
import ProducerNewLot from "@/pages/producer/ProducerNewLot";
import ProducerEditLot from "@/pages/producer/ProducerEditLot";
import ProducerProducts from "@/pages/producer/ProducerProducts";
import ProducerRfqs from "@/pages/producer/ProducerRfqs";
import ProducerShipments from "@/pages/producer/ProducerShipments";
import ProducerEsg from "@/pages/producer/ProducerEsg";

import BrokerDashboard from "@/pages/broker/BrokerDashboard";
import NewBrokeredLot from "@/pages/broker/NewBrokeredLot";
import EditBrokeredLot from "@/pages/broker/EditBrokeredLot";
import BrokerMandates from "@/pages/broker/BrokerMandates";
import BrokerAuctions from "@/pages/broker/BrokerAuctions";

import LiveAuction from "@/pages/auction/LiveAuction";
import Mandates from "@/pages/mandates/Mandates";

import Financing from "@/pages/financing/Financing";
import FinancingDetail from "@/pages/financing/FinancingDetail";

import Forwards from "@/pages/forwards/Forwards";
import ForwardDetail from "@/pages/forwards/ForwardDetail";

import AdminAuctions from "@/pages/admin/AdminAuctions";
import NewAuction from "@/pages/admin/NewAuction";
import AdminEarnings from "@/pages/admin/AdminEarnings";
import AdminAudit from "@/pages/admin/AdminAudit";

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
    logoImageUrl: `${window.location.origin}${basePath}/logo.png`,
  },
  variables: {
    colorPrimary: "#3A2A22",
    colorForeground: "hsl(25 20% 9%)",
    colorMutedForeground: "hsl(32 9% 41%)",
    colorDanger: "hsl(0 84% 60%)",
    colorBackground: "hsl(40 33% 98%)",
    colorInput: "hsl(32 24% 87%)",
    colorInputForeground: "hsl(25 20% 9%)",
    colorNeutral: "hsl(32 24% 87%)",
    fontFamily: "'DM Sans', sans-serif",
    borderRadius: "0.25rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-card rounded-md w-[440px] max-w-full overflow-hidden border border-border shadow-sm",
    card: "!shadow-none !border-0 !bg-transparent",
    footer: "!shadow-none !border-0 !bg-transparent",
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
      signInFallbackRedirectUrl={`${basePath}/dashboard`}
      signUpFallbackRedirectUrl={`${basePath}/dashboard`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />

            <Route>
              <Layout>
                <Switch>
                  <Route path="/profile"><ProtectedRoute><Profile /></ProtectedRoute></Route>
                  <Route path="/dashboard"><ProtectedRoute><Dashboard /></ProtectedRoute></Route>

                  <Route path="/producer"><ProtectedRoute><ProducerDashboard /></ProtectedRoute></Route>
                  <Route path="/producer/ewrs"><ProtectedRoute><ProducerEwrs /></ProtectedRoute></Route>
                  <Route path="/producer/lots/new"><ProtectedRoute><ProducerNewLot /></ProtectedRoute></Route>
                  <Route path="/producer/lots/:lotId/edit"><ProtectedRoute><ProducerEditLot /></ProtectedRoute></Route>
                  <Route path="/producer/products"><ProtectedRoute><ProducerProducts /></ProtectedRoute></Route>
                  <Route path="/producer/rfqs"><ProtectedRoute><ProducerRfqs /></ProtectedRoute></Route>
                  <Route path="/producer/shipments"><ProtectedRoute><ProducerShipments /></ProtectedRoute></Route>
                  <Route path="/producer/esg"><ProtectedRoute><ProducerEsg /></ProtectedRoute></Route>

                  <Route path="/broker"><ProtectedRoute><BrokerDashboard /></ProtectedRoute></Route>
                  <Route path="/broker/lots/new"><ProtectedRoute><NewBrokeredLot /></ProtectedRoute></Route>
                  <Route path="/broker/lots/:lotId/edit"><ProtectedRoute><EditBrokeredLot /></ProtectedRoute></Route>
                  <Route path="/broker/mandates"><ProtectedRoute><BrokerMandates /></ProtectedRoute></Route>
                  <Route path="/broker/auctions"><ProtectedRoute><BrokerAuctions /></ProtectedRoute></Route>

                  <Route path="/market"><ProtectedRoute><Market /></ProtectedRoute></Route>
                  <Route path="/lots/:lotId"><ProtectedRoute><LotDetail /></ProtectedRoute></Route>
                  <Route path="/lots/:lotId/settlement"><ProtectedRoute><LotSettlement /></ProtectedRoute></Route>

                  <Route path="/auction/:sessionId"><ProtectedRoute><LiveAuction /></ProtectedRoute></Route>

                  <Route path="/mandates"><ProtectedRoute><Mandates /></ProtectedRoute></Route>

                  <Route path="/financing"><ProtectedRoute><Financing /></ProtectedRoute></Route>
                  <Route path="/financing/:requestId"><ProtectedRoute><FinancingDetail /></ProtectedRoute></Route>

                  <Route path="/forwards"><ProtectedRoute><Forwards /></ProtectedRoute></Route>
                  <Route path="/forwards/:contractId"><ProtectedRoute><ForwardDetail /></ProtectedRoute></Route>

                  <Route path="/admin/auctions"><ProtectedRoute><AdminAuctions /></ProtectedRoute></Route>
                  <Route path="/admin/auctions/new"><ProtectedRoute><NewAuction /></ProtectedRoute></Route>
                  <Route path="/admin/earnings"><ProtectedRoute><AdminEarnings /></ProtectedRoute></Route>
                  <Route path="/admin/audit"><ProtectedRoute><AdminAudit /></ProtectedRoute></Route>

                  <Route>
                    <div className="flex items-center justify-center h-[50vh] text-muted-foreground font-mono">
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
