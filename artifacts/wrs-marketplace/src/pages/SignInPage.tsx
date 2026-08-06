import { SignIn } from "@clerk/react";
import { Link } from "wouter";

const clerkAppearance = {
  variables: {
    colorPrimary: "#3d2a00",
    colorForeground: "#111827",
    colorMutedForeground: "#6b7280",
    colorBackground: "#ffffff",
    colorInput: "#f9fafb",
    colorInputForeground: "#111827",
    colorNeutral: "#f3f4f6",
    fontFamily: "'Futura', 'Century Gothic', sans-serif",
    borderRadius: "0rem",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "!shadow-none !border-0 !rounded-none !w-full !bg-transparent",
    card: "!shadow-none !border-0 !bg-transparent !p-0",
    header: "!hidden",
    logoBox: "!hidden",
    socialButtonsBlockButton:
      "!border !border-gray-200 !bg-white !text-gray-800 !text-sm !font-medium !shadow-none !rounded-lg !h-11 hover:!bg-gray-50 hover:!border-gray-300 transition-colors",
    socialButtonsBlockButtonText: "!text-gray-800 !font-medium",
    dividerRow: "!text-gray-400 !text-xs",
    dividerText: "!bg-white !px-3",
    formFieldLabel: "!text-sm !text-gray-700 !font-medium !mb-1.5",
    formFieldInput:
      "!bg-gray-50 !border !border-gray-200 !text-gray-900 !placeholder-gray-400 !rounded-lg !h-11 focus:!ring-2 focus:!ring-amber-700/20 focus:!border-amber-700 transition-colors",
    formFieldInputShowPasswordButton: "!text-gray-400 hover:!text-gray-600",
    formButtonPrimary:
      "!bg-gray-900 !text-white !font-semibold !h-11 !rounded-lg !shadow-none hover:!bg-gray-800 transition-colors !mt-1",
    footer: "!hidden",
    footerActionText: "!text-gray-500 !text-sm",
    footerActionLink: "!text-amber-800 !font-semibold hover:!text-amber-700",
    identityPreviewText: "!text-gray-700",
    identityPreviewEditButton: "!text-amber-800",
    formResendCodeLink: "!text-amber-800",
    otpCodeFieldInput: "!border-gray-200 !rounded-lg",
    alert: "!rounded-lg",
  },
};

export default function SignInPage() {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  return (
    <div className="min-h-[100dvh] flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-[52%] xl:w-[55%] relative flex-col overflow-hidden">
        <img
          src={`${basePath}/photos/hero-soybean-farmer.jpg`}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a0a00]/90 via-[#3d2a00]/70 to-[#1a0a00]/50" />

        <div className="relative z-10 flex flex-col h-full p-10 xl:p-14">
          <div>
            <Link href="/">
              <img src={`${basePath}/logo-white.png`} alt="GrainEx" className="h-8 w-auto cursor-pointer" />
            </Link>
          </div>

          <div className="flex-1 flex flex-col justify-center max-w-sm">
            <div className="inline-flex items-center gap-2 bg-white/10 text-white/80 text-xs font-medium px-3 py-1.5 rounded-full mb-6 w-fit backdrop-blur-sm border border-white/10">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              B2B Grain Market
            </div>
            <h1 className="text-3xl xl:text-4xl font-bold text-white leading-tight tracking-tight">
              Trade grain warrants
              <br />
              <span className="text-amber-300">with confidence.</span>
            </h1>
            <p className="mt-4 text-white/60 text-sm leading-relaxed">
              Digital eWR tokenisation, compliance-grade KYB, real-time auctions and forward contract settlement, all in one platform.
            </p>
          </div>

          <div className="flex gap-8 border-t border-white/10 pt-6">
            {[
              { value: "4 tiers", label: "Participant classes" },
              { value: "Real-time", label: "Auction engine" },
              { value: "WRSC", label: "Compliance ready" },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-white font-semibold text-sm">{s.value}</p>
                <p className="text-white/50 text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col bg-white">
        <div className="flex items-center justify-between px-6 py-5 lg:hidden border-b border-gray-100">
          <Link href="/">
            <img src={`${basePath}/logo-dark.png`} alt="GrainEx" className="h-7 w-auto cursor-pointer" />
          </Link>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
          <div className="w-full max-w-[380px]">
            <div className="mb-6">
              <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Sign in to GrainEx</h1>
              <p className="text-sm text-gray-500 mt-1">Welcome back. Please sign in to continue.</p>
            </div>

            <SignIn
              routing="path"
              path={`${basePath}/sign-in`}
              signUpUrl={`${basePath}/sign-up`}
              fallbackRedirectUrl={`${basePath}/dashboard`}
              appearance={clerkAppearance}
            />

            <p className="mt-6 text-center text-sm text-gray-500">
              Don't have an account?{" "}
              <a
                href={`${basePath}/sign-up`}
                className="font-semibold text-amber-800 hover:text-amber-700 transition-colors"
              >
                Sign up
              </a>
            </p>
          </div>
        </div>

        <div className="px-8 pb-8 text-center">
          <a
            href={basePath || "/"}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Back to home
          </a>
        </div>
      </div>
    </div>
  );
}
