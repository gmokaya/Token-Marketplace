import { SignUp } from "@clerk/react";
import { Link } from "wouter";

const clerkAppearance = {
  variables: {
    colorPrimary: "#0a2a2a",
    colorForeground: "#111827",
    colorMutedForeground: "#6b7280",
    colorBackground: "#ffffff",
    colorInput: "#f9fafb",
    colorInputForeground: "#111827",
    colorNeutral: "#f3f4f6",
    fontFamily: "'Jost', sans-serif",
    borderRadius: "0.625rem",
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
      "!bg-gray-50 !border !border-gray-200 !text-gray-900 !placeholder-gray-400 !rounded-lg !h-11 focus:!ring-2 focus:!ring-green-700/20 focus:!border-green-700 transition-colors",
    formFieldInputShowPasswordButton: "!text-gray-400 hover:!text-gray-600",
    formButtonPrimary:
      "!bg-gray-900 !text-white !font-semibold !h-11 !rounded-lg !shadow-none hover:!bg-gray-800 transition-colors !mt-1",
    footer: "!hidden",
    footerActionLink: "!text-green-800 !font-semibold hover:!text-green-700",
    identityPreviewText: "!text-gray-700",
    identityPreviewEditButton: "!text-green-800",
    formResendCodeLink: "!text-green-800",
    otpCodeFieldInput: "!border-gray-200 !rounded-lg",
    alert: "!rounded-lg",
  },
};

export default function SignUpPage() {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  return (
    <div className="relative w-screen h-screen overflow-hidden flex items-center justify-end">

      {/* Full-screen portrait background */}
      <img
        src={`${basePath}/photos/tea-portrait.jpg`}
        alt=""
        className="absolute inset-0 w-full h-full object-cover object-center"
        fetchPriority="high"
      />

      {/* Gradients */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/20 to-black/60" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/40" />

      {/* Logo — top left */}
      <div className="absolute top-8 left-8 md:left-12 z-20">
        <Link href="/">
          <img
            src={`${basePath}/logo-white.png`}
            alt="TokenHarvest"
            className="h-7 w-auto cursor-pointer"
          />
        </Link>
      </div>

      {/* Form panel — right-side float */}
      <div className="relative z-10 w-full max-w-[440px] mr-8 md:mr-20 xl:mr-28">
        <div className="bg-white/97 backdrop-blur-md shadow-2xl p-10 overflow-y-auto max-h-screen">
          <div className="mb-7">
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
              Create your account
            </h1>
            <p className="text-sm text-gray-500 mt-1.5">
              Join the TokenHarvest Tea marketplace today.
            </p>
          </div>

          <SignUp
            routing="path"
            path={`${basePath}/sign-up`}
            signInUrl={`${basePath}/sign-in`}
            appearance={clerkAppearance}
          />

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{" "}
            <a
              href={`${basePath}/sign-in`}
              className="font-semibold text-green-800 hover:text-green-700 transition-colors"
            >
              Sign in
            </a>
          </p>
        </div>
      </div>

      {/* Back link */}
      <div className="absolute bottom-7 left-0 right-0 text-center z-20">
        <a
          href={basePath || "/"}
          className="text-xs text-white/40 hover:text-white/70 transition-colors"
        >
          ← Back to home
        </a>
      </div>
    </div>
  );
}
