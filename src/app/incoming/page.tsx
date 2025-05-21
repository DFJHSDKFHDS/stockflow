// src/app/incoming/page.tsx
import { AppLayout } from "@/components/layout/AppLayout";
import { IncomingForm } from "@/components/inventory/IncomingForm";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Log Incoming Products - StockFlow',
  description: 'Record new stock arrivals.',
};

export default function IncomingPage() {
  return (
    <AppLayout>
      <IncomingForm />
    </AppLayout>
  );
}
