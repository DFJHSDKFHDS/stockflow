// src/app/outgoing/page.tsx
import { AppLayout } from "@/components/layout/AppLayout";
import { OutgoingForm } from "@/components/inventory/OutgoingForm";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Log Outgoing Products - StockFlow',
  description: 'Record products leaving inventory and generate gate passes.',
};

export default function OutgoingPage() {
  return (
    <AppLayout>
      <OutgoingForm />
    </AppLayout>
  );
}
