// src/app/products/page.tsx
import { AppLayout } from "@/components/layout/AppLayout";
import { ProductList } from "@/components/products/ProductList";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Products - StockFlow',
  description: 'Manage your product inventory.',
};

export default function ProductsPage() {
  return (
    <AppLayout>
      <ProductList />
    </AppLayout>
  );
}
