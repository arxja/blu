import { SignInForm } from "@/components//SignInForm";
import { AuthCard } from "@/components//AuthCard";

export default function SignInPage() {
  return (
    <AuthCard title="Welcome Back" subtitle="Sign in to your account">
      <SignInForm />
    </AuthCard>
  );
}
