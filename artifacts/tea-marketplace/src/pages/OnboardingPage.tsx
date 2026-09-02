import GrainOnboardingPage from "../../../wrs-marketplace/src/pages/OnboardingPage";
import teaSignInImage from "@assets/images_(28)_1788267884985.jpg";

export default function OnboardingPage() {
  return (
    <GrainOnboardingPage
      marketName="Tea Marketplace"
      backgroundSrc={teaSignInImage}
      shellClass="market-auth-shell--tea"
      market="tea"
    />
  );
}
