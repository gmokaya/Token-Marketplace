import { useGetMe } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Profile() {
  const { data: user } = useGetMe();

  if (!user) return null;

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">Profile</h1>
      
      <Card className="rounded-none shadow-none">
        <CardHeader className="border-b bg-muted/20">
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-y-6">
            <div>
              <div className="text-sm text-muted-foreground font-medium mb-1">Name</div>
              <div className="font-semibold text-lg">{user.name}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground font-medium mb-1">Email</div>
              <div className="font-semibold">{user.email}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground font-medium mb-1">Company</div>
              <div className="font-semibold">{user.company || '—'}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground font-medium mb-1">Role Tier</div>
              <Badge variant="outline" className="rounded-none text-xs tracking-wider">
                {user.tier}
              </Badge>
            </div>
            <div>
              <div className="text-sm text-muted-foreground font-medium mb-1">Reputation Score</div>
              <div className="font-semibold">{user.reputationScore}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground font-medium mb-1">KYB Status</div>
              <Badge 
                variant={user.kybStatus === 'VERIFIED' ? 'default' : 'secondary'} 
                className="rounded-none text-xs"
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