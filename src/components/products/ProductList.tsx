// src/components/products/ProductList.tsx
"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { Product } from "@/types";
import { Edit, Trash2, PackageSearch, PlusCircle, ImageOff, Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger, // Keep this for the original AlertDialog structure if needed elsewhere
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { rtdb, storage } from "@/lib/firebase";
import { ref as databaseRef, onValue, off, remove } from "firebase/database";
import { ref as storageRef, deleteObject } from "firebase/storage";
import { Skeleton } from "@/components/ui/skeleton";
import { PasswordConfirmationModal } from "@/components/auth/PasswordConfirmationModal"; // Added

export function ProductList() {
  const [products, setProducts] = React.useState<Product[]>([]);
  const [isLoading, setIsLoading] = React.useState(true); // General page loading
  const [isDeleting, setIsDeleting] = React.useState(false); // Specific to delete operation
  const [searchTerm, setSearchTerm] = React.useState("");
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  const [isPasswordModalOpen, setIsPasswordModalOpen] = React.useState(false);
  const [productPendingDeletion, setProductPendingDeletion] = React.useState<Product | null>(null);

  React.useEffect(() => {
    if (authLoading || !user) {
      if (!authLoading && !user) setProducts([]); // Clear products if user logs out
      setIsLoading(authLoading);
      return;
    }

    setIsLoading(true);
    const productsDbRef = databaseRef(rtdb, `Stockflow/${user.uid}/product`);

    const listener = onValue(productsDbRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const productList = Object.entries(data).map(([key, value]) => ({
          ...(value as Omit<Product, 'id'>), 
          id: key, 
        }));
        setProducts(productList);
      } else {
        setProducts([]);
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching products:", error);
      toast({ title: "Error", description: "Failed to fetch products.", variant: "destructive" });
      setIsLoading(false);
    });

    return () => {
      off(productsDbRef, 'value', listener);
    };
  }, [user, authLoading, toast]);

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.category && product.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const triggerDeleteFlow = (product: Product) => {
    if (!user) return;
    setProductPendingDeletion(product);
    setIsPasswordModalOpen(true);
  };

  const executeDelete = async () => {
    if (!user || !productPendingDeletion) return;
    
    setIsDeleting(true);
    try {
      const productToDelete = productPendingDeletion;
      const productDbRef = databaseRef(rtdb, `Stockflow/${user.uid}/product/${productToDelete.id}`);
      await remove(productDbRef);

      if (productToDelete.imageUrl) {
        try {
            const imageStorageRef = storageRef(storage, productToDelete.imageUrl);
            await deleteObject(imageStorageRef);
        } catch (storageError: any) {
            console.warn(`Failed to delete image ${productToDelete.imageUrl}:`, storageError);
             if (storageError.code !== 'storage/object-not-found') { 
                toast({
                    title: "Image Deletion Warning",
                    description: `Product data deleted, but failed to delete image: ${storageError.message}`,
                    variant: "default", 
                });
             }
        }
      }

      toast({
        title: "Product Deleted",
        description: `"${productToDelete.name}" has been successfully deleted.`,
      });
    } catch (error: any) {
      toast({
        title: "Error Deleting Product",
        description: error.message || "Failed to delete product.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setProductPendingDeletion(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="rounded-md border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-12 w-12 rounded" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-3/4" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-1/2" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-1/2" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                  <TableCell className="text-center"><Skeleton className="h-6 w-20 mx-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }
  
  if (!isLoading && products.length === 0 && !searchTerm) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] text-center">
        <PackageSearch className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold mb-2">No Products Found</h2>
        <p className="text-muted-foreground mb-4">Get started by adding your first product.</p>
        <Link href="/products/new" passHref>
          <Button disabled={authLoading}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Product
          </Button>
        </Link>
      </div>
    );
  }


  return (
    <>
    {productPendingDeletion && (
        <PasswordConfirmationModal
            isOpen={isPasswordModalOpen}
            onClose={() => {
                setIsPasswordModalOpen(false);
                setProductPendingDeletion(null);
            }}
            onConfirm={executeDelete}
            actionDescription={`delete the product "${productPendingDeletion.name}"`}
        />
    )}
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder="Search products by name, SKU, or category..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
          disabled={authLoading || isDeleting}
        />
        <Link href="/products/new" passHref>
          <Button disabled={authLoading || isDeleting}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Product
          </Button>
        </Link>
      </div>
      <div className="rounded-md border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.map((product) => (
              <TableRow key={product.id} className={(isDeleting && productPendingDeletion?.id === product.id) ? "opacity-50" : ""}>
                <TableCell>
                  {product.imageUrl ? (
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      width={50}
                      height={50}
                      className="rounded-md object-cover aspect-square"
                      data-ai-hint="product item"
                    />
                  ) : (
                    <div className="w-[50px] h-[50px] bg-muted rounded-md flex items-center justify-center" data-ai-hint="placeholder item">
                        <ImageOff className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell>{product.sku}</TableCell>
                <TableCell>{product.category || "-"}</TableCell>
                <TableCell className="text-right">{product.currentStock}</TableCell>
                <TableCell className="text-right">Rs {product.unitPrice?.toFixed(2) || "N/A"}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={product.currentStock > 0 ? (product.currentStock < 10 ? "destructive" : "default") : "outline"}>
                    {product.currentStock > 0 ? (product.currentStock < 10 ? "Low Stock" : "In Stock") : "Out of Stock"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0" disabled={authLoading || isDeleting}>
                        <span className="sr-only">Open menu</span>
                        {isDeleting && productPendingDeletion?.id === product.id 
                            ? <Loader2 className="h-4 w-4 animate-spin" /> 
                            : <MoreHorizontal className="h-4 w-4" />}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                       <DropdownMenuItem asChild disabled={isDeleting}>
                         <Link href={`/products/edit/${product.id}`}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                         </Link>
                       </DropdownMenuItem>
                       <DropdownMenuItem 
                          onSelect={() => triggerDeleteFlow(product)} 
                          className="text-destructive focus:text-destructive"
                          disabled={isDeleting}
                        >
                             <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {filteredProducts.length === 0 && searchTerm && (
         <div className="text-center py-8 text-muted-foreground">
            No products match your search criteria.
         </div>
      )}
       {products.length > 0 && filteredProducts.length === 0 && !searchTerm && (
         <div className="text-center py-8 text-muted-foreground">
            All products filtered out. Clear search to see all products.
         </div>
      )}
    </div>
    </>
  );
}
