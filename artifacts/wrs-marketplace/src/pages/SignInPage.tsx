import { SignIn, SignUp } from "@clerk/react";
import { Link } from "wouter";
import { AuthBenefitCarousel } from "@/components/AuthBenefitCarousel";
import grainSignInImage from "@assets/pexels-mwesigwa-joel-455894964-38668656_1788340914738.jpg";

const clerkAppearance = {
  variables: {
    colorPrimary: "#1d1d1f",
    colorForeground: "#1d1d1f",
    colorMutedForeground: "#86868b",
    colorBackground: "transparent",
    colorInput: "#f5f5f7",
    colorInputForeground: "#1d1d1f",
    colorNeutral: "#d2d2d7",
    fontFamily: "'PT Sans', sans-serif",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "!shadow-none !border-0 !rounded-none !w-full !bg-transparent",
    card: "!shadow-none !border-0 !bg-transparent !p-0",
    header: "!hidden",
    logoBox: "!hidden",
    socialButtonsBlockButton:
      "!border !border-[#d2d2d7] !bg-[#f5f5f7] !text-[#1d1d1f] !text-sm !font-medium !shadow-none !rounded-xl !h-11 hover:!bg-[#eaeaed] transition-colors",
    socialButtonsBlockButtonText: "!text-[#1d1d1f] !font-medium",
    socialButtonsBlockButtonArrow: "!text-[#1d1d1f]",
    dividerRow: "!text-[#86868b] !text-xs",
    dividerLine: "!bg-[#e5e5ea]",
    dividerText: "!bg-transparent !text-[#86868b] !px-3",
    formFieldLabel: "!text-sm !text-[#1d1d1f] !font-medium !mb-1",
    formFieldInput:
      "!bg-[#f5f5f7] !border !border-[#d2d2d7] !text-[#1d1d1f] !placeholder-[#86868b] !rounded-xl !h-11 focus:!ring-2 focus:!ring-[#1d1d1f]/20 focus:!border-[#1d1d1f]/40 transition-colors",
    formButtonPrimary:
      "!bg-[#1d1d1f] !text-white !font-semibold !h-11 !rounded-xl !shadow-none hover:!bg-[#3a3a3c] transition-colors !mt-1",
    footer: "!hidden",
    identityPreviewText: "!text-[#1d1d1f]",
    identityPreviewEditButton: "!text-[#586bff]",
    formResendCodeLink: "!text-[#586bff]",
    otpCodeFieldInput: "!border-[#d2d2d7] !rounded-xl !bg-[#f5f5f7]",
    alert: "!rounded-xl !bg-[#f5f5f7] !border-[#d2d2d7]",
    alertText: "!text-[#1d1d1f]",
  },
};

export default function SignInPage() {
  const bp = import.meta.env.BASE_URL.replace(/\/$/, "");
  const isSignUp = new URLSearchParams(window.location.search).get("mode") === "sign-up";

  return (
    <div className="market-auth-shell market-auth-shell--auth market-auth-shell--grain">
      <img
        src={grainSignInImage}
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
          accentColor="#46515b"
          slides={[
            {
              eyebrow: "Certified storage",
              title: "Know the lot\nbefore it moves.",
              description: "See grade, volume, warehouse status, and a clear route from stored grain to delivery.",
              accentWords: ["lot", "moves", "grade", "delivery"],
            },
            {
              eyebrow: "Finance-ready trade",
              title: "Turn stored grain\ninto working capital.",
              description: "Connect warehouse receipts with forward contracts and trade finance built for the real supply chain.",
              accentWords: ["stored grain", "working capital", "warehouse receipts", "trade finance"],
            },
            {
              eyebrow: "Market visibility",
              title: "Buy with a record,\nnot a promise.",
              description: "Compare verified East African supply through one sourcing desk made for serious grain buyers.",
              accentWords: ["record", "promise", "East African supply"],
            },
          ]}
        />

        <section className="market-auth-form-wrap">
          <div className={`market-auth-form-card ${isSignUp ? "market-auth-form-card--signup" : "market-auth-form-card--signin"}`}>
            <div className="market-auth-form-heading">
              <h1>{isSignUp ? "Create Grain Marketplace account" : "Sign in to Grain Marketplace"}</h1>
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
