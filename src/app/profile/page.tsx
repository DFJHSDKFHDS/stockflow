// src/app/profile/page.tsx
import { AppLayout } from "@/components/layout/AppLayout";
import { ProfileForm } from "@/components/profile/ProfileForm";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'User Profile - StockFlow',
  description: 'Manage your StockFlow profile information.',
};

export default function UserProfilePage() {
  return (
    <AppLayout>
      <ProfileForm />
    </AppLayout>
  );
}
