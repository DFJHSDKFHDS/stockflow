// src/components/inventory/OutgoingForm.tsx
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
import { CalendarIcon, ArrowUpFromLine, Ticket } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { Product, OutgoingLog, GatePassGenerationData } from "@/types";
import { generateGatePass, type GenerateGatePassInput } from "@/ai/flows/generate-gate-pass";
import { GatePassModal } from "@/components/gatepass/GatePassModal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Mock product list
const mockProducts: Product[] = [
  { id: "1", name: "Laptop Pro 15", sku: "LP-001", currentStock: 50, createdAt: new Date(), updatedAt: new Date(), userId: "user1", description: "High-performance laptop" },
  { id: "2", name: "Wireless Mouse", sku: "WM-002", currentStock: 150, createdAt: new Date(), updatedAt: new Date(), userId: "user1", description: "Ergonomic wireless mouse" },
];

const outgoingLogSchema = z.object({
  productId: z.string().min(1, "Product selection is required."),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1."),
  dispatchedAt: z.date({ required_error: "Date of dispatch is required." }),
  destination: z.string().min(3, "Destination is required."),
  reason: z.string().min(3, "Reason for removal is required."),
});

type OutgoingFormValues = z.infer<typeof outgoingLogSchema>;

export function OutgoingForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isGeneratingPass, setIsGeneratingPass] = React.useState(false);
  const [products, setProducts] = React.useState<Product[]>(mockProducts); // Replace with actual data fetching
  const [showGatePassModal, setShowGatePassModal] = React.useState(false);
  const [gatePassContent, setGatePassContent] = React.useState("");
  const [qrCodeDataForPass, setQrCodeDataForPass] = React.useState("");


  const form = useForm<OutgoingFormValues>({
    resolver: zodResolver(outgoingLogSchema),
    defaultValues: {
      productId: "",
      quantity: 1,
      dispatchedAt: new Date(),
      destination: "",
      reason: "",
    },
  });

  const selectedProductId = form.watch("productId");
  const selectedProduct = products.find(p => p.id === selectedProductId);

  // Update quantity validation based on selected product's stock
  React.useEffect(() => {
    if (selectedProduct) {
      form.register("quantity", {
        validate: value => value <= selectedProduct.currentStock || `Cannot exceed available stock (${selectedProduct.currentStock})`
      });
    }
  }, [selectedProduct, form]);


  async function handleGenerateGatePass(values: OutgoingFormValues) {
    if (!selectedProduct) {
        toast({ title: "Error", description: "Product not selected for gate pass.", variant: "destructive" });
        return;
    }
    setIsGeneratingPass(true);

    const qrData = JSON.stringify({
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        quantity: values.quantity,
        destination: values.destination,
        date: format(values.dispatchedAt, "yyyy-MM-dd"),
    });

    setQrCodeDataForPass(qrData);

    const gatePassInput: GenerateGatePassInput = {
      productName: selectedProduct.name,
      quantity: values.quantity,
      destination: values.destination,
      reason: values.reason,
      date: format(values.dispatchedAt, "PPP"), // e.g., Jun 5, 2024
      qrCodeData: qrData,
    };

    try {
      const result = await generateGatePass(gatePassInput);
      setGatePassContent(result.gatePass);
      setShowGatePassModal(true);
      toast({ title: "Gate Pass Generated", description: "Gate pass is ready for review and printing." });
    } catch (error) {
      console.error("Gate pass generation error:", error);
      toast({ title: "Gate Pass Error", description: "Failed to generate gate pass.", variant: "destructive" });
    } finally {
      setIsGeneratingPass(false);
    }
  }


  async function onSubmit(values: OutgoingFormValues) {
    setIsLoading(true);
    if (!selectedProduct) {
        toast({ title: "Error", description: "Selected product not found.", variant: "destructive"});
        setIsLoading(false);
        return;
    }
    if (values.quantity > selectedProduct.currentStock) {
        form.setError("quantity", { type: "manual", message: `Quantity exceeds available stock (${selectedProduct.currentStock}).`});
        setIsLoading(false);
        return;
    }

    const newLogEntry: Partial<OutgoingLog> = { // Using partial as some fields are set by AI/later
        id: Math.random().toString(36).substring(2, 15),
        ...values,
        productName: selectedProduct.name,
        timestamp: values.dispatchedAt,
        type: 'outgoing',
        userId: "mockUserId", // Replace with actual userId
    };
    console.log("Outgoing log data (before pass):", newLogEntry);

    try {
      // Simulate API call for logging outgoing stock
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Stock Updated",
        description: `${values.quantity} units of ${selectedProduct.name} removed from stock.`,
      });
      // Don't reset form yet, allow gate pass generation
      // form.reset(); 
      // Trigger gate pass generation after successful log
      await handleGenerateGatePass(values);

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log outgoing stock.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
    <Card className="max-w-xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ArrowUpFromLine className="h-6 w-6 text-primary" /> Log Outgoing Products</CardTitle>
        <CardDescription>Record products leaving inventory and generate gate passes.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="productId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading || isGeneratingPass}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a product" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {products.map(product => (
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Quantity Shipped</FormLabel>
                    <FormControl>
                        <Input type="number" placeholder="0" {...field} disabled={isLoading || isGeneratingPass || !selectedProduct} />
                    </FormControl>
                    {selectedProduct && <FormMessage>{form.formState.errors.quantity?.message}</FormMessage>}
                     {!form.formState.errors.quantity && selectedProduct && <p className="text-xs text-muted-foreground">Available: {selectedProduct.currentStock}</p>}
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
                            className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                            )}
                            disabled={isLoading || isGeneratingPass}
                            >
                            {field.value ? (
                                format(field.value, "PPP")
                            ) : (
                                <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                        </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01") || isLoading || isGeneratingPass
                            }
                            initialFocus
                        />
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>

            <FormField
              control={form.control}
              name="destination"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Destination</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Customer X, Warehouse B" {...field} disabled={isLoading || isGeneratingPass} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Removal</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., Sale, Internal Transfer, Damaged Goods" {...field} disabled={isLoading || isGeneratingPass} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isLoading || isGeneratingPass || !selectedProduct}>
                {(isLoading || isGeneratingPass) ? "Processing..." : "Log Outgoing & Generate Pass"}
                {!isLoading && !isGeneratingPass && <Ticket className="ml-2 h-4 w-4" />}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
    <GatePassModal
        isOpen={showGatePassModal}
        onClose={() => {
            setShowGatePassModal(false);
            form.reset(); // Reset form after modal is closed
        }}
        gatePassContent={gatePassContent}
        qrCodeData={qrCodeDataForPass}
    />
    </>
  );
}
