import { ArrowRight } from "lucide-react";
import { SignIn } from "@clerk/react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const appearance = {
  variables: {
    colorPrimary: "#0a4a46",
    colorForeground: "#103b38",
    colorMutedForeground: "#6c8782",
    colorBackground: "#ffffff",
    colorInput: "#f8fbfa",
    colorInputForeground: "#103b38",
    colorNeutral: "#dbe9e6",
    fontFamily: "'Jost', sans-serif",
    borderRadius: "0.35rem",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "!w-full !max-w-none !shadow-none !border-0 !rounded-none !bg-transparent",
    card: "!w-full !shadow-none !border-0 !bg-transparent !p-0",
    header: "!hidden",
    logoBox: "!hidden",
    socialButtonsBlockButton:
      "!h-11 !rounded-sm !border !border-[#dbe9e6] !bg-white !text-[#103b38] !text-sm !font-medium !shadow-none hover:!bg-[#f8fbfa] hover:!border-[#a8c9c3] transition-colors",
    socialButtonsBlockButtonText: "!text-[#103b38] !font-medium",
    dividerRow: "!text-[#7d9994] !text-xs",
    dividerText: "!bg-white !px-3",
    formFieldLabel: "!text-sm !text-[#315f59] !font-medium !mb-1.5",
    formFieldInput:
      "!h-11 !rounded-sm !bg-[#f8fbfa] !border !border-[#dbe9e6] !text-[#103b38] !placeholder-[#7d9994] focus:!ring-2 focus:!ring-[#0a4a46]/20 focus:!border-[#0a4a46] transition-colors",
    formFieldInputShowPasswordButton: "!text-[#7d9994] hover:!text-[#0a4a46]",
    formButtonPrimary:
      "!h-11 !rounded-sm !bg-[#0a4a46] !text-white !font-semibold !shadow-none hover:!bg-[#063a37] transition-colors",
    footer: "!hidden",
    identityPreviewText: "!text-[#315f59]",
    identityPreviewEditButton: "!text-[#0a4a46]",
    formResendCodeLink: "!text-[#0a4a46]",
    otpCodeFieldInput: "!border-[#dbe9e6] !rounded-sm",
    alert: "!rounded-sm",
  },
};

export default function SignInPage() {
  return (
    <main className="min-h-[100dvh] bg-[#eff7f5] px-5 py-8 text-[#103b38]">
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-[440px] flex-col justify-center">
        <div className="mb-8 text-center">
          <img
            src={`${basePath}/logo-dark.png`}
            alt="TokenHarvest"
            className="mx-auto mb-8 h-9 w-auto object-contain"
          />
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.24em] text-[#16766d]">
            TokenHarvest
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-[#103b38]">
            Sign in to your account
          </h1>
          <p className="mt-2 text-sm text-[#6c8782]">
            Access the TokenHarvest platform.
          </p>
        </div>

        <section className="rounded-sm border border-[#dbe9e6] bg-white p-7 shadow-[0_16px_50px_rgba(10,74,70,0.08)] sm:p-9">
          <SignIn
            routing="path"
            path={`${basePath}/sign-in`}
            signUpUrl={`${basePath}/sign-up`}
            fallbackRedirectUrl={`${basePath}/admin/homepage`}
            signUpFallbackRedirectUrl={`${basePath}/admin/homepage`}
            appearance={appearance}
          />
          <p className="mt-6 text-center text-sm text-[#6c8782]">
            Don&apos;t have an account?{" "}
            <a
              href={`${basePath}/sign-up`}
              className="font-semibold text-[#0a4a46] hover:text-[#063a37]"
            >
              Create one
            </a>
          </p>
        </section>

        <a
          href={basePath || "/"}
          className="mx-auto mt-7 inline-flex items-center gap-2 text-xs text-[#7d9994] transition-colors hover:text-[#0a4a46]"
        >
          Back to website <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </div>
    </main>
  );
}