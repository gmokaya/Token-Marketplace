import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';

import { AppLayout } from '@/components/layout/AppLayout';
import { Overview } from '@/pages/Overview';
import { CoffeeLots } from '@/pages/coffee/Lots';
import { CoffeeAuctions } from '@/pages/coffee/Auctions';
import { TeaLots } from '@/pages/tea/Lots';
import { TeaAuctions } from '@/pages/tea/Auctions';
import { Publishing } from '@/pages/Publishing';

const queryClient = new QueryClient();

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Overview} />
        <Route path="/coffee/lots" component={CoffeeLots} />
        <Route path="/coffee/auctions" component={CoffeeAuctions} />
        <Route path="/tea/lots" component={TeaLots} />
        <Route path="/tea/auctions" component={TeaAuctions} />
        <Route path="/publishing" component={Publishing} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
