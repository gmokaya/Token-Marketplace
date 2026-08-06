import { SignIn } from "@clerk/react";

export default function SignInPage() {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Sign in to CoffeeXchange</h1>
        <p className="text-muted-foreground mt-2 text-sm">Welcome back to the marketplace.</p>
      </div>
      <SignIn path="/sign-in" routing="path" signUpUrl="/sign-up" />
    </div>
  );
}
