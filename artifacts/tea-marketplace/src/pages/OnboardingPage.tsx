import { Link } from "wouter";
import OnboardingWizard from "../../../wrs-marketplace/src/components/OnboardingWizard";
import teaSignInImage from "@assets/images_(28)_1788267884985.jpg";

export default function OnboardingPage() {
  return (
    <div className="market-auth-shell market-auth-shell--tea">
      <img src={teaSignInImage} alt="" className="market-auth-background" fetchPriority="high" />
      <div className="market-auth-overlay" />
      <header className="market-auth-header">
        <Link href="/"><span className="tokenharvest-wordmark market-auth-wordmark">TokenHarvest</span></Link>
      </header>
      <main className="market-auth-main items-start mt-8">
        <section className="market-auth-form-wrap w-full">
          <div className="market-auth-form-card market-auth-form-card--onboarding">
            <OnboardingWizard
              marketName="Tea Marketplace"
              commodities={["Black tea", "Green tea", "White tea", "Purple tea", "Orthodox tea", "Herbal tea", "Specialty tea"]}
            />
          </div>
        </section>
      </main>
    </div>
  );
}