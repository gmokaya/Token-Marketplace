import { SignUp } from "@clerk/react";
import { Link } from "wouter";
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

export default function SignUpPage() {
  const bp = import.meta.env.BASE_URL.replace(/\/$/, "");

  return (
    <div className="relative flex min-h-[100svh] w-screen items-center justify-end overflow-hidden bg-[#081714] text-white">
      <img src={teaSignInImage} alt="" className="absolute inset-0 h-full w-full object-cover object-center" fetchPriority="high" />
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#05120e]/30 to-[#05120e]/95" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#05120e]/60 via-transparent to-[#05120e]/85" />

      <header className="absolute left-8 top-8 z-20 md:left-12">
        <Link href="/">
          <span className="tokenharvest-wordmark cursor-pointer text-2xl text-white">TokenHarvest</span>
        </Link>
      </header>

      <main className="relative z-10 mr-8 w-full max-w-[460px] md:mr-16 xl:mr-24">
        <section className="border border-white/25 bg-[#071813]/45 p-7 shadow-2xl backdrop-blur-2xl sm:p-10">
          <div className="mb-7">
            <p className="mb-4 text-[10px] font-medium uppercase tracking-[0.24em] text-white/50">Buyer access · Tea market</p>
            <h1 className="text-3xl font-bold tracking-tight text-white">Create your Tea Marketplace account</h1>
            <p className="mt-2 text-sm leading-6 text-white/65">Join the sourcing desk for traceable East African tea.</p>
          </div>

          <SignUp
            routing="path"
            path={`${bp}/sign-up`}
            signInUrl={`${bp}/sign-in`}
            fallbackRedirectUrl={`${bp}/broker`}
            appearance={clerkAppearance}
          />

          <p className="mt-5 text-center text-sm text-white/60">
            Already have an account?{" "}
            <a href={`${bp}/sign-in`} className="font-semibold text-green-300 transition-colors hover:text-green-200">
              Sign in
            </a>
          </p>
        </section>
      </main>

      <footer className="absolute bottom-6 left-0 right-0 z-20 text-center">
        <a href={bp || "/"} className="text-xs uppercase tracking-[0.12em] text-white/40 transition-colors hover:text-white/70">
          Back to home
        </a>
      </footer>
    </div>
  );
}