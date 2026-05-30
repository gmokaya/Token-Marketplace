import { SignIn } from "@clerk/react";

export default function SignInPage() {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  return (
    <div style={{
      minHeight: "100dvh",
      background: "#fff",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      fontFamily: "'Jost', sans-serif",
    }}>
      {/* Logo */}
      <div style={{ marginBottom: 32 }}>
        <img src={`${basePath}/logo-tokenharvest.png`} alt="TokenHarvest" style={{ height: 52, width: "auto", filter: "brightness(0)" }} />
      </div>

      {/* Clerk card */}
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
        appearance={{
          elements: {
            rootBox: "w-full max-w-[420px]",
            cardBox: "!shadow-[0_2px_24px_rgba(0,0,0,0.08)] !border !border-gray-200 !rounded-2xl !w-full !bg-white",
            card: "!shadow-none !border-0 !bg-white !rounded-2xl",
            footer: "!bg-gray-50 !border-t !border-gray-100 !rounded-b-2xl",
          },
        }}
      />

      {/* Back to home */}
      <a href={basePath || "/"} style={{ marginTop: 24, fontSize: 13, color: "#888", textDecoration: "none" }}>
        ← Back to home
      </a>
    </div>
  );
}
