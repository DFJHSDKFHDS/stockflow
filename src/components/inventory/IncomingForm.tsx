// src/components/inventory/IncomingForm.tsx
"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, ArrowDownToLine } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { Product, IncomingLog } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Mock product list
const mockProducts: Product[] = [
  { id: "1", name: "Laptop Pro 15", sku: "LP-001", currentStock: 50, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), userId: "user1", description: "High-performance laptop", imageUrl:"" },
  { id: "2", name: "Wireless Mouse", sku: "WM-002", currentStock: 150, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), userId: "user1", description: "Ergonomic wireless mouse", imageUrl:"" },
];

const incomingLogSchema = z.object({
  productId: z.string().min(1, "Product selection is required."),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1."),
  receivedAt: z.date({ required_error: "Date of arrival is required." }),
  purchaseOrder: z.string().optional(),
  supplier: z.string().optional(),
});

type IncomingFormValues = z.infer<typeof incomingLogSchema>;

export function IncomingForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [products, setProducts] = React.useState<Product[]>(mockProducts); // Replace with actual data fetching

  const form = useForm<IncomingFormValues>({
    resolver: zodResolver(incomingLogSchema),
    defaultValues: {
      productId: "",
      quantity: 1,
      receivedAt: new Date(),
      purchaseOrder: "",
      supplier: "",
    },
  });

  async function onSubmit(values: IncomingFormValues) {
    setIsLoading(true);
    // Mock submission
    const selectedProduct = products.find(p => p.id === values.productId);
    if (!selectedProduct) {
        toast({ title: "Error", description: "Selected product not found.", variant: "destructive"});
        setIsLoading(false);
        return;
    }

    const newLogEntry: IncomingLog = {
        id: Math.random().toString(36).substring(2, 15),
        ...values,
        productName: selectedProduct.name,
        timestamp: values.receivedAt.toISOString(),
        type: 'incoming',
        userId: "mockUserId", // Replace with actual userId
    };
    console.log("Incoming log data:", newLogEntry);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Stock Updated",
        description: `${values.quantity} units of ${selectedProduct.name} added to stock.`,
      });
      form.reset(); // Reset form after successful submission
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log incoming stock.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="max-w-xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ArrowDownToLine className="h-6 w-6 text-primary" /> Log Incoming Stock</CardTitle>
        <CardDescription>Record new stock arrivals to update your inventory.</CardDescription>
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
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
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
                    <FormLabel>Quantity Received</FormLabel>
                    <FormControl>
                        <Input type="number" placeholder="0" {...field} disabled={isLoading} />
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
                    <FormLabel className="mb-1.5">Date of Arrival</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                        <FormControl>
                            <Button
                            variant={"outline"}
                            className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                            )}
                            disabled={isLoading}
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
                            date > new Date() || date < new Date("1900-01-01") || isLoading
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
              name="purchaseOrder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Purchase Order # (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., PO-12345" {...field} disabled={isLoading} />
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
                    <Input placeholder="e.g., Supplier Corp." {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Logging..." : "Log Incoming Stock"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
