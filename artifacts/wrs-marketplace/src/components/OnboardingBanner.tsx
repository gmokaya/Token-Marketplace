import { useGetMe } from "@workspace/api-client-react";
import { Link } from "wouter";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

// Extended user type with new onboarding fields (not yet in generated API client)
type ExtendedUser = {
  onboardingStatus?: "PENDING_KYB_APPROVAL" | "WRSC_VERIFIED" | "ACTIVE" | "REJECTED";
};

export function OnboardingBanner() {
  const { data: user } = useGetMe();
  const status = (user as ExtendedUser | undefined)?.onboardingStatus;

  if (!status || status === "ACTIVE") return null;

  if (status === "PENDING_KYB_APPROVAL") {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-800">Complete your onboarding profile</p>
          <p className="text-xs text-amber-700 mt-0.5">
            Your tier-specific KYB details are required before you can trade on the marketplace.
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="border-amber-300 text-amber-800 hover:bg-amber-100">
          <Link href="/profile">Complete Profile</Link>
        </Button>
      </div>
    );
  }

  if (status === "WRSC_VERIFIED") {
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50/80 p-4 flex items-start gap-3">
        <Clock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-800">Profile under review</p>
          <p className="text-xs text-blue-700 mt-0.5">
            Your KYB verification has been submitted and is awaiting WRSC approval.
          </p>
        </div>
      </div>
    );
  }

  if (status === "REJECTED") {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50/80 p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-red-800">Profile rejected</p>
          <p className="text-xs text-red-700 mt-0.5">
            Your KYB submission was rejected. Please update your profile and resubmit.
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="border-red-300 text-red-800 hover:bg-red-100">
          <Link href="/profile">Update Profile</Link>
        </Button>
      </div>
    );
  }

  return null;
}
