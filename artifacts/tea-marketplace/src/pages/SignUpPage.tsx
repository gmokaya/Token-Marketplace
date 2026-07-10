import { SignUp } from "@clerk/react";

export default function SignUpPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <SignUp routing="path" path="/sign-up" />
    </div>
  );
}