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
import { PackagePlus, Save, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { storage, rtdb } from "@/lib/firebase";
import { ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { ref as databaseRef, set, push, update } from "firebase/database";

const productSchema = z.object({
  name: z.string().min(3, "Product name must be at least 3 characters."),
  description: z.string().optional(),
  sku: z.string().min(1, "SKU is required."),
  category: z.string().optional(),
  currentStock: z.coerce.number().min(0, "Stock cannot be negative."),
  unitPrice: z.coerce.number().min(0, "Price cannot be negative.").optional(),
  supplier: z.string().optional(),
  image: z.any().optional(), // For file input
});

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormProps {
  initialData?: Product | null;
  onSubmitSuccess?: (product: Product) => void;
}

const MAX_IMAGE_SIZE_MB = 5;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const resizeImage = (file: File, maxWidth: number, maxHeight: number): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas to Blob conversion failed'));
        }
      }, file.type || 'image/jpeg', 0.85); // quality 0.85
      URL.revokeObjectURL(img.src);
    };
    img.onerror = (error) => {
      URL.revokeObjectURL(img.src);
      reject(error);
    };
  });
};


export function ProductForm({ initialData, onSubmitSuccess }: ProductFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = React.useState(false);
  const [imagePreview, setImagePreview] = React.useState<string | null>(initialData?.imageUrl || null);
  const [selectedImageFile, setSelectedImageFile] = React.useState<File | null>(null);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: initialData
      ? {
          ...initialData,
          currentStock: initialData.currentStock || 0,
          unitPrice: initialData.unitPrice || 0,
          image: undefined, // image is for new uploads only
        }
      : {
          name: "",
          description: "",
          sku: "",
          category: "",
          currentStock: 0,
          unitPrice: 0,
          supplier: "",
          image: undefined,
        },
  });

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
        toast({ title: "Image too large", description: `Max size is ${MAX_IMAGE_SIZE_MB}MB.`, variant: "destructive" });
        form.setValue("image", null);
        setImagePreview(initialData?.imageUrl || null);
        setSelectedImageFile(null);
        return;
      }
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        toast({ title: "Invalid image type", description: "Please select a JPG, PNG, WEBP or GIF.", variant: "destructive" });
        form.setValue("image", null);
        setImagePreview(initialData?.imageUrl || null);
        setSelectedImageFile(null);
        return;
      }
      setSelectedImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreview(initialData?.imageUrl || null);
      setSelectedImageFile(null);
    }
  };

  async function onSubmit(values: ProductFormValues) {
    if (!user) {
      toast({ title: "Authentication Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    setIsLoading(true);

    let imageUrl = initialData?.imageUrl || "";

    try {
      if (selectedImageFile) {
        // Delete old image if editing and new image is uploaded
        if (initialData?.imageUrl) {
          try {
            const oldImageStorageRef = storageRef(storage, initialData.imageUrl);
            await deleteObject(oldImageStorageRef);
          } catch (error) {
            // Log error but don't block submission if old image deletion fails
            console.warn("Failed to delete old product image:", error);
          }
        }
        
        const resizedImageBlob = await resizeImage(selectedImageFile, 600, 600);
        const imageName = `${user.uid}_${Date.now()}_${selectedImageFile.name.replace(/\s+/g, '_')}`;
        const imagePath = `stockflow/product_image/${imageName}`;
        const imageStorageReference = storageRef(storage, imagePath);
        
        const uploadTask = uploadBytesResumable(imageStorageReference, resizedImageBlob);
        
        await new Promise<void>((resolve, reject) => {
          uploadTask.on(
            "state_changed",
            null, // (snapshot) => { /* progress updates if needed */ },
            (error) => reject(error),
            async () => {
              imageUrl = await getDownloadURL(uploadTask.snapshot.ref);
              resolve();
            }
          );
        });
      }

      const productDataToSave: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> & { id?: string, createdAt?: string, updatedAt: string } = {
        name: values.name,
        description: values.description || "",
        sku: values.sku,
        category: values.category || "",
        currentStock: values.currentStock,
        unitPrice: values.unitPrice || 0,
        supplier: values.supplier || "",
        imageUrl: imageUrl || "", // Ensure imageUrl is always a string
        userId: user.uid,
        updatedAt: new Date().toISOString(),
      };
      
      let productId = initialData?.id;

      if (initialData) { // Editing existing product
        const productDbRef = databaseRef(rtdb, `Stockflow/${user.uid}/product/${initialData.id}`);
        await update(productDbRef, productDataToSave);
      } else { // Creating new product
        const productsDbRef = databaseRef(rtdb, `Stockflow/${user.uid}/product`);
        const newProductRef = push(productsDbRef);
        productId = newProductRef.key!;
        await set(newProductRef, {
          ...productDataToSave,
          id: productId,
          createdAt: new Date().toISOString(),
        });
      }
      
      const finalProductData: Product = {
        ...productDataToSave,
        id: productId!,
        createdAt: initialData?.createdAt || productDataToSave.createdAt || new Date().toISOString(),
      };

      toast({
        title: initialData ? "Product Updated" : "Product Registered",
        description: `${values.name} has been successfully ${initialData ? 'updated' : 'registered'}.`,
      });

      if (onSubmitSuccess) {
        onSubmitSuccess(finalProductData);
      } else {
        router.push("/products"); // Default redirect
      }

    } catch (error: any) {
      console.error("Product submission error:", error);
      toast({
        title: "Error",
        description: error.message || `Failed to ${initialData ? 'update' : 'register'} product.`,
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

            <FormField
              control={form.control}
              name="image"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Image</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-4">
                      {imagePreview ? (
                        <Image
                          src={imagePreview}
                          alt="Product preview"
                          width={80}
                          height={80}
                          className="rounded-md object-cover aspect-square"
                          data-ai-hint="product image"
                        />
                      ) : (
                        <div className="w-20 h-20 bg-muted rounded-md flex items-center justify-center" data-ai-hint="placeholder product">
                          <UploadCloud className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        disabled={isLoading}
                        className="flex-1"
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    Max {MAX_IMAGE_SIZE_MB}MB. Recommended: 600x600px. (JPG, PNG, WEBP, GIF)
                  </FormDescription>
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
                      <Input type="number" placeholder="0" {...field} disabled={isLoading || !!initialData /* Stock editing should be through incoming/outgoing logs */} />
                    </FormControl>
                     {initialData && <FormDescription>Stock is managed via Incoming/Outgoing logs.</FormDescription>}
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
                      <Input type="number" step="0.01" placeholder="0.00" {...field} disabled={isLoading} />
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
              <Button type="submit" disabled={isLoading || !user}>
                {isLoading ? (initialData ? "Saving..." : "Registering...") : (initialData ? "Save Changes" : "Register Product")}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
