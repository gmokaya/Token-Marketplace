import GrainOnboardingPage from "../../../wrs-marketplace/src/pages/OnboardingPage";
import coffeeSignInImage from "@assets/dang-cong-JqF4IS65xEg-unsplash_1788267949650.jpg";

export default function OnboardingPage() {
  return (
    <GrainOnboardingPage
      marketName="Coffee Marketplace"
      backgroundSrc={coffeeSignInImage}
      shellClass="market-auth-shell--coffee"
      market="coffee"
    />
  );
}
