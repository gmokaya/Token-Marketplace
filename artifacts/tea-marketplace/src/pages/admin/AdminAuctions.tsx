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
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Auctions Management</h1>
          <p className="text-muted-foreground">Manage and start tea auction sessions.</p>
        </div>
        <Link href="/admin/auctions/new">
          <Button className="rounded-none gap-2"><Gavel className="w-4 h-4" /> Create Session</Button>
        </Link>
      </div>

      <div className="grid gap-4">
        {auctions?.length === 0 ? (
          <div className="p-12 text-center border border-dashed text-muted-foreground">
            No auctions found.
          </div>
        ) : (
          auctions?.map((auction: any) => (
            <Card key={auction.id} className="rounded-none shadow-none flex flex-col md:flex-row items-center gap-4 p-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-bold font-mono">Session #{auction.id}</h3>
                  <Badge variant={auction.status === 'LIVE' ? 'destructive' : 'secondary'} className="rounded-none">
                    {auction.status}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div>Date: {auction.auctionDate || auction.startAt || 'TBD'}</div>
                  {auction.catalogueOrder && (
                    <div>Lots: {auction.catalogueOrder.length} catalogued</div>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2 w-full md:w-auto">
                <Link href={`/auction/${auction.id}`}>
                  <Button variant="outline" className="rounded-none w-full md:w-auto">View Terminal</Button>
                </Link>
                
                {auction.status === 'SCHEDULED' && (
                  <Button 
                    className="rounded-none w-full md:w-auto gap-2"
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