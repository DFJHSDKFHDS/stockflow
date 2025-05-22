// src/app/incoming/restock/page.tsx
import { AppLayout } from "@/components/layout/AppLayout";
import { IncomingForm } from "@/components/inventory/IncomingForm";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Restock Inventory - StockFlow',
  description: 'Log new incoming stock and update inventory levels.',
};

export default function RestockInventoryPage() {
  return (
    <AppLayout>
      <IncomingForm />
    </AppLayout>
  );
}
