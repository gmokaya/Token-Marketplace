import { ArrowRight } from "lucide-react";
import { SignIn } from "@clerk/react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const appearance = {
  variables: {
    colorPrimary: "#5a3426",
    colorForeground: "#24150f",
    colorMutedForeground: "#806e65",
    colorBackground: "#ffffff",
    colorInput: "#fbfaf9",
    colorInputForeground: "#24150f",
    colorNeutral: "#eee7e2",
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
      "!h-11 !rounded-sm !border !border-[#e4d9d1] !bg-white !text-[#24150f] !text-sm !font-medium !shadow-none hover:!bg-[#fbf8f6] hover:!border-[#c9b6aa] transition-colors",
    socialButtonsBlockButtonText: "!text-[#24150f] !font-medium",
    dividerRow: "!text-[#a08d82] !text-xs",
    dividerText: "!bg-white !px-3",
    formFieldLabel: "!text-sm !text-[#4b372e] !font-medium !mb-1.5",
    formFieldInput:
      "!h-11 !rounded-sm !bg-[#fbfaf9] !border !border-[#e4d9d1] !text-[#24150f] !placeholder-[#a08d82] focus:!ring-2 focus:!ring-[#8b5e4b]/20 focus:!border-[#8b5e4b] transition-colors",
    formFieldInputShowPasswordButton: "!text-[#a08d82] hover:!text-[#5a3426]",
    formButtonPrimary:
      "!h-11 !rounded-sm !bg-[#5a3426] !text-white !font-semibold !shadow-none hover:!bg-[#43251b] transition-colors",
    footer: "!hidden",
    identityPreviewText: "!text-[#4b372e]",
    identityPreviewEditButton: "!text-[#5a3426]",
    formResendCodeLink: "!text-[#5a3426]",
    otpCodeFieldInput: "!border-[#e4d9d1] !rounded-sm",
    alert: "!rounded-sm",
  },
};

export default function SignInPage() {
  return (
    <main className="min-h-[100dvh] bg-[#f5f1ee] px-5 py-8 text-[#24150f]">
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-[440px] flex-col justify-center">
        <div className="mb-8 text-center">
          <img
            src={`${basePath}/logo.png`}
            alt="CoffeeXchange"
            className="mx-auto mb-8 h-9 w-auto object-contain"
          />
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.24em] text-[#8b5e4b]">
            CoffeeXchange
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-[#24150f]">
            Sign in to your account
          </h1>
          <p className="mt-2 text-sm text-[#806e65]">
            Access the green coffee exchange.
          </p>
        </div>

        <section className="rounded-sm border border-[#e4d9d1] bg-white p-7 shadow-[0_16px_50px_rgba(72,43,29,0.08)] sm:p-9">
          <SignIn
            routing="path"
            path={`${basePath}/sign-in`}
            signUpUrl={`${basePath}/sign-up`}
            fallbackRedirectUrl={`${basePath}/dashboard`}
            appearance={appearance}
          />
          <p className="mt-6 text-center text-sm text-[#806e65]">
            Don&apos;t have an account?{" "}
            <a
              href={`${basePath}/sign-up`}
              className="font-semibold text-[#5a3426] hover:text-[#43251b]"
            >
              Create one
            </a>
          </p>
        </section>

        <a
          href={basePath || "/"}
          className="mx-auto mt-7 inline-flex items-center gap-2 text-xs text-[#9b887d] transition-colors hover:text-[#5a3426]"
        >
          Back to marketplace <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </div>
    </main>
  );
}