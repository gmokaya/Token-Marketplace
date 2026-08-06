import { SignUp } from "@clerk/react";
import { Link } from "wouter";

const clerkAppearance = {
  variables: {
    colorPrimary: "#374151",
    colorForeground: "#111827",
    colorMutedForeground: "#6b7280",
    colorBackground: "#ffffff",
    colorInput: "#f9fafb",
    colorInputForeground: "#111827",
    colorNeutral: "#f3f4f6",
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
      "!border !border-gray-200 !bg-white !text-gray-800 !text-sm !font-medium !shadow-none !rounded-md !h-11 hover:!bg-gray-50 hover:!border-gray-300 transition-colors",
    socialButtonsBlockButtonText: "!text-gray-800 !font-medium",
    dividerRow: "!text-gray-400 !text-xs",
    dividerText: "!bg-white !px-3",
    formFieldLabel: "!text-sm !text-gray-700 !font-medium !mb-1",
    formFieldInput:
      "!bg-white !border !border-gray-200 !text-gray-900 !placeholder-gray-400 !rounded-md !h-11 focus:!ring-2 focus:!ring-gray-500/20 focus:!border-gray-500 transition-colors",
    formButtonPrimary:
      "!bg-gray-900 !text-white !font-semibold !h-11 !rounded-md !shadow-none hover:!bg-gray-800 transition-colors !mt-1",
    footer: "!hidden",
    identityPreviewText: "!text-gray-700",
    identityPreviewEditButton: "!text-gray-700",
    formResendCodeLink: "!text-gray-700",
    otpCodeFieldInput: "!border-gray-200 !rounded-md",
    alert: "!rounded-md",
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
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/10 to-black/30" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/20" />

      <div className="absolute top-8 left-8 md:left-12 z-20">
        <Link href="/">
          <img src={`${bp}/logo-white.png`} alt="GrainEx" className="h-7 w-auto cursor-pointer opacity-90" />
        </Link>
      </div>

      <div className="relative z-10 w-full max-w-[420px] mr-8 md:mr-16 xl:mr-24">
        <div className="bg-white p-10 shadow-2xl overflow-y-auto max-h-[calc(100vh-4rem)]">
          <div className="mb-7">
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Create your account</h1>
            <p className="text-sm text-gray-500 mt-1.5">Join the GrainEx marketplace today.</p>
          </div>

          <SignUp
            routing="path"
            path={`${bp}/sign-up`}
            signInUrl={`${bp}/sign-in`}
            fallbackRedirectUrl={`${bp}/dashboard`}
            appearance={clerkAppearance}
          />

          <p className="mt-5 text-center text-sm text-gray-500">
            Already have an account?{" "}
            <a href={`${bp}/sign-in`} className="font-semibold text-gray-700 hover:text-gray-900 transition-colors">
              Sign in
            </a>
          </p>
        </div>
      </div>

      <div className="absolute bottom-6 left-0 right-0 text-center z-20">
        <a href={bp || "/"} className="text-xs text-white/50 hover:text-white/80 transition-colors">
          Back to home
        </a>
      </div>
    </div>
  );
}
