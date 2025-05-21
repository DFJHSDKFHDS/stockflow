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
import { Edit, Trash2, PackageSearch, PlusCircle } from "lucide-react";
import Link from "next/link";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

// Mock data
const mockProducts: Product[] = [
  { id: "1", name: "Laptop Pro 15", sku: "LP-001", category: "Electronics", currentStock: 50, unitPrice: 1200, createdAt: new Date(), updatedAt: new Date(), userId: "user1", description: "High-performance laptop" },
  { id: "2", name: "Wireless Mouse", sku: "WM-002", category: "Accessories", currentStock: 150, unitPrice: 25, createdAt: new Date(), updatedAt: new Date(), userId: "user1", description: "Ergonomic wireless mouse"  },
  { id: "3", name: "Mechanical Keyboard", sku: "MK-003", category: "Accessories", currentStock: 75, unitPrice: 80, createdAt: new Date(), updatedAt: new Date(), userId: "user1", description: "RGB mechanical keyboard" },
];

export function ProductList() {
  const [products, setProducts] = React.useState<Product[]>(mockProducts);
  const [searchTerm, setSearchTerm] = React.useState("");
  const { toast } = useToast();

  // Placeholder for data fetching
  React.useEffect(() => {
    // fetchProducts().then(setProducts);
  }, []);

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.category && product.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleDelete = async (productId: string) => {
    // Mock delete
    setProducts(prev => prev.filter(p => p.id !== productId));
    toast({
      title: "Product Deleted",
      description: "The product has been successfully deleted.",
    });
  };
  
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] text-center">
        <PackageSearch className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold mb-2">No Products Found</h2>
        <p className="text-muted-foreground mb-4">Get started by adding your first product.</p>
        <Link href="/products/new" passHref>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Product
          </Button>
        </Link>
      </div>
    );
  }


  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder="Search products by name, SKU, or category..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Link href="/products/new" passHref>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Product
          </Button>
        </Link>
      </div>
      <div className="rounded-md border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
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
              <TableRow key={product.id}>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell>{product.sku}</TableCell>
                <TableCell>{product.category || "-"}</TableCell>
                <TableCell className="text-right">{product.currentStock}</TableCell>
                <TableCell className="text-right">${product.unitPrice?.toFixed(2) || "N/A"}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={product.currentStock > 0 ? (product.currentStock < 10 ? "destructive" : "default") : "outline"}>
                    {product.currentStock > 0 ? (product.currentStock < 10 ? "Low Stock" : "In Stock") : "Out of Stock"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => alert(`Editing ${product.name} (mock)`)} // Replace with Link to edit page or modal
                      >
                        <Edit className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                             <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the product "{product.name}".
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(product.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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
    </div>
  );
}
