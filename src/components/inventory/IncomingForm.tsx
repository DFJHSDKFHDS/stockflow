// src/components/inventory/IncomingForm.tsx
"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, CheckCircle, Loader2, PackagePlus, FileText, Truck, Search, ImageOff, Edit3, ArrowLeft } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { Product, IncomingLog } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { rtdb } from "@/lib/firebase";
import { ref as databaseRef, onValue, off, update, push, runTransaction, serverTimestamp } from "firebase/database";
import { PasswordConfirmationModal } from "@/components/auth/PasswordConfirmationModal";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";

const incomingFormSchema = z.object({
  quantity: z.coerce.number().min(1, "Quantity must be at least 1."),
  receivedAt: z.date({ required_error: "Date of arrival is required." }),
  purchaseOrder: z.string().optional(),
  supplier: z.string().optional(),
});

type IncomingFormValues = z.infer<typeof incomingFormSchema>;

interface PendingRestockData extends IncomingFormValues {
  productId: string;
  productName: string;
  productSku: string;
  productImageUrl: string;
  currentStock: number;
}

const ProductSelectionCard = ({ 
  product, 
  onSelect, 
  isSelected 
}: { 
  product: Product, 
  onSelect: (product: Product) => void, 
  isSelected: boolean 
}) => (
  <Card
    className={cn(
      "cursor-pointer hover:shadow-lg transition-all duration-200 ease-in-out overflow-hidden group",
      product.currentStock < 0 ? "opacity-60 cursor-not-allowed bg-muted/50" : "hover:ring-2 hover:ring-primary", // Allow selection even if stock is 0 for restock
      isSelected ? "ring-2 ring-primary shadow-md border-primary" : "border"
    )}
    onClick={() => onSelect(product)}
    role="button"
    aria-label={`Select ${product.name} for restock`}
    tabIndex={0}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        onSelect(product);
      }
    }}
  >
    <CardContent className="p-0">
      <div className="aspect-[4/3] w-full relative overflow-hidden">
        <Image
          src={product.imageUrl || `https://placehold.co/300x225.png?text=${encodeURIComponent(product.name.substring(0,15))}`}
          alt={product.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          data-ai-hint="product item"
        />
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-base truncate group-hover:text-primary" title={product.name}>{product.name}</h3>
        <p className="text-xs text-muted-foreground mb-1">SKU: {product.sku}</p>
        <p className="text-xs text-muted-foreground">Current Stock: {product.currentStock}</p>
        <p className="text-sm font-bold text-primary mt-1">Rs {product.unitPrice?.toFixed(2) || "N/A"}</p>
      </div>
    </CardContent>
  </Card>
);


export function IncomingForm() {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [allProducts, setAllProducts] = React.useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = React.useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState("");

  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null);
  const [isPreviewMode, setIsPreviewMode] = React.useState(false);
  const [pendingRestockData, setPendingRestockData] = React.useState<PendingRestockData | null>(null);
  
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = React.useState(false);

  const form = useForm<IncomingFormValues>({
    resolver: zodResolver(incomingFormSchema),
    defaultValues: {
      quantity: 1,
      receivedAt: new Date(),
      purchaseOrder: "",
      supplier: "",
    },
  });
  
  React.useEffect(() => {
    if (authLoading || !user) {
      setIsLoadingProducts(false);
      setAllProducts([]);
      setFilteredProducts([]);
      return;
    }
    setIsLoadingProducts(true);
    const productsDbRef = databaseRef(rtdb, `Stockflow/${user.uid}/product`);
    const listener = onValue(productsDbRef, (snapshot) => {
      const data = snapshot.val();
      const productList = data ? Object.entries(data).map(([key, value]) => ({
        ...(value as Omit<Product, 'id'>),
        id: key,
      })) : [];
      setAllProducts(productList);
      setFilteredProducts(productList);
      setIsLoadingProducts(false);
    }, (error) => {
      console.error("Error fetching products:", error);
      toast({ title: "Error", description: "Failed to fetch products.", variant: "destructive" });
      setIsLoadingProducts(false);
    });
    return () => off(productsDbRef, 'value', listener);
  }, [user, authLoading, toast]);

  React.useEffect(() => {
    const lowerSearchTerm = searchTerm.toLowerCase();
    setFilteredProducts(
      allProducts.filter(product => 
        product.name.toLowerCase().includes(lowerSearchTerm) || 
        product.sku.toLowerCase().includes(lowerSearchTerm) ||
        (product.category && product.category.toLowerCase().includes(lowerSearchTerm))
      )
    );
  }, [searchTerm, allProducts]);

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    setIsPreviewMode(false); // Reset to data entry mode when a new product is selected
    form.reset({ // Reset form fields for the new product context
        quantity: 1,
        receivedAt: new Date(),
        purchaseOrder: "",
        supplier: "",
    });
  };

  const handlePreviewSubmit = (values: IncomingFormValues) => {
    if (!selectedProduct) {
      toast({ title: "Product Not Selected", description: "Please select a product to restock.", variant: "destructive" });
      return;
    }
    setPendingRestockData({
      ...values,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      productSku: selectedProduct.sku,
      productImageUrl: selectedProduct.imageUrl || "",
      currentStock: selectedProduct.currentStock,
    });
    setIsPreviewMode(true);
  };
  
  const triggerPasswordConfirmation = () => {
    if (!pendingRestockData) {
        toast({ title: "Error", description: "No restock data to confirm.", variant: "destructive" });
        return;
    }
    setIsPasswordModalOpen(true);
  };

  const processStockAddition = async () => {
    if (!user || !pendingRestockData) {
      toast({ title: "Error", description: "User or restock data missing.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }
    setIsSubmitting(true);
    
    const productStockRef = databaseRef(rtdb, `Stockflow/${user.uid}/product/${pendingRestockData.productId}/currentStock`);
    const incomingLogRef = databaseRef(rtdb, `Stockflow/${user.uid}/incomingLogs`);
    const newLogRef = push(incomingLogRef);

    const selectedDateFromForm = new Date(pendingRestockData.receivedAt);
    const currentTime = new Date();
    const finalReceivedDateTime = new Date(
        selectedDateFromForm.getFullYear(),
        selectedDateFromForm.getMonth(),
        selectedDateFromForm.getDate(),
        currentTime.getHours(),
        currentTime.getMinutes(),
        currentTime.getSeconds()
    );

    const logData: IncomingLog = {
      id: newLogRef.key!,
      productId: pendingRestockData.productId,
      productName: pendingRestockData.productName,
      quantity: pendingRestockData.quantity,
      receivedAt: finalReceivedDateTime.toISOString(),
      timestamp: new Date().toISOString(),
      type: 'incoming',
      purchaseOrder: pendingRestockData.purchaseOrder || "",
      supplier: pendingRestockData.supplier || "",
      userId: user.uid,
    };

    try {
      await runTransaction(productStockRef, (currentStock) => {
        return (currentStock || 0) + pendingRestockData.quantity;
      });

      const updates: { [key: string]: any } = {};
      updates[`Stockflow/${user.uid}/incomingLogs/${newLogRef.key}`] = logData;
      updates[`Stockflow/${user.uid}/product/${pendingRestockData.productId}/updatedAt`] = serverTimestamp();

      await update(databaseRef(rtdb), updates);

      toast({
        title: "Stock Added Successfully",
        description: `${pendingRestockData.quantity} unit(s) of ${pendingRestockData.productName} added to inventory.`,
        action: <CheckCircle className="text-green-500" />,
      });
      form.reset();
      setSelectedProduct(null);
      setIsPreviewMode(false);
      setPendingRestockData(null);
      router.push("/incoming"); 

    } catch (error: any) {
      console.error("Error adding stock:", error);
      toast({
        title: "Stock Addition Failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
      await runTransaction(productStockRef, (currentStock) => {
         if (typeof currentStock === 'number') {
          return currentStock - pendingRestockData.quantity;
        }
        return currentStock; // Or 0 if it was null before attempt
      }).catch(rbError => console.error("Stock rollback attempt failed:", rbError));
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <>
      <PasswordConfirmationModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onConfirm={processStockAddition}
        actionDescription="add this stock to inventory"
      />
     <div className="flex flex-col md:flex-row gap-4 h-[calc(100vh-var(--header-height,100px)-2rem)]">
        {/* Left Pane: Product Selection */}
        <Card className="md:w-1/2 lg:w-2/5 flex flex-col shadow-lg">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 text-lg">
              <PackagePlus className="h-5 w-5 text-primary" /> Select Product to Restock
            </CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search products..."
                className="pl-8 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={isLoadingProducts || isSubmitting}
              />
            </div>
          </CardHeader>
          <CardContent className="p-3 flex-grow overflow-hidden">
            {isLoadingProducts && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="overflow-hidden">
                    <Skeleton className="aspect-[4/3] w-full" />
                    <div className="p-3 space-y-1.5">
                      <Skeleton className="h-5 w-3/4" /> <Skeleton className="h-3 w-1/2" /> <Skeleton className="h-4 w-1/3" />
                    </div>
                  </Card>
                ))}
              </div>
            )}
            {!isLoadingProducts && filteredProducts.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Search className="w-16 h-16 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {allProducts.length === 0 ? "No products available." : "No products match your search."}
                </p>
              </div>
            )}
            {!isLoadingProducts && filteredProducts.length > 0 && (
              <ScrollArea className="h-full pr-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredProducts.map(product => (
                    <ProductSelectionCard 
                      key={product.id}
                      product={product}
                      onSelect={handleProductSelect}
                      isSelected={selectedProduct?.id === product.id}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Right Pane: Restock Details / Preview */}
        <Card className="md:w-1/2 lg:w-3/5 flex flex-col shadow-lg">
          {!selectedProduct ? (
            <div className="flex-grow flex flex-col items-center justify-center p-6 text-center">
              <PackagePlus className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Please select a product from the left to begin restocking.</p>
            </div>
          ) : !isPreviewMode ? (
            // Data Entry View
            <>
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2 text-lg">
                    Restock: <span className="text-primary">{selectedProduct.name}</span>
                </CardTitle>
                <CardDescription>Enter restock details for the selected product.</CardDescription>
              </CardHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handlePreviewSubmit)} className="flex flex-col flex-grow">
                  <CardContent className="p-4 space-y-4 flex-grow overflow-y-auto">
                    <div className="flex items-center gap-4 p-3 border rounded-lg bg-muted/30">
                        {selectedProduct.imageUrl ? (
                             <Image src={selectedProduct.imageUrl} alt={selectedProduct.name} width={64} height={64} className="h-16 w-16 rounded-md object-cover border" data-ai-hint="product item" />
                        ) : (
                            <div className="h-16 w-16 rounded-md bg-muted flex items-center justify-center border" data-ai-hint="placeholder item">
                                <ImageOff className="h-8 w-8 text-muted-foreground" />
                            </div>
                        )}
                        <div>
                            <h3 className="font-semibold">{selectedProduct.name}</h3>
                            <p className="text-sm text-muted-foreground">SKU: {selectedProduct.sku}</p>
                            <p className="text-sm text-muted-foreground">Current Stock: {selectedProduct.currentStock}</p>
                        </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity to Add</FormLabel>
                          <FormControl><Input type="number" placeholder="e.g., 50" {...field} disabled={isSubmitting} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="receivedAt"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Date of Arrival</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")} disabled={isSubmitting}>
                                  {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date("2000-01-01") || isSubmitting} initialFocus />
                            </PopoverContent>
                          </Popover>
                          <FormDescription className="text-xs">Time of arrival will be the current time on submission.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField control={form.control} name="purchaseOrder" render={({ field }) => (
                            <FormItem>
                            <FormLabel className="flex items-center gap-1"><FileText className="h-4 w-4 text-muted-foreground" /> PO # (Optional)</FormLabel>
                            <FormControl><Input placeholder="e.g., PO-12345" {...field} disabled={isSubmitting} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="supplier" render={({ field }) => (
                            <FormItem>
                            <FormLabel className="flex items-center gap-1"><Truck className="h-4 w-4 text-muted-foreground" /> Supplier (Optional)</FormLabel>
                            <FormControl><Input placeholder="e.g., Global Supplies Ltd." {...field} disabled={isSubmitting} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )} />
                    </div>
                  </CardContent>
                  <CardFooter className="border-t p-4 mt-auto">
                    <Button type="submit" className="w-full" disabled={isSubmitting || authLoading || isLoadingProducts}>
                      {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Preview Restock
                    </Button>
                  </CardFooter>
                </form>
              </Form>
            </>
          ) : (
            // Preview Mode
            <>
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2 text-lg">
                  Confirm Restock: <span className="text-primary">{pendingRestockData?.productName}</span>
                </CardTitle>
                <CardDescription>Please review the details before confirming.</CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-3 flex-grow overflow-y-auto">
                {pendingRestockData && (
                    <div className="space-y-3 text-sm">
                        <div className="flex items-center gap-4 p-3 border rounded-lg bg-muted/10">
                             {pendingRestockData.productImageUrl ? (
                                <Image src={pendingRestockData.productImageUrl} alt={pendingRestockData.productName} width={48} height={48} className="h-12 w-12 rounded-md object-cover border" data-ai-hint="product item" />
                            ) : (
                                <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center border" data-ai-hint="placeholder item">
                                    <ImageOff className="h-6 w-6 text-muted-foreground" />
                                </div>
                            )}
                            <div>
                                <p><strong>Product:</strong> {pendingRestockData.productName} (SKU: {pendingRestockData.productSku})</p>
                                <p><strong>Current Stock:</strong> {pendingRestockData.currentStock}</p>
                            </div>
                        </div>
                        <p><strong>Quantity to Add:</strong> <span className="font-semibold text-green-600">{pendingRestockData.quantity}</span></p>
                        <p><strong>New Expected Stock:</strong> <span className="font-semibold">{pendingRestockData.currentStock + pendingRestockData.quantity}</span></p>
                        <p><strong>Date of Arrival:</strong> {format(pendingRestockData.receivedAt, "PPP")}</p>
                        {pendingRestockData.purchaseOrder && <p><strong>Purchase Order #:</strong> {pendingRestockData.purchaseOrder}</p>}
                        {pendingRestockData.supplier && <p><strong>Supplier:</strong> {pendingRestockData.supplier}</p>}
                    </div>
                )}
              </CardContent>
              <CardFooter className="border-t p-4 mt-auto flex flex-col sm:flex-row gap-2 justify-end">
                <Button variant="outline" onClick={() => setIsPreviewMode(false)} disabled={isSubmitting}>
                  <Edit3 className="mr-2 h-4 w-4" /> Edit Details
                </Button>
                <Button onClick={triggerPasswordConfirmation} disabled={isSubmitting || authLoading || isLoadingProducts}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Confirm & Update Stock
                </Button>
              </CardFooter>
            </>
          )}
        </Card>
      </div>
    </>
  );
}
