import { SignIn } from "@clerk/react";
import { Link } from "wouter";
import { AuthBenefitCarousel } from "@/components/AuthBenefitCarousel";

const clerkAppearance = {
  variables: {
    colorPrimary: "#fbbf24",
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
    identityPreviewEditButton: "!text-amber-300",
    formResendCodeLink: "!text-amber-300",
    otpCodeFieldInput: "!border-white/30 !rounded-md !bg-white/88",
    alert: "!rounded-md !bg-white/10 !border-white/20",
    alertText: "!text-white",
  },
};

export default function SignInPage() {
  const bp = import.meta.env.BASE_URL.replace(/\/$/, "");

  return (
    <div className="market-auth-shell market-auth-shell--coffee">
      <img
        src={`${bp}/photos/cafe-imports-coffee-storage.jpg`}
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
          eyebrow="Roastery sourcing · 02"
          accentColor="#fcd34d"
          slides={[
            {
              eyebrow: "Flavour starts at origin",
              title: "Know the cup\nbefore the roast.",
              description: "Source specialty lots with process, grade, and provenance recorded before they reach your roastery.",
            },
            {
              eyebrow: "Consistency you can source",
              title: "Repeatable lots,\nrecorded clearly.",
              description: "Compare origin, warehouse, volume, and lot details built for confident repeat buying.",
            },
            {
              eyebrow: "One chain of custody",
              title: "From producer\nto shipment.",
              description: "Keep every handoff visible so your sourcing story is as considered as the coffee in the cup.",
            },
          ]}
        />

        <section className="market-auth-form-wrap">
          <div className="market-auth-form-card">
            <div className="market-auth-form-heading">
              <p className="market-auth-form-kicker">Buyer access · Coffee market</p>
              <h1>Sign in to Coffee Marketplace</h1>
              <p>Source specialty lots with provenance from producer to shipment.</p>
            </div>

            <SignIn
              routing="path"
              path={`${bp}/sign-in`}
              signUpUrl={`${bp}/sign-up`}
              fallbackRedirectUrl={`${bp}/dashboard`}
              appearance={clerkAppearance}
            />

            <p className="market-auth-form-switch">
              Don&apos;t have an account?{" "}
              <a href={`${bp}/sign-up`}>Sign up</a>
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
