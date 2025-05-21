// src/app/outgoing-logs/page.tsx
import { AppLayout } from "@/components/layout/AppLayout";
import { OutgoingLogList } from "@/components/inventory/OutgoingLogList";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Outgoing Stock - StockFlow',
  description: 'View history of outgoing products and gate passes.',
};

export default function OutgoingLogsPage() {
  return (
    <AppLayout>
      <OutgoingLogList />
    </AppLayout>
  );
}
