// src/app/page.tsx (Dashboard)
import { AppLayout } from "@/components/layout/AppLayout";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard - StockFlow',
  description: 'Overview of your inventory.',
};

export default function DashboardPage() {
  return (
    <AppLayout>
      <DashboardClient />
    </AppLayout>
  );
}
