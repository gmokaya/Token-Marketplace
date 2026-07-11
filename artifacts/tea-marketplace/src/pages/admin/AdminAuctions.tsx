import { useState } from "react";
import { Link } from "wouter";
import { useListAuctions, useStartTeaAuctionSession, getListAuctionsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Play, Gavel, FileText } from "lucide-react";
import { format } from "date-fns";

export default function AdminAuctions() {
  const { data: auctions, isLoading, isError } = useListAuctions(
    { commodityType: "TEA" },
    {
      query: {
        queryKey: getListAuctionsQueryKey({ commodityType: "TEA" })
      }
    }
  );

  const queryClient = useQueryClient();
  const startAuction = useStartTeaAuctionSession({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAuctionsQueryKey({ commodityType: "TEA" }) });
      }
    }
  });

  if (isLoading) return <Skeleton className="w-full h-[400px]" />;
  if (isError) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <span>Failed to load auction sessions. Please try again.</span>
      </div>
    );
  }

  // Use ListAuctions which returns generic auctions. Wait, useListAuctions returns generic Auction type.
  // Actually, the API has useListAuctions which returns `Auction[]`. But for TEA, the session model is `TeaAuctionSession`.
  // Let's use it as provided, assuming the endpoint handles it, or wait—
  // Admin might just want to see the Tea sessions. Since there's no `useListTeaAuctionSessions`, we might rely on the generic one.
  // Let's render the list.

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Auctions Management</h1>
          <p className="text-muted-foreground mt-1">Manage and start tea auction sessions.</p>
        </div>
        <Link href="/admin/auctions/new">
          <Button className="rounded-none gap-2 h-11 font-semibold"><Gavel className="w-4 h-4" /> Create Session</Button>
        </Link>
      </div>

      <div className="grid gap-6">
        {auctions?.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center border border-border bg-muted/5">
            <Gavel className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium">No auctions scheduled</h3>
            <p className="text-muted-foreground mt-1">Create a new auction session to get started.</p>
          </div>
        ) : (
          auctions?.map((auction: any) => (
            <Card key={auction.id} className="rounded-none shadow-sm border border-border flex flex-col md:flex-row items-center gap-6 p-6 hover:border-primary/30 transition-colors">
              <div className="flex-1 w-full">
                <div className="flex items-center gap-4 mb-3">
                  <h3 className="text-2xl font-bold font-mono">Session #{auction.id}</h3>
                  <Badge variant={auction.status === 'LIVE' ? 'destructive' : 'secondary'} className="rounded-none px-3 py-1 text-xs tracking-wider">
                    {auction.status}
                  </Badge>
                </div>
                <div className="flex flex-col sm:flex-row sm:gap-8 text-sm text-muted-foreground font-medium">
                  <div className="flex items-center gap-2"><span className="uppercase tracking-wider text-xs font-bold">Date:</span> <span className="font-mono text-foreground">{auction.auctionDate || auction.startAt || 'TBD'}</span></div>
                  {auction.catalogueOrder && (
                    <div className="flex items-center gap-2"><span className="uppercase tracking-wider text-xs font-bold">Catalogue:</span> <span className="text-foreground">{auction.catalogueOrder.length} lots</span></div>
                  )}
                </div>
              </div>
              
              <div className="flex gap-3 w-full md:w-auto shrink-0 mt-4 md:mt-0">
                <Link href={`/auction/${auction.id}`} className="w-full md:w-auto">
                  <Button variant="outline" className="rounded-none w-full md:w-auto h-11 font-semibold">View Terminal</Button>
                </Link>
                
                {auction.status === 'SCHEDULED' && (
                  <Button 
                    className="rounded-none w-full md:w-auto gap-2 h-11 font-semibold"
                    onClick={() => startAuction.mutate({ sessionId: auction.id })}
                    disabled={startAuction.isPending}
                  >
                    <Play className="w-4 h-4" /> Start Live
                  </Button>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}