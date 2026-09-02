import { SignIn, SignUp } from "@clerk/react";
import { Link } from "wouter";
import { AuthBenefitCarousel } from "@/components/AuthBenefitCarousel";
import coffeeSignInImage from "@assets/dang-cong-JqF4IS65xEg-unsplash_1788267949650.jpg";

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
    identityPreviewEditButton: "!text-[#8a5a2b]",
    formResendCodeLink: "!text-[#8a5a2b]",
    otpCodeFieldInput: "!border-[#d2d2d7] !rounded-xl !bg-[#f5f5f7]",
    alert: "!rounded-xl !bg-[#f5f5f7] !border-[#d2d2d7]",
    alertText: "!text-[#1d1d1f]",
  },
};

export default function SignInPage() {
  const bp = import.meta.env.BASE_URL.replace(/\/$/, "");
  const isSignUp = new URLSearchParams(window.location.search).get("mode") === "sign-up";

  return (
    <div className="market-auth-shell market-auth-shell--auth market-auth-shell--coffee">
      <img src={coffeeSignInImage} alt="" className="market-auth-background" fetchPriority="high" />
      <div className="market-auth-overlay" />

      <header className="market-auth-header">
        <Link href="/">
          <span className="tokenharvest-wordmark market-auth-wordmark">TokenHarvest</span>
        </Link>
      </header>

      <main className="market-auth-main">
        <AuthBenefitCarousel
          eyebrow="Roastery sourcing · 02"
          accentColor="#fcd34d"
          slides={[
            {
              eyebrow: "Flavour starts at origin",
              title: "Know the cup\nbefore the roast.",
              description: "Source specialty lots with process, grade, and provenance recorded before they reach your roastery.",
            },
            {
              eyebrow: "Repeatable quality",
              title: "Repeatable lots,\nrecorded clearly.",
              description: "Compare flavour, process, and grade data so the next shipment starts from a known profile.",
            },
            {
              eyebrow: "Producer to shipment",
              title: "Keep every handoff\nin view.",
              description: "Follow custody from producer through warehouse, export documents, and shipment in one record.",
            },
          ]}
        />

        <section className="market-auth-form-wrap">
          <div className={`market-auth-form-card ${isSignUp ? "market-auth-form-card--signup" : "market-auth-form-card--signin"}`}>
            <div className="market-auth-form-heading">
              <p className="market-auth-form-kicker">Buyer access · Coffee market</p>
              <h1>{isSignUp ? "Create your Coffee Marketplace account" : "Sign in to Coffee Marketplace"}</h1>
              <p>
                {isSignUp
                  ? "Join the sourcing desk for traceable specialty coffee."
                  : "Source specialty lots with provenance from producer to shipment."}
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