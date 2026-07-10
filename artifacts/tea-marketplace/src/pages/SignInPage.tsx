import { SignIn } from "@clerk/react";

export default function SignInPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <SignIn routing="path" path="/sign-in" />
    </div>
  );
}