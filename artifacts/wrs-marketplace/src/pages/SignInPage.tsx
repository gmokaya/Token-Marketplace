import { ArrowRight } from "lucide-react";
import { SignIn } from "@clerk/react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const appearance = {
  variables: {
    colorPrimary: "#4a4a4a",
    colorForeground: "#1f1f1f",
    colorMutedForeground: "#777777",
    colorBackground: "#ffffff",
    colorInput: "#fafafa",
    colorInputForeground: "#1f1f1f",
    colorNeutral: "#e4e4e4",
    fontFamily: "'Futura', sans-serif",
    borderRadius: "0.35rem",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "!w-full !max-w-none !shadow-none !border-0 !rounded-none !bg-transparent",
    card: "!w-full !shadow-none !border-0 !bg-transparent !p-0",
    header: "!hidden",
    logoBox: "!hidden",
    socialButtonsBlockButton:
      "!h-11 !rounded-sm !border !border-[#dedede] !bg-white !text-[#1f1f1f] !text-sm !font-medium !shadow-none hover:!bg-[#fafafa] hover:!border-[#bdbdbd] transition-colors",
    socialButtonsBlockButtonText: "!text-[#1f1f1f] !font-medium",
    dividerRow: "!text-[#8c8c8c] !text-xs",
    dividerText: "!bg-white !px-3",
    formFieldLabel: "!text-sm !text-[#4a4a4a] !font-medium !mb-1.5",
    formFieldInput:
      "!h-11 !rounded-sm !bg-[#fafafa] !border !border-[#dedede] !text-[#1f1f1f] !placeholder-[#999999] focus:!ring-2 focus:!ring-[#4a4a4a]/15 focus:!border-[#4a4a4a] transition-colors",
    formFieldInputShowPasswordButton: "!text-[#8c8c8c] hover:!text-[#4a4a4a]",
    formButtonPrimary:
      "!h-11 !rounded-sm !bg-[#4a4a4a] !text-white !font-semibold !shadow-none hover:!bg-[#303030] transition-colors",
    footer: "!hidden",
    identityPreviewText: "!text-[#4a4a4a]",
    identityPreviewEditButton: "!text-[#4a4a4a]",
    formResendCodeLink: "!text-[#4a4a4a]",
    otpCodeFieldInput: "!border-[#dedede] !rounded-sm",
    alert: "!rounded-sm",
  },
};

export default function SignInPage() {
  return (
    <main className="min-h-[100dvh] bg-[#f2f2f2] px-5 py-8 text-[#1f1f1f]">
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-[440px] flex-col justify-center">
        <div className="mb-8 text-center">
          <img
            src={`${basePath}/logo-dark.png`}
            alt="GrainEx"
            className="mx-auto mb-8 h-9 w-auto object-contain"
          />
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.24em] text-[#666666]">
            GrainEx
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-[#1f1f1f]">
            Sign in to your account
          </h1>
          <p className="mt-2 text-sm text-[#777777]">
            Access the grain market.
          </p>
        </div>

        <section className="rounded-sm border border-[#dedede] bg-white p-7 shadow-[0_16px_50px_rgba(0,0,0,0.07)] sm:p-9">
          <SignIn
            routing="path"
            path={`${basePath}/sign-in`}
            signUpUrl={`${basePath}/sign-up`}
            fallbackRedirectUrl={`${basePath}/dashboard`}
            signUpFallbackRedirectUrl={`${basePath}/dashboard`}
            appearance={appearance}
          />
          <p className="mt-6 text-center text-sm text-[#777777]">
            Don&apos;t have an account?{" "}
            <a
              href={`${basePath}/sign-up`}
              className="font-semibold text-[#4a4a4a] hover:text-[#303030]"
            >
              Create one
            </a>
          </p>
        </section>

        <a
          href={basePath || "/"}
          className="mx-auto mt-7 inline-flex items-center gap-2 text-xs text-[#8c8c8c] transition-colors hover:text-[#4a4a4a]"
        >
          Back to marketplace <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </div>
    </main>
  );
}