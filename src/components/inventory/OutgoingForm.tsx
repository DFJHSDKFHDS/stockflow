// src/components/inventory/OutgoingForm.tsx
"use client";

import * as React from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, ArrowUpFromLine, Ticket, PlusCircle, Trash2, User, ShoppingCart, PackageSearch } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { Product, GatePass, GatePassItem } from "@/types";
import { generateGatePass, type GenerateGatePassInput } from "@/ai/flows/generate-gate-pass";
import { GatePassModal } from "@/components/gatepass/GatePassModal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { rtdb } from "@/lib/firebase";
import { ref as databaseRef, onValue, off, update, push, serverTimestamp, get } from "firebase/database";
import { PasswordConfirmationModal } from "@/components/auth/PasswordConfirmationModal";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const gatePassItemSchema = z.object({
  productId: z.string().min(1, "Product is required."),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1."),
  // These are for display/reference in the form, not directly part of the schema sent to DB for items array
  productName: z.string().optional(), 
  availableStock: z.number().optional(),
});

const outgoingFormSchema = z.object({
  items: z.array(gatePassItemSchema).min(1, "At least one product must be added."),
  dispatchedAt: z.date({ required_error: "Date of dispatch is required." }),
  destination: z.string().min(3, "Destination is required."),
  reason: z.string().min(3, "Reason for removal is required."),
}).refine(data => { // Validate quantity against available stock for each item
  for (const item of data.items) {
    if (item.quantity > (item.availableStock ?? Infinity)) {
      return false;
    }
  }
  return true;
}, {
  message: "Quantity for one or more items exceeds available stock.",
  path: ["items"], // General path, specific errors can be set dynamically
});

type OutgoingFormValues = z.infer<typeof outgoingFormSchema>;

export function OutgoingForm() {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  const [products, setProducts] = React.useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = React.useState(true);
  
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showGatePassModal, setShowGatePassModal] = React.useState(false);
  const [gatePassContent, setGatePassContent] = React.useState("");
  const [qrCodeDataForPass, setQrCodeDataForPass] = React.useState("");

  const [isPasswordModalOpen, setIsPasswordModalOpen] = React.useState(false);
  const [pendingFormValues, setPendingFormValues] = React.useState<OutgoingFormValues | null>(null);

  const form = useForm<OutgoingFormValues>({
    resolver: zodResolver(outgoingFormSchema),
    defaultValues: {
      items: [{ productId: "", quantity: 1, productName: "", availableStock: 0 }],
      dispatchedAt: new Date(),
      destination: "",
      reason: "",
    },
  });

  const { fields, append, remove, update: updateField } = useFieldArray({
    control: form.control,
    name: "items",
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
      if (data) {
        const productList = Object.entries(data).map(([key, value]) => ({
          ...(value as Omit<Product, 'id'>),
          id: key,
        }));
        setProducts(productList);
      } else {
        setProducts([]);
      }
      setIsLoadingProducts(false);
    }, (error) => {
      console.error("Error fetching products:", error);
      toast({ title: "Error", description: "Failed to fetch products.", variant: "destructive" });
      setIsLoadingProducts(false);
    });
    return () => off(productsDbRef, 'value', listener);
  }, [user, authLoading, toast]);

  const handleProductChange = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      updateField(index, {
        ...fields[index],
        productId: product.id,
        productName: product.name,
        availableStock: product.currentStock,
        quantity: 1, // Reset quantity
      });
      form.clearErrors(`items.${index}.quantity`); // Clear previous errors
    }
  };
  
  const handleQuantityChange = (index: number, quantity: number) => {
    const item = fields[index];
    const product = products.find(p => p.id === item.productId);
    if (product && quantity > product.currentStock) {
      form.setError(`items.${index}.quantity`, {
        type: 'manual',
        message: `Max: ${product.currentStock}`,
      });
    } else {
      form.clearErrors(`items.${index}.quantity`);
    }
     updateField(index, { ...item, quantity });
  };

  const triggerPasswordConfirmation = (values: OutgoingFormValues) => {
    if (!user) return;
     // Re-validate stock just before submission
    let stockError = false;
    values.items.forEach((item, index) => {
        const productDetails = products.find(p => p.id === item.productId);
        if (productDetails && item.quantity > productDetails.currentStock) {
            form.setError(`items.${index}.quantity`, { type: "manual", message: `Stock changed. Max: ${productDetails.currentStock}` });
            stockError = true;
        }
    });
    if (stockError) {
        toast({ title: "Stock Level Error", description: "Some item quantities exceed available stock. Please review.", variant: "destructive" });
        return;
    }
    setPendingFormValues(values);
    setIsPasswordModalOpen(true);
  };

  const processGatePassCreation = async () => {
    if (!user || !pendingFormValues) {
      toast({ title: "Error", description: "User or form data missing.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    const values = pendingFormValues;

    const gatePassId = push(databaseRef(rtdb, `Stockflow/${user.uid}/gatePasses`)).key;
    if (!gatePassId) {
      toast({ title: "Error", description: "Failed to generate Gate Pass ID.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }
    
    const gatePassItems: GatePassItem[] = values.items.map(item => {
      const product = products.find(p => p.id === item.productId)!;
      return {
        productId: item.productId,
        name: product.name,
        sku: product.sku,
        quantity: item.quantity,
      };
    });

    const totalQuantity = gatePassItems.reduce((sum, item) => sum + item.quantity, 0);
    const userName = user.displayName || user.email || "N/A";

    const gatePassData: GatePass = {
      id: gatePassId,
      userId: user.uid,
      userName: userName,
      items: gatePassItems,
      destination: values.destination,
      reason: values.reason,
      date: format(values.dispatchedAt, "yyyy-MM-dd"),
      totalQuantity: totalQuantity,
      createdAt: new Date().toISOString(),
      qrCodeData: gatePassId,
    };

    // Prepare stock updates
    const stockUpdates: { [key: string]: any } = {};
    const productFetchPromises = values.items.map(item => 
        get(databaseRef(rtdb, `Stockflow/${user.uid}/product/${item.productId}/currentStock`))
    );

    try {
      const productStockSnapshots = await Promise.all(productFetchPromises);
      
      for (let i = 0; i < values.items.length; i++) {
        const item = values.items[i];
        const currentStockSnapshot = productStockSnapshots[i];
        const currentStock = currentStockSnapshot.val();

        if (typeof currentStock !== 'number' || item.quantity > currentStock) {
          form.setError(`items.${i}.quantity`, { message: `Stock issue for ${item.productName}. Available: ${currentStock ?? 'N/A'}` });
          toast({ title: "Stock Update Error", description: `Not enough stock for ${item.productName}. Please refresh.`, variant: "destructive" });
          setIsSubmitting(false);
          return;
        }
        stockUpdates[`Stockflow/${user.uid}/product/${item.productId}/currentStock`] = currentStock - item.quantity;
        stockUpdates[`Stockflow/${user.uid}/product/${item.productId}/updatedAt`] = new Date().toISOString();
      }

      // Add gate pass data to updates
      stockUpdates[`Stockflow/${user.uid}/gatePasses/${gatePassId}`] = gatePassData;

      await update(databaseRef(rtdb), stockUpdates);

      toast({ title: "Gate Pass Logged & Stock Updated", description: "Successfully recorded outgoing items." });

      // AI Pass Generation
      const aiInput: GenerateGatePassInput = {
        items: gatePassItems.map(p => ({ productName: p.name, quantity: p.quantity })),
        destination: values.destination,
        reason: values.reason,
        date: format(values.dispatchedAt, "PPP"), // e.g. Jun 9, 2024
        userName: userName,
        qrCodeData: gatePassId,
      };
      
      const aiResult = await generateGatePass(aiInput);
      setGatePassContent(aiResult.gatePass);
      setQrCodeDataForPass(gatePassId); // For display/use in modal
      setShowGatePassModal(true);
      // Form reset is handled in GatePassModal's onClose
      
    } catch (error: any) {
      console.error("Error processing gate pass:", error);
      toast({ title: "Processing Error", description: error.message || "Failed to process gate pass and update stock.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
      setPendingFormValues(null);
    }
  };
  
  const watchedItems = form.watch("items");
  const summaryTotalQuantity = watchedItems.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);

  if (isLoadingProducts && products.length === 0) {
    return (
      <Card className="max-w-3xl mx-auto">
        <CardHeader><Skeleton className="h-8 w-3/5" /></CardHeader>
        <CardContent className="space-y-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
          <Skeleton className="h-20 w-full" />
          <div className="flex justify-end"><Skeleton className="h-10 w-32" /></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <PasswordConfirmationModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onConfirm={processGatePassCreation}
        actionDescription="log these outgoing items and generate a gate pass"
      />
      <GatePassModal
        isOpen={showGatePassModal}
        onClose={() => {
          setShowGatePassModal(false);
          form.reset({
             items: [{ productId: "", quantity: 1, productName: "", availableStock: 0 }],
             dispatchedAt: new Date(),
             destination: "",
             reason: "",
          });
        }}
        gatePassContent={gatePassContent}
        qrCodeData={qrCodeDataForPass}
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(triggerPasswordConfirmation)} className="space-y-8">
          <Card className="max-w-3xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowUpFromLine className="h-6 w-6 text-primary" /> Generate Gate Pass
              </CardTitle>
              <CardDescription>Select products, specify quantities, and provide dispatch details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <FormLabel>Items to Dispatch</FormLabel>
                {fields.map((field, index) => {
                  const selectedProductDetails = products.find(p => p.id === field.productId);
                  return (
                    <div key={field.id} className="flex items-end gap-2 mt-2 p-3 border rounded-md bg-muted/20">
                      <FormField
                        control={form.control}
                        name={`items.${index}.productId`}
                        render={({ field: controllerField }) => (
                          <FormItem className="flex-1">
                            <FormLabel className="text-xs">Product</FormLabel>
                            <Select
                              onValueChange={(value) => {
                                controllerField.onChange(value);
                                handleProductChange(index, value);
                              }}
                              defaultValue={controllerField.value}
                              disabled={isSubmitting || isLoadingProducts}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a product" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {products.length === 0 && !isLoadingProducts ? (
                                  <div className="p-4 text-center text-sm text-muted-foreground">No products available.</div>
                                ) : (
                                  products.map(product => (
                                    <SelectItem key={product.id} value={product.id} disabled={product.currentStock === 0}>
                                      {product.name} (Stock: {product.currentStock})
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`items.${index}.quantity`}
                        render={({ field: controllerField }) => (
                          <FormItem className="w-28">
                             <FormLabel className="text-xs">Quantity</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="Qty"
                                {...controllerField}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10) || 0;
                                  controllerField.onChange(val);
                                  handleQuantityChange(index, val);
                                }}
                                disabled={isSubmitting || !selectedProductDetails || selectedProductDetails.currentStock === 0}
                                min="1"
                                max={selectedProductDetails?.currentStock}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={() => fields.length > 1 && remove(index)}
                        disabled={isSubmitting || fields.length <= 1}
                        className="shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ productId: "", quantity: 1, productName: "", availableStock: 0 })}
                  className="mt-2"
                  disabled={isSubmitting || isLoadingProducts}
                >
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Product
                </Button>
                {form.formState.errors.items && !form.formState.errors.items.root && !Array.isArray(form.formState.errors.items) && (
                    <FormMessage>{form.formState.errors.items.message}</FormMessage>
                )}
                 {Array.isArray(form.formState.errors.items) && form.formState.errors.items.map((itemError, i) => (
                    itemError && <FormMessage key={i}>{itemError.root?.message || itemError.quantity?.message || itemError.productId?.message}</FormMessage>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="destination"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Destination</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Customer X, Warehouse B" {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dispatchedAt"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="mb-1.5">Date of Dispatch</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn("w-full pl-3 text-left font-normal",!field.value && "text-muted-foreground")}
                              disabled={isSubmitting}
                            >
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date("2000-01-01") || isSubmitting} initialFocus />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason for Dispatch</FormLabel>
                    <FormControl>
                      <Textarea placeholder="e.g., Sale, Internal Transfer, Return to Supplier" {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            
            {watchedItems.length > 0 && watchedItems[0].productId && summaryTotalQuantity > 0 && (
              <CardFooter className="flex-col items-start gap-2 border-t pt-6">
                  <h3 className="font-semibold text-lg flex items-center gap-2"><ShoppingCart className="h-5 w-5 text-primary"/>Dispatch Summary</h3>
                  <div className="w-full overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Product</TableHead>
                                <TableHead className="text-right">Quantity</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {watchedItems.filter(item => item.productId && item.quantity > 0).map((item, index) => {
                                const product = products.find(p => p.id === item.productId);
                                return (
                                    <TableRow key={index}>
                                        <TableCell>{product?.name || 'N/A'}</TableCell>
                                        <TableCell className="text-right">{item.quantity}</TableCell>
                                    </TableRow>
                                );
                            })}
                             <TableRow className="font-semibold">
                                <TableCell>Total Quantity</TableCell>
                                <TableCell className="text-right">{summaryTotalQuantity}</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1">
                    <User className="h-4 w-4" />
                    Gate Pass to be created by: {user?.displayName || user?.email || "Current User"}
                  </p>
              </CardFooter>
            )}

          </Card>
          
          <div className="flex justify-end max-w-3xl mx-auto">
            <Button type="submit" disabled={isSubmitting || authLoading || isLoadingProducts || fields.length === 0 || !fields[0].productId || summaryTotalQuantity === 0}>
              {isSubmitting ? "Processing..." : "Log Outgoing & Generate Pass"}
              {!isSubmitting && <Ticket className="ml-2 h-4 w-4" />}
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
}
