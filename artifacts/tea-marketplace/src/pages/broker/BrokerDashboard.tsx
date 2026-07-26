import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useGetMe, useListTeaLots, useTeaLotTakeOut, useAcceptTeaLotBelowReserve, getListTeaLotsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { Plus, Gavel, FileEdit, Archive, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function BrokerDashboard() {
  const { data: user } = useGetMe();
  const [activeTab, setActiveTab] = useState<string>("DRAFT");
  
  const { data: lots, isLoading, isError } = useListTeaLots(
    undefined,
    {
      query: {
        enabled: !!user?.id,
        queryKey: getListTeaLotsQueryKey()
      }
    }
  );

  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const takeOutMutation = useTeaLotTakeOut({
    mutation: {
      onSuccess: () => {
        toast({ title: "Lot withdrawn" });
        queryClient.invalidateQueries({ queryKey: getListTeaLotsQueryKey() });
      }
    }
  });

  const acceptMutation = useAcceptTeaLotBelowReserve({
    mutation: {
      onSuccess: () => {
        toast({ title: "Accepted below reserve" });
        queryClient.invalidateQueries({ queryKey: getListTeaLotsQueryKey() });
      }
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <span>Failed to load lots. Please try again.</span>
      </div>
    );
  }

  // Broker specific lots
  const brokerLots = lots?.filter(l => l.brokerId === user?.id) || [];
  
  const lotsByStatus = brokerLots.reduce((acc, lot) => {
    if (!acc[lot.status]) acc[lot.status] = [];
    acc[lot.status].push(lot);
    return acc;
  }, {} as Record<string, typeof brokerLots>);

  const statuses = ["DRAFT", "CATALOGUED", "LIVE", "SOLD", "RESERVE_NOT_MET", "WITHDRAWN"];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Broker Dashboard"
        description="Manage tea lots, auction sessions, and performance."
        actions={
          <>
            <Link href="/broker/auctions">
              <Button variant="outline" className="rounded-none gap-2"><Gavel className="w-4 h-4" /> Submit to Auction</Button>
            </Link>
            <Link href="/broker/lots/new">
              <Button className="rounded-none gap-2"><Plus className="w-4 h-4" /> New Lot</Button>
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-none shadow-sm border border-border bg-card">
          <CardHeader className="p-5 pb-2 border-b bg-muted/5">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Lots Managed</CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <div className="text-4xl font-bold tracking-tight">{brokerLots.length}</div>
          </CardContent>
        </Card>
        <Card className="rounded-none shadow-sm border border-border bg-card">
          <CardHeader className="p-5 pb-2 border-b bg-muted/5">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lots Catalogued</CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <div className="text-4xl font-bold tracking-tight">{lotsByStatus["CATALOGUED"]?.length || 0}</div>
          </CardContent>
        </Card>
        <Card className="rounded-none shadow-sm border border-border bg-card">
          <CardHeader className="p-5 pb-2 border-b bg-muted/5">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lots Sold</CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <div className="text-4xl font-bold tracking-tight">{lotsByStatus["SOLD"]?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent h-auto p-0 gap-6">
          {statuses.map(status => (
            <TabsTrigger 
              key={status} 
              value={status}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-1 py-3 font-medium text-muted-foreground data-[state=active]:text-foreground transition-none"
            >
              {status.replace(/_/g, ' ')}
              <Badge variant="secondary" className="ml-2 rounded-none text-xs bg-muted/50">
                {lotsByStatus[status]?.length || 0}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>
        
        {statuses.map(status => (
          <TabsContent key={status} value={status} className="pt-6 outline-none">
            {!lotsByStatus[status]?.length ? (
              <div className="flex flex-col items-center justify-center p-16 text-center border border-border bg-muted/5">
                <Archive className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium">No lots found</h3>
                <p className="text-muted-foreground mt-1">There are no lots currently in the {status.replace(/_/g, ' ')} status.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {lotsByStatus[status].map(lot => (
                  <Card key={lot.id} className="rounded-none shadow-sm flex flex-col border border-border transition-all hover:border-primary/30">
                    <CardHeader className="p-5 border-b bg-muted/5">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-xl font-bold">{lot.grade}</CardTitle>
                          <div className="text-sm text-muted-foreground mt-1 font-medium">{lot.gradeMark} • {lot.giOrigin}</div>
                        </div>
                        <Badge variant="outline" className="rounded-none text-xs tracking-wider">{lot.listingType}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-5 flex-1 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Weight</div>
                          <div className="font-mono text-base">{lot.netWeightKg} kg</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Reserve</div>
                          <div className="font-mono text-base">${lot.reservePriceUsd?.toFixed(2) || '—'} /kg</div>
                        </div>
                      </div>
                    </CardContent>
                    
                    <div className="p-5 pt-0 mt-auto flex gap-3 flex-wrap border-t bg-muted/5">
                      <Link href={`/lots/${lot.id}`} className="flex-1 mt-5">
                        <Button variant="outline" size="sm" className="w-full rounded-none gap-2"><Gavel className="w-3 h-3"/> View Details</Button>
                      </Link>
                      
                      {(status === "DRAFT" || status === "CATALOGUED") && (
                        <Link href={`/broker/lots/${lot.id}/edit`} className="flex-1 mt-5">
                          <Button variant="secondary" size="sm" className="w-full rounded-none gap-2">
                            <FileEdit className="w-3 h-3" /> Edit Lot
                          </Button>
                        </Link>
                      )}

                      {status === "RESERVE_NOT_MET" && (
                        <>
                          <Button 
                            variant="default" 
                            size="sm" 
                            className="flex-1 rounded-none mt-5 gap-2"
                            onClick={() => acceptMutation.mutate({ lotId: lot.id })}
                            disabled={acceptMutation.isPending}
                          >
                            <CheckCircle className="w-3 h-3" /> Accept
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            className="flex-1 rounded-none mt-5 gap-2"
                            onClick={() => takeOutMutation.mutate({ lotId: lot.id })}
                            disabled={takeOutMutation.isPending}
                          >
                            <Archive className="w-3 h-3" /> Withdraw
                          </Button>
                        </>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}