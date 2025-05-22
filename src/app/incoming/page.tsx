// src/app/incoming/page.tsx
import { AppLayout } from "@/components/layout/AppLayout";
import { IncomingLogList } from "@/components/inventory/IncomingLogList";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Incoming Stock Logs - StockFlow',
  description: 'View history of incoming stock and restock inventory.',
};

export default function IncomingStockLogsPage() {
  return (
    <AppLayout>
      <IncomingLogList />
    </AppLayout>
  );
}
