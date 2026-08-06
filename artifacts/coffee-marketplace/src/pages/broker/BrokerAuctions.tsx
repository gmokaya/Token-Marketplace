import { useListTeaAuctionSessions } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Link } from "wouter";
import { ArrowUpRight } from "lucide-react";

export default function BrokerAuctions() {
  const { data: sessions, isLoading } = useListTeaAuctionSessions();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Auction Sessions</h1>
        <p className="text-muted-foreground mt-1">Manage live and scheduled auction rooms.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Session Roster</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-64 w-full" /> : sessions?.length ? (
            <div className="divide-y">
              {sessions.map(session => (
                <div key={session.id} className="py-4 flex justify-between items-center group">
                  <div>
                    <div className="font-bold flex items-center gap-2 text-lg">
                      Session #{session.id}
                      <Badge variant={session.status === 'LIVE' ? 'default' : 'secondary'} className={session.status === 'LIVE' ? 'bg-accent hover:bg-accent/90' : ''}>
                        {session.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Scheduled: {format(new Date(session.auctionDate), 'MMM d, yyyy')}
                    </div>
                  </div>
                  <div>
                    <Link href={`/auction/${session.id}`}>
                      <Button variant="outline" className="gap-2 group-hover:border-accent group-hover:text-accent transition-colors">
                        Enter Room <ArrowUpRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg bg-muted/30">
              No auction sessions assigned to you.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
