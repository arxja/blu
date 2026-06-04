import { SignUpForm } from "@/components/SignUpForm";
import { AuthCard } from "@/components/AuthCard";

export default function SignUpPage() {
  return (
    <AuthCard title="Create Account" subtitle="Join us today!">
      <SignUpForm />
    </AuthCard>
  );
}
