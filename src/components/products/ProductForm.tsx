// src/components/products/ProductForm.tsx
"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import type { Product } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PackagePlus, Save } from "lucide-react";
import { useRouter } from "next/navigation";

const productSchema = z.object({
  name: z.string().min(3, "Product name must be at least 3 characters."),
  description: z.string().optional(),
  sku: z.string().min(1, "SKU is required."),
  category: z.string().optional(),
  currentStock: z.coerce.number().min(0, "Stock cannot be negative."),
  unitPrice: z.coerce.number().min(0, "Price cannot be negative.").optional(),
  supplier: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormProps {
  initialData?: Product | null;
  onSubmitSuccess?: (product: Product) => void;
}

export function ProductForm({ initialData, onSubmitSuccess }: ProductFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: initialData
      ? {
          ...initialData,
          currentStock: initialData.currentStock || 0,
          unitPrice: initialData.unitPrice || 0,
        }
      : {
          name: "",
          description: "",
          sku: "",
          category: "",
          currentStock: 0,
          unitPrice: 0,
          supplier: "",
        },
  });

  async function onSubmit(values: ProductFormValues) {
    setIsLoading(true);
    // Mock submission
    console.log("Product data:", values);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      const newProduct: Product = {
        id: initialData?.id || Math.random().toString(36).substring(2, 15),
        ...values,
        createdAt: initialData?.createdAt || new Date(),
        updatedAt: new Date(),
        userId: "mockUserId", // Replace with actual userId from auth
      };
      
      toast({
        title: initialData ? "Product Updated" : "Product Registered",
        description: `${values.name} has been successfully ${initialData ? 'updated' : 'registered'}.`,
      });

      if (onSubmitSuccess) {
        onSubmitSuccess(newProduct);
      } else {
        router.push("/products"); // Default redirect
      }

    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${initialData ? 'update' : 'register'} product.`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {initialData ? <Save className="h-6 w-6 text-primary" /> : <PackagePlus className="h-6 w-6 text-primary" />}
          {initialData ? "Edit Product" : "Register New Product"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Laptop Pro" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU (Stock Keeping Unit)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., LP-001" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Detailed product description..." {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Electronics" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currentStock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Initial Stock</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="unitPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit Price (Optional)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0.00" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="supplier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supplier (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Supplier Inc." {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (initialData ? "Saving..." : "Registering...") : (initialData ? "Save Changes" : "Register Product")}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
