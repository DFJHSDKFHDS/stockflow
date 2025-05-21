// src/app/products/edit/[productId]/page.tsx
"use client"; 

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import type { Metadata } from 'next'; // Keep for potential dynamic metadata later
import { AppLayout } from "@/components/layout/AppLayout";
import { ProductForm } from "@/components/products/ProductForm";
import { useAuth } from "@/contexts/AuthContext";
import { rtdb } from "@/lib/firebase";
import { ref as databaseRef, get } from "firebase/database";
import type { Product } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

// Potentially for dynamic metadata in the future
// export async function generateMetadata({ params }: { params: { productId: string } }): Promise<Metadata> {
//   // Fetch product name here if possible server-side, or set a generic title
//   return {
//     title: `Edit Product - StockFlow`, 
//   };
// }

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading: authLoading } = useAuth();

  const productId = params.productId as string;

  const [product, setProduct] = React.useState<Product | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    document.title = "Edit Product - StockFlow"; // Basic title update
    if (authLoading || !user || !productId) {
      if (!authLoading && !user) {
        // AuthGuard should handle redirect to login if not authenticated
      }
      if(!productId && !authLoading && user) {
        setIsLoading(false);
        setError("Product ID is missing.");
      }
      return;
    }

    const fetchProduct = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const productDbRef = databaseRef(rtdb, `Stockflow/${user.uid}/product/${productId}`);
        const snapshot = await get(productDbRef);
        if (snapshot.exists()) {
          // Ensure all fields from Product type are present, providing defaults if necessary
          const dbProduct = snapshot.val();
          const fetchedProduct: Product = {
            id: snapshot.key!,
            name: dbProduct.name || "",
            description: dbProduct.description || "",
            sku: dbProduct.sku || "",
            category: dbProduct.category || "",
            currentStock: dbProduct.currentStock || 0,
            unitPrice: dbProduct.unitPrice || 0,
            supplier: dbProduct.supplier || "",
            imageUrl: dbProduct.imageUrl || "",
            createdAt: dbProduct.createdAt || new Date().toISOString(),
            updatedAt: dbProduct.updatedAt || new Date().toISOString(),
            userId: dbProduct.userId || user.uid,
          };
          setProduct(fetchedProduct);
          document.title = `Edit: ${fetchedProduct.name} - StockFlow`;
        } else {
          setError("Product not found.");
           document.title = "Product Not Found - StockFlow";
        }
      } catch (err: any) {
        console.error("Error fetching product:", err);
        setError(err.message || "Failed to fetch product details.");
        document.title = "Error Editing Product - StockFlow";
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [productId, user, authLoading, router]);

  const handleUpdateSuccess = (updatedProduct: Product) => {
    router.push("/products");
  };

  if (authLoading || (isLoading && !error) ) {
    return (
      <AppLayout>
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <Skeleton className="h-7 w-40 mb-1" /> {/* For "Edit Product" title */}
            <Skeleton className="h-4 w-full max-w-xs" /> {/* For description (optional) */}
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-1/4" /> <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-1/4" /> <Skeleton className="h-10 w-full" />
                </div>
            </div>
             <div className="space-y-2">
                <Skeleton className="h-4 w-1/4" /> <Skeleton className="h-20 w-full" />
            </div>
            <div className="space-y-2">
                <Skeleton className="h-4 w-1/4" />
                <div className="flex items-center gap-4">
                    <Skeleton className="h-20 w-20 rounded-md aspect-square" />
                    <Skeleton className="h-10 flex-1" />
                </div>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-1/4" /> <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-1/4" /> <Skeleton className="h-10 w-full" />
                </div>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-32" />
            </div>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <Card className="max-w-md mx-auto mt-10 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-6 w-6" /> Error Loading Product
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={() => router.push("/products")} className="mt-6 w-full">
              Back to Products
            </Button>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  if (!product) {
    // This case should ideally be covered by error or loading state,
    // but as a fallback.
    return (
      <AppLayout>
         <Card className="max-w-md mx-auto mt-10 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PackageSearch className="h-6 w-6 text-muted-foreground" /> Product Not Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">The product you are trying to edit could not be found. It might have been deleted.</p>
            <Button onClick={() => router.push("/products")} className="mt-6 w-full">
              Back to Products
            </Button>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <ProductForm initialData={product} onSubmitSuccess={handleUpdateSuccess} />
    </AppLayout>
  );
}
