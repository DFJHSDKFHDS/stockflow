// src/app/scan-pass/page.tsx
import { AppLayout } from "@/components/layout/AppLayout";
import { GatePassScanner } from "@/components/inventory/GatePassScanner";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Scan Gate Pass ID - StockFlow',
  description: 'Scan a QR code to view gate pass details.',
};

export default function ScanPassPage() {
  return (
    <AppLayout>
      <GatePassScanner />
    </AppLayout>
  );
}
