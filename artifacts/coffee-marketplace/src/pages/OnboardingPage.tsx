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
        <div className="market-auth-story max-w-lg hidden md:block pt-12">
          <p className="market-auth-story-kicker">
            <span></span> Secure Market Access
          </p>
          <h1 className="market-auth-story-title" style={{ fontSize: "clamp(2.5rem, 5vw, 4.5rem)", marginTop: "24px" }}>
            Trade on the <br />
            <span>real</span> supply chain.
          </h1>
          <p className="market-auth-story-description" style={{ fontSize: "16px" }}>
            Complete your profile to access East Africa&apos;s sourcing desk. We verify every participant to ensure a trusted, reliable market for certified coffee.
          </p>
        </div>
        <section className="market-auth-form-wrap w-full">
          <div className="market-auth-form-card market-auth-form-card--onboarding">
            <OnboardingWizard
              marketName="Coffee Marketplace"
              commodities={["Arabica coffee", "Robusta coffee", "Green coffee", "Parchment coffee", "Natural coffee", "Washed coffee", "Honey-process coffee"]}
            />
          </div>
        </section>
      </main>
      <footer className="market-auth-footer">
        <span className="text-white/40 text-xs tracking-widest uppercase">Verified by TokenHarvest</span>
      </footer>
    </div>
  );
}