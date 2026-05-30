import { Layout } from "@/components/layout/Layout";
import { useGetMe } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { customFetch } from "@workspace/api-client-react";
import { Building2, Phone, CreditCard, Shield, CheckCircle2, Clock, AlertCircle } from "lucide-react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const ONBOARDING_COLORS: Record<string, string> = {
  PENDING_KYB_APPROVAL: "bg-amber-100 text-amber-800 border-amber-200",
  WRSC_VERIFIED: "bg-blue-100 text-blue-800 border-blue-200",
  ACTIVE: "bg-green-100 text-green-800 border-green-200",
  REJECTED: "bg-red-100 text-red-700 border-red-200",
};

const ONBOARDING_ICONS: Record<string, React.ReactNode> = {
  PENDING_KYB_APPROVAL: <Clock className="w-3 h-3" />,
  WRSC_VERIFIED: <CheckCircle2 className="w-3 h-3" />,
  ACTIVE: <CheckCircle2 className="w-3 h-3" />,
  REJECTED: <AlertCircle className="w-3 h-3" />,
};

export default function Profile() {
  const { data: user, isLoading: userLoading } = useGetMe();
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    customFetch(`${basePath}/api/profiles/me`)
      .then((r) => (r as Response).json())
      .then((data) => {
        setProfile(data);
        setProfileLoading(false);
      })
      .catch(() => setProfileLoading(false));
  }, [user]);

  const isLoading = userLoading || profileLoading;
  const tierProfile = profile?.tierProfile;

  // Extended user type for fields not yet in generated API client
  const u = user as any;

  if (isLoading) {
    return (
      <Layout>
        <Skeleton className="h-96 max-w-3xl mx-auto" />
      </Layout>
    );
  }

  const onboardingStatus = u?.onboardingStatus ?? "PENDING_KYB_APPROVAL";
  const statusColor = ONBOARDING_COLORS[onboardingStatus] ?? "bg-gray-100 text-gray-700";
  const statusIcon = ONBOARDING_ICONS[onboardingStatus] ?? null;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">User Profile</h1>
          <Badge variant="outline" className={`text-xs font-medium px-2.5 py-1 border ${statusColor}`}>
            <span className="flex items-center gap-1.5">
              {statusIcon}
              {onboardingStatus.replace(/_/g, " ")}
            </span>
          </Badge>
        </div>

        {/* General Identity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Shield className="w-4 h-4 text-primary" />
              General Identity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-y-4 gap-x-6">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium text-lg">{u?.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium text-lg">{u?.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Company</p>
                <p className="font-medium text-lg">{u?.company || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Role</p>
                <p className="font-medium text-lg">{u?.tier}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium text-lg">{u?.phone || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">National ID</p>
                <p className="font-medium text-lg">{u?.nationalId || "N/A"}</p>
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

        {/* Tier Profile */}
        {tierProfile && user?.tier === "PRODUCER" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Building2 className="w-4 h-4 text-primary" />
                Producer Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                <div><p className="text-sm text-muted-foreground">Entity Name</p><p className="font-medium">{tierProfile.entityName}</p></div>
                <div><p className="text-sm text-muted-foreground">Registration Number</p><p className="font-medium">{tierProfile.registrationNumber}</p></div>
                <div><p className="text-sm text-muted-foreground">KRA PIN</p><p className="font-medium">{tierProfile.kraPin || "N/A"}</p></div>
                <div><p className="text-sm text-muted-foreground">Office Address</p><p className="font-medium">{tierProfile.officeAddress || "N/A"}</p></div>
                <div><p className="text-sm text-muted-foreground">Admin Name</p><p className="font-medium">{tierProfile.adminFirstName} {tierProfile.adminLastName}</p></div>
                <div><p className="text-sm text-muted-foreground">Admin Phone</p><p className="font-medium">{tierProfile.adminPhone || "N/A"}</p></div>
                <div><p className="text-sm text-muted-foreground">Admin Email</p><p className="font-medium">{tierProfile.adminEmail || "N/A"}</p></div>
                <div><p className="text-sm text-muted-foreground">Bank Name</p><p className="font-medium">{tierProfile.bankName || "N/A"}</p></div>
                <div><p className="text-sm text-muted-foreground">Bank Account</p><p className="font-medium">{tierProfile.bankAccountNumber || "N/A"}</p></div>
                <div><p className="text-sm text-muted-foreground">Factory Marks</p><p className="font-medium">{tierProfile.factoryMarks || "N/A"}</p></div>
              </div>
            </CardContent>
          </Card>
        )}

        {tierProfile && user?.tier === "OFF_TAKER" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <CreditCard className="w-4 h-4 text-primary" />
                Off-Taker Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                <div><p className="text-sm text-muted-foreground">Company Legal Name</p><p className="font-medium">{tierProfile.companyLegalName}</p></div>
                <div><p className="text-sm text-muted-foreground">Registration Number</p><p className="font-medium">{tierProfile.registrationNumber}</p></div>
                <div><p className="text-sm text-muted-foreground">KRA PIN</p><p className="font-medium">{tierProfile.kraPin || "N/A"}</p></div>
                <div><p className="text-sm text-muted-foreground">Office Address</p><p className="font-medium">{tierProfile.officeAddress || "N/A"}</p></div>
                <div><p className="text-sm text-muted-foreground">Bank Name</p><p className="font-medium">{tierProfile.bankName || "N/A"}</p></div>
                <div><p className="text-sm text-muted-foreground">Bank Account</p><p className="font-medium">{tierProfile.bankAccountNumber || "N/A"}</p></div>
                <div><p className="text-sm text-muted-foreground">Authorized Buyer</p><p className="font-medium">{tierProfile.buyerPersonnelName || "N/A"}</p></div>
                <div><p className="text-sm text-muted-foreground">Buyer Phone</p><p className="font-medium">{tierProfile.buyerPersonnelPhone || "N/A"}</p></div>
                <div><p className="text-sm text-muted-foreground">Buyer Email</p><p className="font-medium">{tierProfile.buyerPersonnelEmail || "N/A"}</p></div>
                <div><p className="text-sm text-muted-foreground">Purchasing Limit (USD)</p><p className="font-medium">{tierProfile.purchasingLimitUsd || "N/A"}</p></div>
              </div>
            </CardContent>
          </Card>
        )}

        {tierProfile && user?.tier === "ENABLER" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Building2 className="w-4 h-4 text-primary" />
                Warehouse Operator Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                <div><p className="text-sm text-muted-foreground">Operator Name</p><p className="font-medium">{tierProfile.operatorName}</p></div>
                <div><p className="text-sm text-muted-foreground">WRSC License</p><p className="font-medium">{tierProfile.wrscLicenseNumber}</p></div>
                <div><p className="text-sm text-muted-foreground">Capacity</p><p className="font-medium">{tierProfile.capacityMt || "N/A"} MT</p></div>
                <div><p className="text-sm text-muted-foreground">In-Charge Name</p><p className="font-medium">{tierProfile.warehouseInChargeName || "N/A"}</p></div>
                <div><p className="text-sm text-muted-foreground">In-Charge Phone</p><p className="font-medium">{tierProfile.warehouseInChargePhone || "N/A"}</p></div>
                <div><p className="text-sm text-muted-foreground">In-Charge Email</p><p className="font-medium">{tierProfile.warehouseInChargeEmail || "N/A"}</p></div>
                <div><p className="text-sm text-muted-foreground">Insurer</p><p className="font-medium">{tierProfile.insurerName || "N/A"}</p></div>
                <div><p className="text-sm text-muted-foreground">Policy Number</p><p className="font-medium">{tierProfile.insurancePolicyNumber || "N/A"}</p></div>
              </div>
            </CardContent>
          </Card>
        )}

        {tierProfile && user?.tier === "FINANCIER" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <CreditCard className="w-4 h-4 text-primary" />
                Financier Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                <div><p className="text-sm text-muted-foreground">Institution</p><p className="font-medium">{tierProfile.institutionName}</p></div>
                <div><p className="text-sm text-muted-foreground">Central Bank License</p><p className="font-medium">{tierProfile.centralBankLicenseCode}</p></div>
                <div><p className="text-sm text-muted-foreground">Department</p><p className="font-medium">{tierProfile.departmentDesignation || "N/A"}</p></div>
                <div><p className="text-sm text-muted-foreground">Credit Approver</p><p className="font-medium">{tierProfile.creditApproverName || "N/A"}</p></div>
                <div><p className="text-sm text-muted-foreground">Approver Email</p><p className="font-medium">{tierProfile.creditApproverEmail || "N/A"}</p></div>
                <div><p className="text-sm text-muted-foreground">Max Liquidity Pool</p><p className="font-medium">{tierProfile.maxLiquidityPoolUsd ? `$${tierProfile.maxLiquidityPoolUsd}` : "N/A"}</p></div>
              </div>
            </CardContent>
          </Card>
        )}

        {!tierProfile && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="py-6 text-center">
              <p className="text-sm text-amber-800 font-medium">
                Your tier-specific profile is not yet submitted.
              </p>
              <p className="text-xs text-amber-600 mt-1">
                Complete onboarding to unlock full marketplace features.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
