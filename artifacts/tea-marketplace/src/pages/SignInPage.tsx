import { SignIn, SignUp } from "@clerk/react";
import { Link } from "wouter";
import { AuthBenefitCarousel } from "@/components/AuthBenefitCarousel";
import teaSignInImage from "@assets/pexels-abellpaul53-7427928_1788340904358.jpg";

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
    identityPreviewEditButton: "!text-[#39744d]",
    formResendCodeLink: "!text-[#39744d]",
    otpCodeFieldInput: "!border-[#d2d2d7] !rounded-xl !bg-[#f5f5f7]",
    alert: "!rounded-xl !bg-[#f5f5f7] !border-[#d2d2d7]",
    alertText: "!text-[#1d1d1f]",
  },
};

export default function SignInPage() {
  const bp = import.meta.env.BASE_URL.replace(/\/$/, "");
  const isSignUp = new URLSearchParams(window.location.search).get("mode") === "sign-up";

  return (
    <div className="market-auth-shell market-auth-shell--auth market-auth-shell--tea">
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
          <div className={`market-auth-form-card ${isSignUp ? "market-auth-form-card--signup" : "market-auth-form-card--signin"}`}>
            <div className="market-auth-form-heading">
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