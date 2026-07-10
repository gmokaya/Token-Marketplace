import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useGetMe, useListTeaLots, useTeaLotTakeOut, useAcceptTeaLotBelowReserve, getListTeaLotsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Broker Dashboard</h1>
        <div className="flex items-center gap-3">
          <Link href="/admin/auctions/new">
            <Button variant="outline" className="rounded-none">Create Session</Button>
          </Link>
          <Link href="/broker/lots/new">
            <Button className="rounded-none gap-2"><Plus className="w-4 h-4" /> New Lot</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-none shadow-none border-border">
          <CardHeader className="p-4 bg-muted/20 border-b">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Lots Managed</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="text-3xl font-bold">{brokerLots.length}</div>
          </CardContent>
        </Card>
        <Card className="rounded-none shadow-none border-border">
          <CardHeader className="p-4 bg-muted/20 border-b">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Lots Catalogued</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="text-3xl font-bold">{lotsByStatus["CATALOGUED"]?.length || 0}</div>
          </CardContent>
        </Card>
        <Card className="rounded-none shadow-none border-border">
          <CardHeader className="p-4 bg-muted/20 border-b">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Lots Sold</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="text-3xl font-bold">{lotsByStatus["SOLD"]?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto p-0">
          {statuses.map(status => (
            <TabsTrigger 
              key={status} 
              value={status}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 font-medium"
            >
              {status.replace(/_/g, ' ')}
              <Badge variant="secondary" className="ml-2 rounded-none text-xs">
                {lotsByStatus[status]?.length || 0}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>
        
        {statuses.map(status => (
          <TabsContent key={status} value={status} className="pt-6">
            {!lotsByStatus[status]?.length ? (
              <div className="text-center p-12 border border-dashed text-muted-foreground">
                No lots found in this status.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {lotsByStatus[status].map(lot => (
                  <Card key={lot.id} className="rounded-none shadow-none flex flex-col">
                    <CardHeader className="p-4 pb-2 border-b bg-muted/10">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{lot.grade}</CardTitle>
                          <div className="text-sm text-muted-foreground mt-1">{lot.gradeMark} • {lot.giOrigin}</div>
                        </div>
                        <Badge variant="outline" className="rounded-none">{lot.listingType}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 flex-1 space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <div className="text-muted-foreground">Weight</div>
                          <div className="font-semibold">{lot.netWeightKg} kg</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Reserve</div>
                          <div className="font-semibold">${lot.reservePriceUsd?.toFixed(2) || '—'} /kg</div>
                        </div>
                      </div>
                    </CardContent>
                    
                    <div className="p-4 pt-0 mt-auto flex gap-2 flex-wrap">
                      <Link href={`/lots/${lot.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full rounded-none">View</Button>
                      </Link>
                      
                      {(status === "DRAFT" || status === "CATALOGUED") && (
                        <Link href={`/broker/lots/${lot.id}/edit`} className="flex-1">
                          <Button variant="secondary" size="sm" className="w-full rounded-none gap-2">
                            <FileEdit className="w-3 h-3" /> Edit
                          </Button>
                        </Link>
                      )}

                      {status === "RESERVE_NOT_MET" && (
                        <>
                          <Button 
                            variant="default" 
                            size="sm" 
                            className="flex-1 rounded-none"
                            onClick={() => acceptMutation.mutate({ lotId: lot.id })}
                            disabled={acceptMutation.isPending}
                          >
                            <CheckCircle className="w-3 h-3 mr-1" /> Accept
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            className="flex-1 rounded-none"
                            onClick={() => takeOutMutation.mutate({ lotId: lot.id })}
                            disabled={takeOutMutation.isPending}
                          >
                            <Archive className="w-3 h-3 mr-1" /> Take Out
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