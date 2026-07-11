import { useGetMe } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Profile() {
  const { data: user } = useGetMe();

  if (!user) return null;

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your account information and preferences.</p>
      </div>
      
      <Card className="rounded-none shadow-sm border border-border">
        <CardHeader className="border-b bg-muted/5 p-6">
          <CardTitle className="text-xl font-bold">Account Information</CardTitle>
        </CardHeader>
        <CardContent className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12">
            <div>
              <div className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-2">Name</div>
              <div className="font-medium text-lg">{user.name}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-2">Email</div>
              <div className="font-medium text-lg">{user.email}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-2">Company</div>
              <div className="font-medium text-lg">{user.company || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-2">Role Tier</div>
              <Badge variant="outline" className="rounded-none px-3 py-1 text-xs tracking-wider">
                {user.tier}
              </Badge>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-2">Reputation Score</div>
              <div className="font-mono text-xl font-semibold">{user.reputationScore}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-2">KYB Status</div>
              <Badge 
                variant={user.kybStatus === 'VERIFIED' ? 'default' : 'secondary'} 
                className="rounded-none px-3 py-1 text-xs tracking-wider"
              >
                {user.kybStatus}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}