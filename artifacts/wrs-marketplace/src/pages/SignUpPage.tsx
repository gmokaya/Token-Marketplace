import { SignUp } from "@clerk/react";

export default function SignUpPage() {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-auth-gradient" />
      <div className="absolute inset-0 auth-pattern opacity-10" />
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
      <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-white/5 blur-2xl" />

      <div className="relative z-10 w-full max-w-[480px] mx-4">
        <div className="rounded-2xl overflow-hidden auth-glass-card shadow-2xl">
          <div className="flex items-center gap-3 pt-8 pb-4 px-8">
            <img src={`${basePath}/logo.svg`} alt="WRS" className="w-9 h-9 drop-shadow" />
            <div>
              <p className="font-bold text-lg leading-tight text-white tracking-tight">WRS Marketplace</p>
              <p className="text-white/60 text-xs leading-tight">Create your trading account</p>
            </div>
          </div>

          <div className="px-4 pb-4">
            <SignUp
              routing="path"
              path={`${basePath}/sign-up`}
              signInUrl={`${basePath}/sign-in`}
              appearance={{
                elements: {
                  rootBox: "w-full",
                  cardBox: "w-full !shadow-none !border-0 !bg-transparent",
                  card: "!shadow-none !border-0 !bg-transparent !rounded-none",
                  footer: "!shadow-none !border-0 !bg-white/5",
                  headerTitle: "!text-white",
                  headerSubtitle: "!text-white/70",
                  formButtonPrimary: "!bg-primary hover:!bg-primary/90",
                  formFieldInput: "!bg-white/10 !border-white/20 !text-white placeholder:!text-white/40",
                  formFieldLabel: "!text-white/80",
                  dividerLine: "!bg-white/20",
                  dividerText: "!text-white/50",
                  socialButtonsBlockButton: "!border-white/20 !bg-white/5 hover:!bg-white/15",
                  socialButtonsBlockButtonText: "!text-white",
                  footerActionLink: "!text-white/80",
                  footerActionText: "!text-white/60",
                  identityPreviewText: "!text-white",
                },
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
