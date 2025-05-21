// src/app/page.tsx (New Generate Gate Pass Page)
import { AppLayout } from "@/components/layout/AppLayout";
import { OutgoingForm } from "@/components/inventory/OutgoingForm";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Generate Gate Pass - StockFlow',
  description: 'Create gate passes for outgoing products.',
};

export default function GenerateGatePassPage() {
  return (
    <AppLayout>
      <OutgoingForm />
    </AppLayout>
  );
}
