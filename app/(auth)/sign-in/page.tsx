import { SignInForm } from "@/components/pages/auth/SignInForm";
import { AuthCard } from "@/components/pages/auth/AuthCard";

export default function SignInPage() {
  return (
    <AuthCard title="Welcome Back" subtitle="Sign in to your account">
      <SignInForm />
    </AuthCard>
  );
}
