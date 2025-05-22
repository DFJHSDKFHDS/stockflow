// src/components/inventory/IncomingForm.tsx
"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, CheckCircle, Loader2, PackagePlus, UserCircle, FileText, Truck } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { Product, IncomingLog } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { rtdb } from "@/lib/firebase";
import { ref as databaseRef, onValue, off, update, push, runTransaction, serverTimestamp } from "firebase/database";
import { PasswordConfirmationModal } from "@/components/auth/PasswordConfirmationModal";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation"; // For redirection

const incomingFormSchema = z.object({
  productId: z.string().min(1, "Product selection is required."),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1."),
  receivedAt: z.date({ required_error: "Date of arrival is required." }),
  purchaseOrder: z.string().optional(),
  supplier: z.string().optional(),
});

type IncomingFormValues = z.infer<typeof incomingFormSchema>;

export function IncomingForm() {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [products, setProducts] = React.useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = React.useState(false);
  const [pendingFormValues, setPendingFormValues] = React.useState<IncomingFormValues | null>(null);

  const form = useForm<IncomingFormValues>({
    resolver: zodResolver(incomingFormSchema),
    defaultValues: {
      productId: "",
      quantity: 1,
      receivedAt: new Date(),
      purchaseOrder: "",
      supplier: "",
    },
  });

  React.useEffect(() => {
    if (authLoading || !user) {
      setIsLoadingProducts(false);
      setProducts([]);
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
      setProducts(productList);
      setIsLoadingProducts(false);
    }, (error) => {
      console.error("Error fetching products:", error);
      toast({ title: "Error", description: "Failed to fetch products.", variant: "destructive" });
      setIsLoadingProducts(false);
    });
    return () => off(productsDbRef, 'value', listener);
  }, [user, authLoading, toast]);

  const triggerPasswordConfirmation = (values: IncomingFormValues) => {
    if (!user) return;
    setPendingFormValues(values);
    setIsPasswordModalOpen(true);
  };

  const processStockAddition = async () => {
    if (!user || !pendingFormValues) {
      toast({ title: "Error", description: "User or form data missing.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }
    setIsSubmitting(true);
    const values = pendingFormValues;
    const selectedProduct = products.find(p => p.id === values.productId);

    if (!selectedProduct) {
      toast({ title: "Error", description: "Selected product not found.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }
    
    const productStockRef = databaseRef(rtdb, `Stockflow/${user.uid}/product/${selectedProduct.id}/currentStock`);
    const productUpdatedAtRef = databaseRef(rtdb, `Stockflow/${user.uid}/product/${selectedProduct.id}/updatedAt`);
    const incomingLogRef = databaseRef(rtdb, `Stockflow/${user.uid}/incomingLogs`);
    const newLogRef = push(incomingLogRef);

    const selectedDateFromForm = new Date(values.receivedAt);
    const currentTime = new Date(); // Get current time
    const finalReceivedDateTime = new Date( // Combine selected date with current time
        selectedDateFromForm.getFullYear(),
        selectedDateFromForm.getMonth(),
        selectedDateFromForm.getDate(),
        currentTime.getHours(),
        currentTime.getMinutes(),
        currentTime.getSeconds()
    );

    const logData: IncomingLog = {
      id: newLogRef.key!,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      quantity: values.quantity,
      receivedAt: finalReceivedDateTime.toISOString(),
      timestamp: new Date().toISOString(), // Log creation time
      type: 'incoming',
      purchaseOrder: values.purchaseOrder || "",
      supplier: values.supplier || "",
      userId: user.uid,
    };

    try {
      // Transaction to update stock
      await runTransaction(productStockRef, (currentStock) => {
        if (currentStock === null) return values.quantity; // Initialize if null
        return (currentStock || 0) + values.quantity;
      });

      // Prepare updates for log and product timestamp
      const updates: { [key: string]: any } = {};
      updates[newLogRef.key!] = logData; // Save the log under its generated key
      updates[`Stockflow/${user.uid}/product/${selectedProduct.id}/updatedAt`] = serverTimestamp(); // Firebase server timestamp for product update

      await update(databaseRef(rtdb), { // Use root ref for multiple path update
        [`Stockflow/${user.uid}/incomingLogs/${newLogRef.key}`]: logData,
        [`Stockflow/${user.uid}/product/${selectedProduct.id}/updatedAt`]: serverTimestamp()
      });


      toast({
        title: "Stock Added Successfully",
        description: `${values.quantity} unit(s) of ${selectedProduct.name} added to inventory.`,
        action: <CheckCircle className="text-green-500" />,
      });
      form.reset();
      router.push("/incoming"); // Redirect to the incoming logs list

    } catch (error: any) {
      console.error("Error adding stock:", error);
      toast({
        title: "Stock Addition Failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
      // Attempt to roll back stock if log failed - more complex for multi-path, best effort here
      // This simple rollback might not be perfectly atomic without server-side logic/Cloud Functions
      await runTransaction(productStockRef, (currentStock) => {
        return (currentStock || 0) - values.quantity;
      }).catch(rbError => console.error("Stock rollback attempt failed:", rbError));

    } finally {
      setIsSubmitting(false);
      setPendingFormValues(null);
    }
  };
  
  if (isLoadingProducts || authLoading && !user) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PackagePlus className="h-6 w-6 text-primary" /> Restock Inventory
          </CardTitle>
          <CardDescription>Log new incoming stock and update quantities.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-32" />
          </div>
        </CardContent>
      </Card>
    );
  }


  return (
    <>
      <PasswordConfirmationModal
        isOpen={isPasswordModalOpen}
        onClose={() => {
            setIsPasswordModalOpen(false);
            setPendingFormValues(null);
        }}
        onConfirm={processStockAddition}
        actionDescription="add this stock to inventory"
      />
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PackagePlus className="h-6 w-6 text-primary" /> Restock Inventory
          </CardTitle>
          <CardDescription>Log new incoming stock and update quantities.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(triggerPasswordConfirmation)} className="space-y-6">
              <FormField
                control={form.control}
                name="productId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting || products.length === 0}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a product to restock" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {products.length === 0 && <SelectItem value="loading" disabled>Loading products...</SelectItem>}
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} (SKU: {product.sku}) - Stock: {product.currentStock}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity Received</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 50" {...field} disabled={isSubmitting} />
                    </FormControl>
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
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            disabled={isSubmitting}
                          >
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date > new Date() || date < new Date("2000-01-01") || isSubmitting}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription className="text-xs">Time of arrival will be the current time on submission.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="purchaseOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1"><FileText className="h-4 w-4 text-muted-foreground" /> Purchase Order # (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., PO-12345" {...field} disabled={isSubmitting} />
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
                      <FormLabel className="flex items-center gap-1"><Truck className="h-4 w-4 text-muted-foreground" /> Supplier (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Global Supplies Ltd." {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => router.push("/incoming")} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting || authLoading || isLoadingProducts}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {isSubmitting ? "Logging Stock..." : "Log Incoming Stock"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </>
  );
}
