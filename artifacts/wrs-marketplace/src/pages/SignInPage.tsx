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
      {/* Logo row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32 }}>
        <img src={`${basePath}/logo.svg`} alt="WRS" style={{ width: 36, height: 36 }} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 17, color: "#111", lineHeight: 1.2 }}>WRS Marketplace</div>
          <div style={{ fontSize: 12, color: "#888", lineHeight: 1.2 }}>Electronic Warehouse Receipt Trading</div>
        </div>
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
