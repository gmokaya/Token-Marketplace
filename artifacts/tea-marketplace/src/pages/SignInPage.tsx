import { ArrowRight } from "lucide-react";
import { SignIn } from "@clerk/react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const appearance = {
  variables: {
    colorPrimary: "#17624f",
    colorForeground: "#0a2f2b",
    colorMutedForeground: "#68827b",
    colorBackground: "#ffffff",
    colorInput: "#f8fbfa",
    colorInputForeground: "#0a2f2b",
    colorNeutral: "#dceae5",
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
      "!h-11 !rounded-sm !border !border-[#dceae5] !bg-white !text-[#0a2f2b] !text-sm !font-medium !shadow-none hover:!bg-[#f8fbfa] hover:!border-[#a9cabe] transition-colors",
    socialButtonsBlockButtonText: "!text-[#0a2f2b] !font-medium",
    dividerRow: "!text-[#7b9890] !text-xs",
    dividerText: "!bg-white !px-3",
    formFieldLabel: "!text-sm !text-[#2e5a4e] !font-medium !mb-1.5",
    formFieldInput:
      "!h-11 !rounded-sm !bg-[#f8fbfa] !border !border-[#dceae5] !text-[#0a2f2b] !placeholder-[#7b9890] focus:!ring-2 focus:!ring-[#17624f]/20 focus:!border-[#17624f] transition-colors",
    formFieldInputShowPasswordButton: "!text-[#7b9890] hover:!text-[#17624f]",
    formButtonPrimary:
      "!h-11 !rounded-sm !bg-[#17624f] !text-white !font-semibold !shadow-none hover:!bg-[#0f4a3b] transition-colors",
    footer: "!hidden",
    identityPreviewText: "!text-[#2e5a4e]",
    identityPreviewEditButton: "!text-[#17624f]",
    formResendCodeLink: "!text-[#17624f]",
    otpCodeFieldInput: "!border-[#dceae5] !rounded-sm",
    alert: "!rounded-sm",
  },
};

export default function SignInPage() {
  return (
    <main className="min-h-[100dvh] bg-[#f1f7f4] px-5 py-8 text-[#0a2f2b]">
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-[440px] flex-col justify-center">
        <div className="mb-8 text-center">
          <img
            src={`${basePath}/logo-dark.png`}
            alt="TokenHarvest Tea"
            className="mx-auto mb-8 h-9 w-auto object-contain"
          />
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.24em] text-[#23806a]">
            TokenHarvest Tea
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-[#0a2f2b]">
            Sign in to your account
          </h1>
          <p className="mt-2 text-sm text-[#68827b]">
            Access the tea marketplace.
          </p>
        </div>

        <section className="rounded-sm border border-[#dceae5] bg-white p-7 shadow-[0_16px_50px_rgba(19,83,66,0.08)] sm:p-9">
          <SignIn
            routing="path"
            path={`${basePath}/sign-in`}
            signUpUrl={`${basePath}/sign-up`}
            fallbackRedirectUrl={`${basePath}/broker`}
            signUpFallbackRedirectUrl={`${basePath}/broker`}
            appearance={appearance}
          />
          <p className="mt-6 text-center text-sm text-[#68827b]">
            Don&apos;t have an account?{" "}
            <a
              href={`${basePath}/sign-up`}
              className="font-semibold text-[#17624f] hover:text-[#0f4a3b]"
            >
              Create one
            </a>
          </p>
        </section>

        <a
          href={basePath || "/"}
          className="mx-auto mt-7 inline-flex items-center gap-2 text-xs text-[#7b9890] transition-colors hover:text-[#17624f]"
        >
          Back to marketplace <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </div>
    </main>
  );
}