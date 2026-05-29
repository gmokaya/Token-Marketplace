import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from 'wouter';
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Home from "@/pages/Home";
import SignInPage from "@/pages/SignInPage";
import SignUpPage from "@/pages/SignUpPage";
import Dashboard from "@/pages/Dashboard";
import Portfolio from "@/pages/Portfolio";
import Marketplace from "@/pages/Marketplace";
import ListingDetail from "@/pages/ListingDetail";
import Orders from "@/pages/Orders";
import MyListings from "@/pages/MyListings";
import MarketStats from "@/pages/MarketStats";
import Profile from "@/pages/Profile";
import Auctions from "@/pages/Auctions";
import AuctionDetail from "@/pages/AuctionDetail";
import Forwards from "@/pages/Forwards";
import ForwardDetail from "@/pages/ForwardDetail";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const clerkPubKey = publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string) { 
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || "/" : path; 
}

const queryClient = new QueryClient();

// helps user's webview stay up-to-date
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

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(155 100% 18%)",
    colorForeground: "hsl(155 100% 12%)",
    colorMutedForeground: "hsl(155 20% 40%)",
    colorDanger: "hsl(0 84% 40%)",
    colorBackground: "hsl(0 0% 100%)",
    colorInput: "hsl(155 20% 85%)",
    colorInputForeground: "hsl(155 100% 12%)",
    colorNeutral: "hsl(155 20% 85%)",
    fontFamily: "'Inter', sans-serif",
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
            <Route path="/dashboard"><ProtectedRoute><Dashboard /></ProtectedRoute></Route>
            <Route path="/portfolio"><ProtectedRoute><Portfolio /></ProtectedRoute></Route>
            <Route path="/marketplace"><ProtectedRoute><Marketplace /></ProtectedRoute></Route>
            <Route path="/marketplace/:listingId"><ProtectedRoute><ListingDetail /></ProtectedRoute></Route>
            <Route path="/orders"><ProtectedRoute><Orders /></ProtectedRoute></Route>
            <Route path="/my-listings"><ProtectedRoute><MyListings /></ProtectedRoute></Route>
            <Route path="/market-stats"><ProtectedRoute><MarketStats /></ProtectedRoute></Route>
            <Route path="/profile"><ProtectedRoute><Profile /></ProtectedRoute></Route>
            <Route path="/auctions"><ProtectedRoute><Auctions /></ProtectedRoute></Route>
            <Route path="/auctions/:auctionId"><ProtectedRoute><AuctionDetail /></ProtectedRoute></Route>
            <Route path="/forwards"><ProtectedRoute><Forwards /></ProtectedRoute></Route>
            <Route path="/forwards/:contractId"><ProtectedRoute><ForwardDetail /></ProtectedRoute></Route>
            <Route path="*">
              <div className="flex items-center justify-center h-screen">404 Not Found</div>
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