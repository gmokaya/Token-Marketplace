import { useListAuctions, useGetPlatformEarnings, useListAuditLog } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Link } from "wouter";

export default function AdminAuctions() {
  const { data: auctions, isLoading } = useListAuctions();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Auction Sessions</h1>
          <p className="text-muted-foreground mt-1">Manage and monitor live platform auctions.</p>
        </div>
        <Link href="/admin/auctions/new">
          <Button className="gap-2"><Plus className="w-4 h-4" /> Schedule Session</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-64 w-full" /> : auctions?.length ? (
            <div className="divide-y">
              {auctions.map(auction => (
                <div key={auction.id} className="py-4 flex justify-between items-center">
                  <div>
                    <div className="font-bold flex items-center gap-2">
                      Auction #{auction.id}
                      <Badge variant={auction.status === 'OPEN' ? 'default' : 'secondary'}>{auction.status}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Start: {format(new Date(auction.startAt), 'MMM d, yyyy HH:mm')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono">${auction.currentHighBidUsd || auction.reservePriceUsd}</div>
                    <div className="text-sm text-muted-foreground">{auction.bidCount || 0} bids</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
             <div className="text-center py-12 text-muted-foreground">No auctions scheduled.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
