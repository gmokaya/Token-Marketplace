import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from '@clerk/react';
import { useAutoLogout } from "@/lib/useAutoLogout";
import { shadcn } from '@clerk/themes';
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from 'wouter';
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Home from "@/pages/Home";
import SignInPage from "@/pages/SignInPage";
import SignUpPage from "@/pages/SignUpPage";
import Dashboard from "@/pages/Dashboard";
import Profile from "@/pages/Profile";
import AdminEarnings from "@/pages/AdminEarnings";
import AdminUsers from "@/pages/AdminUsers";
import AuditLog from "@/pages/AuditLog";
import ApiAccess from "@/pages/settings/ApiAccess";

// Admin pages
import AdminAuctions from "@/pages/admin/AdminAuctions";
import AdminEwrs from "@/pages/admin/AdminEwrs";
import AdminLots from "@/pages/admin/AdminLots";
import NewAuction from "@/pages/admin/NewAuction";

// Broker pages
import BrokerDashboard from "@/pages/broker/BrokerDashboard";

import { ProtectedRoute } from "@/components/ProtectedRoute";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string) {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || "/" : path;
}

const queryClient = new QueryClient();

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
        <AutoLogout />
        <TooltipProvider>
          <Switch>
            {/* Public pages */}
            <Route path="/" component={Home} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />

            {/* Authenticated pages */}
            <Route path="/dashboard"><ProtectedRoute><Dashboard /></ProtectedRoute></Route>
            <Route path="/profile"><ProtectedRoute><Profile /></ProtectedRoute></Route>

            {/* Admin routes */}
            <Route path="/admin/auctions"><ProtectedRoute><AdminAuctions /></ProtectedRoute></Route>
            <Route path="/admin/auctions/new"><ProtectedRoute><NewAuction /></ProtectedRoute></Route>
            <Route path="/admin/ewrs"><ProtectedRoute><AdminEwrs /></ProtectedRoute></Route>
            <Route path="/admin/lots"><ProtectedRoute><AdminLots /></ProtectedRoute></Route>
            <Route path="/admin/users"><ProtectedRoute><AdminUsers /></ProtectedRoute></Route>
            <Route path="/admin/earnings"><ProtectedRoute><AdminEarnings /></ProtectedRoute></Route>
            <Route path="/admin/audit"><ProtectedRoute><AuditLog /></ProtectedRoute></Route>

            {/* Broker routes */}
            <Route path="/broker"><ProtectedRoute><BrokerDashboard /></ProtectedRoute></Route>

            {/* Settings */}
            <Route path="/settings/api-access"><ProtectedRoute><ApiAccess /></ProtectedRoute></Route>

            <Route>
              <div className="flex items-center justify-center h-screen text-muted-foreground">
                404 Not Found
              </div>
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
