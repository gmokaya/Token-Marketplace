import { useGetCoopProfile, useListCoopMembers } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Leaf, Users, MapPin, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ProducerEsg() {
  const { data: profile, isLoading: isLoadingProfile } = useGetCoopProfile();
  const { data: members, isLoading: isLoadingMembers } = useListCoopMembers();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
          <Leaf className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">ESG & Cooperative Profile</h1>
          <p className="text-muted-foreground mt-1">Manage your traceability and sustainability credentials.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5 text-muted-foreground" /> Entity Profile</CardTitle>
            <CardDescription>Your registered cooperative details on the platform.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingProfile ? <Skeleton className="h-32 w-full" /> : profile ? (
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-muted-foreground">Entity Name</div>
                  <div className="font-medium">{profile.entityName}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Registration Number</div>
                  <div className="font-mono">{profile.registrationNumber}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Admin Contact</div>
                  <div>{profile.adminFirstName} {profile.adminLastName}</div>
                  <div className="text-sm text-muted-foreground">{profile.adminEmail}</div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground text-sm">
                No cooperative profile registered.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-muted-foreground" /> Member Traceability</CardTitle>
            <CardDescription>Registered outgrowers and cooperative members.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingMembers ? <Skeleton className="h-32 w-full" /> : members && members.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="font-medium text-sm">Total Verified Members</div>
                  <Badge variant="secondary" className="font-mono">{members.length}</Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  Traceability is active. All EWRs created under this cooperative are backed by member intake logs, supporting EUDR compliance and premium specialty certifications.
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground text-sm">
                No members registered yet. Adding members unlocks macro-lot aggregation and ESG traceability.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
