// src/app/login/page.tsx
import { AuthLayout } from "@/components/layout/AuthLayout";
import { LoginForm } from "@/components/auth/LoginForm";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login - StockFlow',
  description: 'Log in to your StockFlow account.',
};

export default function LoginPage() {
  return (
    <AuthLayout 
      title="Welcome Back!"
      description="Enter your credentials to access your account."
    >
      <LoginForm />
    </AuthLayout>
  );
}
