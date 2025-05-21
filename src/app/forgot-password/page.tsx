// src/app/forgot-password/page.tsx
import { AuthLayout } from "@/components/layout/AuthLayout";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Forgot Password - StockFlow',
  description: 'Reset your StockFlow account password.',
};

export default function ForgotPasswordPage() {
  return (
    <AuthLayout
      title="Forgot Your Password?"
      description="Enter your email address and we'll send you a link to reset your password."
    >
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
