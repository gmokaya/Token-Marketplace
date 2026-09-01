import { SignIn, SignUp } from "@clerk/react";
import { Link } from "wouter";
import { AuthBenefitCarousel } from "@/components/AuthBenefitCarousel";
import teaSignInImage from "@assets/images_(28)_1788267884985.jpg";

const clerkAppearance = {
  variables: {
    colorPrimary: "#4ade80",
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
    identityPreviewEditButton: "!text-green-300",
    formResendCodeLink: "!text-green-300",
    otpCodeFieldInput: "!border-white/30 !rounded-md !bg-white/88",
    alert: "!rounded-md !bg-white/10 !border-white/20",
    alertText: "!text-white",
  },
};

export default function SignInPage() {
  const bp = import.meta.env.BASE_URL.replace(/\/$/, "");
  const isSignUp = new URLSearchParams(window.location.search).get("mode") === "sign-up";

  return (
    <div className="market-auth-shell market-auth-shell--tea">
      <img src={teaSignInImage} alt="" className="market-auth-background" fetchPriority="high" />
      <div className="market-auth-overlay" />

      <header className="market-auth-header">
        <Link href="/">
          <span className="tokenharvest-wordmark market-auth-wordmark">TokenHarvest</span>
        </Link>
      </header>

      <main className="market-auth-main">
        <AuthBenefitCarousel
          eyebrow="Tea house sourcing · 01"
          accentColor="#86efac"
          slides={[
            {
              eyebrow: "Origin with a signature",
              title: "Know the leaf\nbefore it arrives.",
              description: "Source speciality tea with origin, grade, harvest, and factory records in one clear view.",
            },
            {
              eyebrow: "GI-protected supply",
              title: "Distinctive tea,\nbacked by proof.",
              description: "Find expressive East African lots with the provenance and protection serious tea buyers need.",
            },
            {
              eyebrow: "Factory to shelf",
              title: "Trace every handoff,\nfrom garden to shelf.",
              description: "Keep harvest, processing, packing, and shipment records connected to the lot you buy.",
            },
          ]}
        />

        <section className="market-auth-form-wrap">
          <div className="market-auth-form-card">
            <div className="market-auth-form-heading">
              <p className="market-auth-form-kicker">Buyer access · Tea market</p>
              <h1>{isSignUp ? "Create your Tea Marketplace account" : "Sign in to Tea Marketplace"}</h1>
              <p>
                {isSignUp
                  ? "Join the sourcing desk for traceable East African tea."
                  : "Access verified GI tea supply and traceable lot records."}
              </p>
            </div>

            {isSignUp ? (
              <SignUp
                routing="path"
                path={`${bp}/sign-in`}
                signInUrl={`${bp}/sign-in`}
                fallbackRedirectUrl={`${bp}/dashboard`}
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
              <a href={isSignUp ? `${bp}/sign-in` : `${bp}/sign-in?mode=sign-up`}>
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