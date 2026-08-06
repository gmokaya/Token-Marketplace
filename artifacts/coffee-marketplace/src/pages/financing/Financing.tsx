import { useListEligibleEwrs, useListFinancingRequests } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Landmark, ArrowUpRight } from "lucide-react";
import { Link } from "wouter";

export default function Financing() {
  const { data: requests, isLoading: isLoadingRequests } = useListFinancingRequests();
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Financing</h1>
          <p className="text-muted-foreground mt-1">Access liquidity against warehoused coffee eWRs.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Requests & Loans</CardTitle>
          <CardDescription>Your current financing positions.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingRequests ? <Skeleton className="h-64 w-full" /> : requests?.length ? (
            <div className="divide-y">
              {requests.map(req => (
                <div key={req.id} className="py-4 flex justify-between items-center">
                  <div>
                    <div className="font-bold flex items-center gap-2">
                      Request #{req.id}
                      <Badge variant="outline">{req.status}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      eWR ID: {req.ewrId} &bull; LMax: ${req.lMaxUsd}
                    </div>
                  </div>
                  <div>
                    <Link href={`/financing/${req.id}`}>
                      <Button variant="ghost" size="sm" className="gap-1 text-accent">Details <ArrowUpRight className="w-3 h-3" /></Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
             <div className="text-center py-12 text-muted-foreground">No financing requests active.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
