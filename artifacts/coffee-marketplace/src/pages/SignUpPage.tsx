import { SignUp } from "@clerk/react";

export default function SignUpPage() {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background py-12">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Create an account</h1>
        <p className="text-muted-foreground mt-2 text-sm">Join the specialty coffee marketplace.</p>
      </div>
      <SignUp path="/sign-up" routing="path" signInUrl="/sign-in" />
    </div>
  );
}
