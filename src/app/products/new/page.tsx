// src/app/products/new/page.tsx
import { AppLayout } from "@/components/layout/AppLayout";
import { ProductForm } from "@/components/products/ProductForm";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Register New Product - StockFlow',
  description: 'Add a new product to your inventory.',
};

export default function NewProductPage() {
  return (
    <AppLayout>
      <ProductForm />
    </AppLayout>
  );
}
