import { SignIn } from "@clerk/react";

export default function SignInPage() {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-[#fafafa] px-6 py-12">
      {/* Logo */}
      <div className="mb-8">
        <img src={`${basePath}/logo-dark.png`} alt="TokenHarvest" className="h-8 w-auto" />
      </div>

      {/* Clerk card */}
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
        appearance={{
          variables: {
            colorPrimary: "#1a5f3e",
            colorForeground: "#111827",
            colorMutedForeground: "#6b7280",
            colorBackground: "#ffffff",
            colorInput: "#f3f4f6",
            colorInputForeground: "#111827",
            colorNeutral: "#f3f4f6",
            fontFamily: "'Inter', sans-serif",
            borderRadius: "0.75rem",
          },
          elements: {
            rootBox: "w-full max-w-[400px]",
            cardBox: "!shadow-none !border !border-gray-200 !rounded-xl !w-full !bg-white",
            card: "!shadow-none !border-0 !bg-white !rounded-xl",
            headerTitle: "!text-xl !font-semibold !text-gray-900",
            headerSubtitle: "!text-sm !text-gray-500",
            socialButtonsBlockButton: "!border-gray-200 !bg-white !text-gray-900 !text-sm !font-semibold !shadow-none hover:!bg-gray-50",
            socialButtonsBlockButtonText: "!text-gray-900 !font-semibold",
            socialButtonsBlockButtonIcon: "!w-5 !h-5",
            dividerRow: "!text-gray-400",
            formFieldLabel: "!text-sm !text-gray-700 !font-medium",
            formFieldInput: "!bg-gray-50 !border-gray-200 !text-gray-900 !placeholder-gray-400 !rounded-lg !h-11",
            formFieldInputShowPasswordButton: "!text-gray-400",
            formButtonPrimary: "!bg-gray-900 !text-white !font-semibold !h-11 !rounded-lg !shadow-none hover:!bg-gray-800",
            footer: "!bg-gray-50/50 !border-t !border-gray-100 !rounded-b-xl",
            footerActionText: "!text-gray-500 !text-sm",
            footerActionLink: "!text-[#1a5f3e] !font-semibold",
          },
        }}
      />

      {/* Back to home */}
      <a
        href={basePath || "/"}
        className="mt-8 text-sm text-gray-400 hover:text-gray-600 transition-colors"
      >
        ← Back to home
      </a>
    </div>
  );
}
