// src/app/signup/page.tsx
import { AuthLayout } from "@/components/layout/AuthLayout";
import { SignupForm } from "@/components/auth/SignupForm";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign Up - StockFlow',
  description: 'Create a new StockFlow account.',
};

export default function SignupPage() {
  return (
    <AuthLayout
      title="Create an Account"
      description="Join StockFlow to manage your inventory efficiently."
    >
      <SignupForm />
    </AuthLayout>
  );
}
