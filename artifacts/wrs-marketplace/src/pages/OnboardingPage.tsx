import { Link } from "wouter";
import OnboardingWizard from "../components/OnboardingWizard";

type OnboardingPageProps = {
  marketName?: string;
  backgroundSrc?: string;
  shellClass?: string;
};

export default function OnboardingPage({
  marketName = "Grain Marketplace",
  backgroundSrc,
  shellClass = "market-auth-shell--grain",
}: OnboardingPageProps) {
  const bp = import.meta.env.BASE_URL.replace(/\/$/, "");

  return (
    <div
      className={`market-auth-shell ${shellClass} market-auth-shell--onboarding`}
    >
      <img
        src={backgroundSrc ?? `${bp}/photos/hero-soybean-farmer.jpg`}
        alt=""
        className="market-auth-background"
        fetchPriority="high"
      />
      <div className="market-auth-overlay" />

      <header className="market-auth-header">
        <Link href="/">
          <span className="tokenharvest-wordmark market-auth-wordmark">
            TokenHarvest
          </span>
        </Link>
      </header>

      <main className="market-auth-main items-start mt-8">
        <div className="market-auth-story max-w-lg hidden md:block pt-12">
          <p className="market-auth-story-kicker">
            <span></span> Secure Market Access
          </p>
          <h1
            className="market-auth-story-title"
            style={{
              fontSize: "clamp(2.5rem, 5vw, 4.5rem)",
              marginTop: "24px",
            }}
          >
            Trade on the <br />
            <span>real</span> supply chain.
          </h1>
          <p
            className="market-auth-story-description"
            style={{ fontSize: "16px" }}
          >
            Complete your profile to access East Africa's sourcing desk. We
            verify every participant to ensure a trusted, reliable market for
            certified grain.
          </p>
        </div>

        <section className="market-auth-form-wrap w-full">
          <div className="market-auth-form-card market-auth-form-card--onboarding">
            <OnboardingWizard marketName={marketName} />
          </div>
        </section>
      </main>

      <footer className="market-auth-footer">
        <span className="text-white/40 text-xs tracking-widest uppercase">
          Verified by TokenHarvest
        </span>
      </footer>
    </div>
  );
}
