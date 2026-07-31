import { SignUpForm } from "@/components/pages/auth/SignUpForm";
import { AuthCard } from "@/components/pages/auth/AuthCard";

export default function SignUpPage() {
  return (
    <AuthCard title="Create Account" subtitle="Join us today!">
      <SignUpForm />
    </AuthCard>
  );
}
