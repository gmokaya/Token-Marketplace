import { useListForwardContracts } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Forwards() {
  const { data: contracts, isLoading } = useListForwardContracts();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Forward Contracts</h1>
          <p className="text-muted-foreground mt-1">Secure future delivery of specific lots.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My Contracts</CardTitle>
          <CardDescription>Active and pending forward contracts.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-64 w-full" /> : contracts?.length ? (
            <div className="divide-y">
              {contracts.map(contract => (
                <div key={contract.id} className="py-4 flex justify-between items-center">
                  <div>
                    <div className="font-bold flex items-center gap-2">
                      Contract #{contract.id}
                      <Badge variant="outline">{contract.contractStatus}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Maturity: {format(new Date(contract.maturityDate), 'MMM d, yyyy')} &bull; Volume: {contract.weightMt} MT
                    </div>
                  </div>
                  <div>
                    <Link href={`/forwards/${contract.id}`}>
                      <Button variant="secondary" size="sm">Manage</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
             <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg bg-muted/30">
               No forward contracts found.
             </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
