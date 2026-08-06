import { SignUp } from "@clerk/react";
import { Link } from "wouter";

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

export default function SignUpPage() {
  const bp = import.meta.env.BASE_URL.replace(/\/$/, "");

  return (
    <div className="relative w-screen h-screen overflow-hidden flex items-center justify-end">
      <img
        src={`${bp}/photos/signin-bg.jpg`}
        alt=""
        className="absolute inset-0 w-full h-full object-cover object-center"
        fetchPriority="high"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/20 to-black/50" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/25" />

      <div className="absolute top-8 left-8 md:left-12 z-20">
        <Link href="/">
          <span className="tokenharvest-wordmark text-white text-2xl cursor-pointer">TokenHarvest</span>
        </Link>
      </div>

      <div className="relative z-10 w-full max-w-[420px] mr-8 md:mr-16 xl:mr-24">
        <div className="bg-white/10 backdrop-blur-2xl border border-white/25 shadow-2xl p-10 overflow-y-auto max-h-[calc(100vh-4rem)]">
          <div className="mb-7">
            <h1 className="text-2xl font-semibold text-white tracking-tight">Create your account</h1>
            <p className="text-sm text-white/65 mt-1.5">Join the Coffee Marketplace today.</p>
          </div>

          <SignUp
            routing="path"
            path={`${bp}/sign-up`}
            signInUrl={`${bp}/sign-in`}
            fallbackRedirectUrl={`${bp}/dashboard`}
            appearance={clerkAppearance}
          />

          <p className="mt-5 text-center text-sm text-white/60">
            Already have an account?{" "}
            <a href={`${bp}/sign-in`} className="font-semibold text-amber-300 hover:text-amber-200 transition-colors">
              Sign in
            </a>
          </p>
        </div>
      </div>

      <div className="absolute bottom-6 left-0 right-0 text-center z-20">
        <a href={bp || "/"} className="text-xs text-white/40 hover:text-white/70 transition-colors">
          Back to home
        </a>
      </div>
    </div>
  );
}
