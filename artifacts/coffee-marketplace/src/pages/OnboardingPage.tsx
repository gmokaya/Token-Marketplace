import { Link } from "wouter";
import OnboardingWizard from "../../../wrs-marketplace/src/components/OnboardingWizard";
import coffeeSignInImage from "@assets/dang-cong-JqF4IS65xEg-unsplash_1788267949650.jpg";

export default function OnboardingPage() {
  return (
    <div className="market-auth-shell market-auth-shell--coffee">
      <img src={coffeeSignInImage} alt="" className="market-auth-background" fetchPriority="high" />
      <div className="market-auth-overlay" />
      <header className="market-auth-header">
        <Link href="/"><span className="tokenharvest-wordmark market-auth-wordmark">TokenHarvest</span></Link>
      </header>
      <main className="market-auth-main items-start mt-8">
        <section className="market-auth-form-wrap w-full">
          <div className="market-auth-form-card market-auth-form-card--onboarding">
            <OnboardingWizard
              marketName="Coffee Marketplace"
              commodities={["Arabica coffee", "Robusta coffee", "Green coffee", "Parchment coffee", "Natural coffee", "Washed coffee", "Honey-process coffee"]}
            />
          </div>
        </section>
      </main>
    </div>
  );
}