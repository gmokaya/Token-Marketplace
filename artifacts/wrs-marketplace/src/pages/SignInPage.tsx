import { SignIn, SignUp } from "@clerk/react";
import { Link } from "wouter";
import { AuthBenefitCarousel } from "@/components/AuthBenefitCarousel";

const clerkAppearance = {
  variables: {
    colorPrimary: "#d9dee5",
    colorForeground: "#ffffff",
    colorMutedForeground: "rgba(255,255,255,0.65)",
    colorBackground: "transparent",
    colorInput: "rgba(255,255,255,0.88)",
    colorInputForeground: "#111827",
    colorNeutral: "rgba(255,255,255,0.2)",
    fontFamily: "'Futura', 'Century Gothic', sans-serif",
    borderRadius: "0.375rem",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "!shadow-none !border-0 !rounded-none !w-full !bg-transparent",
    card: "!shadow-none !border-0 !bg-transparent !p-0",
    header: "!hidden",
    logoBox: "!hidden",
    socialButtonsBlockButton:
      "!border !border-white/30 !bg-white/15 !text-white !text-sm !font-medium !shadow-none !rounded-md !h-11 hover:!bg-white/25 transition-colors",
    socialButtonsBlockButtonText: "!text-white !font-medium",
    socialButtonsBlockButtonArrow: "!text-white",
    dividerRow: "!text-white/50 !text-xs",
    dividerLine: "!bg-white/20",
    dividerText: "!bg-transparent !text-white/50 !px-3",
    formFieldLabel: "!text-sm !text-white/80 !font-medium !mb-1",
    formFieldInput:
      "!bg-white/88 !border !border-white/30 !text-gray-900 !placeholder-gray-400 !rounded-md !h-11 focus:!ring-2 focus:!ring-white/40 focus:!border-white/60 transition-colors",
    formButtonPrimary:
      "!bg-white !text-gray-900 !font-semibold !h-11 !rounded-md !shadow-none hover:!bg-white/90 transition-colors !mt-1",
    footer: "!hidden",
    identityPreviewText: "!text-white",
    identityPreviewEditButton: "!text-slate-200",
    formResendCodeLink: "!text-slate-200",
    otpCodeFieldInput: "!border-white/30 !rounded-md !bg-white/88",
    alert: "!rounded-md !bg-white/10 !border-white/20",
    alertText: "!text-white",
  },
};

export default function SignInPage() {
  const bp = import.meta.env.BASE_URL.replace(/\/$/, "");
  const isSignUp = new URLSearchParams(window.location.search).get("mode") === "sign-up";

  return (
    <div className="market-auth-shell market-auth-shell--grain">
      <img
        src={`${bp}/photos/hero-soybean-farmer.jpg`}
        alt=""
        className="market-auth-background"
        fetchPriority="high"
      />
      <div className="market-auth-overlay" />

      <header className="market-auth-header">
        <Link href="/">
          <span className="tokenharvest-wordmark market-auth-wordmark">TokenHarvest</span>
        </Link>
      </header>

      <main className="market-auth-main">
        <AuthBenefitCarousel
          eyebrow="Grain sourcing desk · 03"
          accentColor="#d7e0e8"
          slides={[
            {
              eyebrow: "Certified storage",
              title: "Know the lot\nbefore it moves.",
              description: "See grade, volume, warehouse status, and a clear route from stored grain to delivery.",
            },
            {
              eyebrow: "Finance-ready trade",
              title: "Turn stored grain\ninto working capital.",
              description: "Connect warehouse receipts with forward contracts and trade finance built for the real supply chain.",
            },
            {
              eyebrow: "Market visibility",
              title: "Buy with a record,\nnot a promise.",
              description: "Compare verified East African supply through one sourcing desk made for serious grain buyers.",
            },
          ]}
        />

        <section className="market-auth-form-wrap">
          <div className="market-auth-form-card">
            <div className="market-auth-form-heading">
              <p className="market-auth-form-kicker">Buyer access · Grain market</p>
              <h1>{isSignUp ? "Create your Grain Marketplace account" : "Sign in to Grain Marketplace"}</h1>
              <p>
                {isSignUp
                  ? "Join the sourcing desk for certified, delivery-ready grain."
                  : "Access certified lots, warehouse receipts, and delivery-ready grain."}
              </p>
            </div>

            {isSignUp ? (
              <SignUp
                routing="path"
                path={`${bp}/sign-in`}
                signInUrl={`${bp}/sign-in`}
                fallbackRedirectUrl={`${bp}/onboarding`}
                appearance={clerkAppearance}
              />
            ) : (
              <SignIn
                routing="path"
                path={`${bp}/sign-in`}
                signUpUrl={`${bp}/sign-in?mode=sign-up`}
                fallbackRedirectUrl={`${bp}/dashboard`}
                appearance={clerkAppearance}
              />
            )}

            <p className="market-auth-form-switch">
              {isSignUp ? "Already have an account? " : "Don’t have an account? "}
              <a href={isSignUp ? `${bp}/sign-in` : `${bp}/sign-up`}>
                {isSignUp ? "Sign in" : "Sign up"}
              </a>
            </p>
          </div>
        </section>
      </main>

      <footer className="market-auth-footer">
        <a href={bp || "/"}>Back to home</a>
      </footer>
    </div>
  );
}
