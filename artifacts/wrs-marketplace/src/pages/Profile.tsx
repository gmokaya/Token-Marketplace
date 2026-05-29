import { Layout } from "@/components/layout/Layout";
import { useGetMe } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Profile() {
  const { data: user, isLoading } = useGetMe();

  if (isLoading) {
    return (
      <Layout>
         <Skeleton className="h-64 max-w-2xl mx-auto" />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">User Profile</h1>
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium text-lg">{user?.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium text-lg">{user?.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Company</p>
                <p className="font-medium text-lg">{user?.company || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Role</p>
                <p className="font-medium text-lg">{user?.tier}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Reputation Score</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-3 h-3 rounded-full ${
                    (user?.reputationScore ?? 0) >= 80 ? "bg-green-500" :
                    (user?.reputationScore ?? 0) >= 60 ? "bg-amber-500" : "bg-red-500"
                  }`} />
                  <p className="font-medium text-lg">{user?.reputationScore}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">KYB Status</p>
                <p className="font-medium text-lg">{user?.kybStatus}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}