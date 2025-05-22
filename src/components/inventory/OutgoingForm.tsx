// src/components/inventory/OutgoingForm.tsx
"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
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
import { CalendarIcon, Ticket, PlusCircle, User, ShoppingCart, Search, XCircle, MinusCircle, ImageOff } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { Product, GatePass, GatePassItem as AppGatePassItem, UserProfileData } from "@/types";
// AI flow import removed as per user request
import { GatePassModal } from "@/components/gatepass/GatePassModal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { rtdb } from "@/lib/firebase";
import { ref as databaseRef, onValue, off, update, push, get, runTransaction } from "firebase/database";
import { PasswordConfirmationModal } from "@/components/auth/PasswordConfirmationModal";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

const outgoingFormDetailsSchema = z.object({
  dispatchedAt: z.date({ required_error: "Date of dispatch is required." }),
  customerName: z.string().min(3, "Customer Name is required."),
  // reason: z.string().min(5, "Reason for dispatch is required.").optional(), // Removed as per user request
});

type OutgoingFormDetailsValues = z.infer<typeof outgoingFormDetailsSchema>;

interface SelectedItem extends AppGatePassItem {
  availableStock: number;
}

const ProductSelectionCard = ({ 
  product, 
  onSelect, 
  quantityInCart 
}: { 
  product: Product, 
  onSelect: (product: Product) => void, 
  quantityInCart: number 
}) => (
  <Card
    className={cn(
      "cursor-pointer hover:shadow-lg transition-all duration-200 ease-in-out overflow-hidden group",
      product.currentStock === 0 ? "opacity-60 cursor-not-allowed bg-muted/50" : "hover:ring-2 hover:ring-primary",
      quantityInCart > 0 ? "ring-2 ring-primary shadow-md" : "border"
    )}
    onClick={() => product.currentStock > 0 && onSelect(product)}
    role="button"
    aria-label={`Add ${product.name} to gate pass`}
    tabIndex={product.currentStock > 0 ? 0 : -1}
    onKeyDown={(e) => {
      if ((e.key === 'Enter' || e.key === ' ') && product.currentStock > 0) {
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
        {quantityInCart > 0 && (
          <Badge variant="secondary" className="absolute top-2 right-2 bg-primary text-primary-foreground shadow">
            {quantityInCart} In Cart
          </Badge>
        )}
         {product.currentStock === 0 && (
          <Badge variant="destructive" className="absolute bottom-2 left-2">
            Out of Stock
          </Badge>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-base truncate group-hover:text-primary" title={product.name}>{product.name}</h3>
        <p className="text-xs text-muted-foreground mb-1">Stock: {product.currentStock}</p>
        <p className="text-sm font-bold text-primary">Rs {product.unitPrice?.toFixed(2) || "N/A"}</p>
      </div>
    </CardContent>
  </Card>
);


export function OutgoingForm() {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  const [allProducts, setAllProducts] = React.useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = React.useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState("");

  const [selectedItems, setSelectedItems] = React.useState<SelectedItem[]>([]);
  
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showGatePassModal, setShowGatePassModal] = React.useState(false);
  const [gatePassContentForModal, setGatePassContentForModal] = React.useState("");
  const [qrCodeDataForPass, setQrCodeDataForPass] = React.useState("");

  const [isPasswordModalOpen, setIsPasswordModalOpen] = React.useState(false);
  const [pendingFormValues, setPendingFormValues] = React.useState<OutgoingFormDetailsValues | null>(null);

  const form = useForm<OutgoingFormDetailsValues>({
    resolver: zodResolver(outgoingFormDetailsSchema),
    defaultValues: {
      dispatchedAt: new Date(),
      customerName: "",
      // reason: "", // Removed as per user request
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
    if (product.currentStock === 0) return;

    setSelectedItems(prevItems => {
      const existingItemIndex = prevItems.findIndex(item => item.productId === product.id);
      if (existingItemIndex > -1) {
        const updatedItems = [...prevItems];
        const currentItem = updatedItems[existingItemIndex];
        if (currentItem.quantity < product.currentStock) {
          updatedItems[existingItemIndex] = { ...currentItem, quantity: currentItem.quantity + 1 };
        } else {
          toast({ title: "Stock Limit", description: `Cannot add more ${product.name}. Max stock reached.`, variant: "default" });
        }
        return updatedItems;
      } else {
        if (product.currentStock > 0) {
          return [...prevItems, { 
            productId: product.id, 
            name: product.name, 
            sku: product.sku, 
            quantity: 1, 
            availableStock: product.currentStock,
            imageUrl: product.imageUrl || "",
          }];
        }
        return prevItems;
      }
    });
  };

  const updateItemQuantity = (productId: string, newQuantity: number) => {
    const productDetails = allProducts.find(p => p.id === productId);
    if (!productDetails) return;

    const clampedQuantity = Math.max(0, Math.min(newQuantity, productDetails.currentStock));

    setSelectedItems(prevItems => 
      prevItems.map(item => 
        item.productId === productId ? { ...item, quantity: clampedQuantity } : item
      ).filter(item => item.quantity > 0) 
    );
  };

  const incrementItemQuantity = (productId: string) => {
    const item = selectedItems.find(i => i.productId === productId);
    if (item) {
      updateItemQuantity(productId, item.quantity + 1);
    }
  };

  const decrementItemQuantity = (productId: string) => {
    const item = selectedItems.find(i => i.productId === productId);
    if (item) {
      updateItemQuantity(productId, item.quantity - 1);
    }
  };

  const removeItemFromCart = (productId: string) => {
    setSelectedItems(prevItems => prevItems.filter(item => item.productId !== productId));
  };

  const triggerPasswordConfirmation = (values: OutgoingFormDetailsValues) => {
    if (!user) return;
    if (selectedItems.length === 0) {
      toast({ title: "No Items", description: "Please select at least one product.", variant: "destructive" });
      return;
    }
    let stockError = false;
    selectedItems.forEach(item => {
      const productDetails = allProducts.find(p => p.id === item.productId);
      if (!productDetails || item.quantity > productDetails.currentStock) {
        stockError = true;
        toast({ title: "Stock Issue", description: `Stock for ${item.name} may have changed. Max available: ${productDetails?.currentStock ?? 0}.`, variant: "destructive" });
      }
    });
    if (stockError) return;

    setPendingFormValues(values);
    setIsPasswordModalOpen(true);
  };
  
  const generatePlainTextGatePass = (
    gatePassNumber: number,
    customerName: string,
    dispatchDateTime: Date,
    userName: string,
    gatePassId: string,
    items: AppGatePassItem[],
    totalQuantity: number,
    profileData: UserProfileData | null
  ): string => {
    const SLIP_WIDTH = 42; // Approximate width for thermal printers
    const centerText = (text: string) => {
      if (!text) return "";
      const padLength = Math.floor((SLIP_WIDTH - text.length) / 2);
      return ' '.repeat(Math.max(0, padLength)) + text;
    };
    const line = '-'.repeat(SLIP_WIDTH);
  
    let content = `${centerText("GET PASS")}\n`;
    content += `${line}\n`;
    if (profileData?.shopName) content += `${centerText(profileData.shopName)}\n`;
    if (profileData?.address) { // Simple address wrapping
        const addressWords = profileData.address.split(' ');
        let currentLine = "";
        addressWords.forEach(word => {
            if ((currentLine + word).length + 1 > SLIP_WIDTH -2) { // -2 for potential centering spaces
                content += `${centerText(currentLine.trim())}\n`;
                currentLine = word + " ";
            } else {
                currentLine += word + " ";
            }
        });
        if(currentLine.trim()) content += `${centerText(currentLine.trim())}\n`;
    }
    if (profileData?.contactNo) content += `${centerText("Contact: " + profileData.contactNo)}\n`;
    content += `${line}\n`;
  
    content += `Gate Pass No. : ${gatePassNumber}\n`;
    content += `Date & Time   : ${format(dispatchDateTime, "PPpp")}\n`; //PPPp "MMM d, yyyy, h:mm:ss aa"
    content += `Customer Name : ${customerName}\n`;
    content += `Authorized By : ${userName}\n`;
    content += `Gate Pass ID  : ${gatePassId.substring(0,12)}... (For QR)\n`; // Shorten for display
    content += `${line}\n`;
  
    content += `S.N. Product (SKU)                 Qty\n`; // Adjusted for alignment
    content += `${line}\n`;
  
    items.forEach((item, index) => {
      const sn = (index + 1).toString().padEnd(3);
      const productNameWithSku = `${item.name.substring(0, 18)} (${item.sku.substring(0,6)}..)`;
      const productDisplay = productNameWithSku.padEnd(30);
      const qty = item.quantity.toString().padStart(3);
      content += `${sn} ${productDisplay} ${qty}\n`;
    });
  
    content += `${line}\n`;
    content += `Total Quantity:${totalQuantity.toString().padStart(SLIP_WIDTH - "Total Quantity:".length)}\n`;
    content += `${line}\n\n`;
    content += `${centerText("Receiver's Signature")}\n`;
    content += `${centerText("______________________")}\n\n`;
    // content += `${centerText("Valid only for today")}\n`; // Optional, as per image
  
    return content.trim();
  };

  const processGatePassCreation = async () => {
    if (!user || !pendingFormValues || selectedItems.length === 0) {
      toast({ title: "Error", description: "User, form data, or selected items missing.", variant: "destructive" });
      setIsSubmitting(false); 
      return;
    }
    setIsSubmitting(true);
    const values = pendingFormValues;

    const selectedDateFromForm = new Date(values.dispatchedAt);
    const currentTime = new Date();
    const finalDispatchDateTime = new Date(
      selectedDateFromForm.getFullYear(),
      selectedDateFromForm.getMonth(),
      selectedDateFromForm.getDate(),
      currentTime.getHours(),
      currentTime.getMinutes(),
      currentTime.getSeconds()
    );

    const gatePassId = push(databaseRef(rtdb, `Stockflow/${user.uid}/gatePasses`)).key;
    if (!gatePassId) {
      toast({ title: "Error", description: "Failed to generate Gate Pass ID.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }
    
    const lastGatePassNumberRef = databaseRef(rtdb, `Stockflow/${user.uid}/counters/lastGatePassNumber`);
    let newGatePassNumber = 0; // Initialize to satisfy TypeScript, will be set by transaction

    try {
      const transactionResult = await runTransaction(lastGatePassNumberRef, (currentData) => {
        if (currentData === null) {
          return 1; 
        }
        return currentData + 1;
      });

      if (!transactionResult.committed || typeof transactionResult.snapshot.val() !== 'number') {
        throw new Error("Failed to update gate pass number counter.");
      }
      newGatePassNumber = transactionResult.snapshot.val() as number;

      const gatePassDbItems: AppGatePassItem[] = selectedItems.map(item => ({
        productId: item.productId,
        name: item.name,
        sku: item.sku,
        quantity: item.quantity,
        imageUrl: item.imageUrl, // Already ensuring this is string
      }));

      const totalQuantity = gatePassDbItems.reduce((sum, item) => sum + item.quantity, 0);
      const userName = user.displayName || user.email || "N/A";
      
      // Fetch profile data
      let userProfileData: UserProfileData | null = null;
      try {
        const profileDbRef = databaseRef(rtdb, `Stockflow/${user.uid}/profileData`);
        const profileSnapshot = await get(profileDbRef);
        if (profileSnapshot.exists()) {
          userProfileData = profileSnapshot.val() as UserProfileData;
        }
      } catch (profileError) {
        console.warn("Could not fetch user profile data for gate pass:", profileError);
        toast({title: "Profile Data Notice", description: "Could not fetch shop details for the pass. Using defaults.", variant: "default"});
      }
      
      // Generate plain text content (No AI call)
      const plainTextPassContent = generatePlainTextGatePass(
        newGatePassNumber,
        values.customerName,
        finalDispatchDateTime,
        userName,
        gatePassId, 
        gatePassDbItems,
        totalQuantity,
        userProfileData
      );
      
      const gatePassData: GatePass = {
        id: gatePassId,
        gatePassNumber: newGatePassNumber,
        userId: user.uid,
        userName: userName,
        items: gatePassDbItems,
        customerName: values.customerName,
        date: finalDispatchDateTime.toISOString(),
        totalQuantity: totalQuantity,
        createdAt: new Date().toISOString(),
        qrCodeData: gatePassId, 
        generatedPassContent: plainTextPassContent, // Store the plain text content
      };

      const stockUpdates: { [key: string]: any } = {};
      const productFetchPromises = selectedItems.map(item => 
        get(databaseRef(rtdb, `Stockflow/${user.uid}/product/${item.productId}/currentStock`))
      );
      
      const productStockSnapshots = await Promise.all(productFetchPromises);
      
      for (let i = 0; i < selectedItems.length; i++) {
        const item = selectedItems[i];
        const currentStockSnapshot = productStockSnapshots[i];
        const currentStock = currentStockSnapshot.val();

        if (typeof currentStock !== 'number' || item.quantity > currentStock) {
          await runTransaction(lastGatePassNumberRef, (currentData) => { // Attempt to roll back counter
            if (currentData !== null && currentData >= newGatePassNumber && newGatePassNumber > 0) { 
              return currentData - 1;
            }
            return currentData;
          }).catch(rollbackError => console.error("Counter rollback failed:", rollbackError));
          toast({ title: "Stock Update Error", description: `Not enough stock for ${item.name}. Available: ${currentStock ?? 'N/A'}. Please refresh.`, variant: "destructive" });
          setIsSubmitting(false);
          return;
        }
        stockUpdates[`Stockflow/${user.uid}/product/${item.productId}/currentStock`] = currentStock - item.quantity;
        stockUpdates[`Stockflow/${user.uid}/product/${item.productId}/updatedAt`] = new Date().toISOString();
      }

      stockUpdates[`Stockflow/${user.uid}/gatePasses/${gatePassId}`] = gatePassData;
      await update(databaseRef(rtdb), stockUpdates);

      toast({ title: "Gate Pass Logged & Stock Updated", description: "Successfully recorded outgoing items." });
      
      setGatePassContentForModal(plainTextPassContent);
      setQrCodeDataForPass(gatePassId);
      setShowGatePassModal(true);
      
      form.reset({ dispatchedAt: new Date(), customerName: "" });
      setSelectedItems([]);

    } catch (error: any) {
      console.error("Error processing gate pass:", error);
      toast({ title: "Processing Error", description: error.message || "Failed to process gate pass and update stock.", variant: "destructive" });
      if (newGatePassNumber > 0) { // Ensure counter rollback only if number was generated
          await runTransaction(lastGatePassNumberRef, (currentData) => {
            if (currentData !== null && currentData === newGatePassNumber) { 
              return currentData - 1;
            }
            return currentData;
          }).catch(rollbackError => console.error("Counter rollback failed:", rollbackError));
      }
    } finally {
      setIsSubmitting(false);
      setPendingFormValues(null);
    }
  };
  
  const summaryTotalQuantity = selectedItems.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);

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
        onClose={() => setShowGatePassModal(false)}
        gatePassContent={gatePassContentForModal}
        qrCodeData={qrCodeDataForPass}
      />

      <div className="flex flex-col md:flex-row gap-4 h-[calc(100vh-var(--header-height,100px)-2rem)]">
        <Card className="md:w-2/3 flex flex-col shadow-lg">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShoppingCart className="h-5 w-5 text-primary" /> Select Products
            </CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search products by name, SKU, category..."
                className="pl-8 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={isLoadingProducts}
              />
            </div>
          </CardHeader>
          <CardContent className="p-3 flex-grow overflow-hidden">
            {isLoadingProducts && (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {[...Array(8)].map((_, i) => (
                  <Card key={i} className="overflow-hidden">
                    <Skeleton className="aspect-[4/3] w-full" />
                    <div className="p-3 space-y-1.5">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-4 w-1/3" />
                    </div>
                  </Card>
                ))}
              </div>
            )}
            {!isLoadingProducts && filteredProducts.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Search className="w-16 h-16 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {allProducts.length === 0 ? "No products available in inventory." : "No products match your search."}
                </p>
              </div>
            )}
            {!isLoadingProducts && filteredProducts.length > 0 && (
              <ScrollArea className="h-full pr-1">
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {filteredProducts.map(product => (
                    <ProductSelectionCard 
                      key={product.id}
                      product={product}
                      onSelect={handleProductSelect}
                      quantityInCart={selectedItems.find(item => item.productId === product.id)?.quantity || 0}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Card className="md:w-1/3 flex flex-col shadow-lg">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Ticket className="h-5 w-5 text-primary" /> Gate Pass Details
            </CardTitle>
            <CardDescription>Review items and enter dispatch information.</CardDescription>
          </CardHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(triggerPasswordConfirmation)} className="flex flex-col flex-grow">
              <CardContent className="p-3 space-y-4 flex-grow overflow-y-auto">
                <ScrollArea className="h-[calc(50vh-180px)] sm:h-auto sm:max-h-[300px] pr-2">
                  {selectedItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No items selected yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedItems.map(item => (
                        <div key={item.productId} className="flex items-center gap-2 p-2 border rounded-md bg-muted/30">
                           {item.imageUrl ? (
                            <Image src={item.imageUrl} alt={item.name} width={32} height={32} className="h-8 w-8 rounded object-cover" data-ai-hint="product item" />
                          ) : (
                            <div className="h-8 w-8 rounded bg-muted flex items-center justify-center" data-ai-hint="placeholder item">
                              <ImageOff className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-grow">
                            <p className="text-sm font-medium truncate" title={item.name}>{item.name}</p>
                            <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => decrementItemQuantity(item.productId)} disabled={isSubmitting}>
                              <MinusCircle className="h-4 w-4" />
                            </Button>
                            <Input 
                              type="number" 
                              className="h-7 w-12 text-center px-1" 
                              value={item.quantity}
                              onChange={(e) => updateItemQuantity(item.productId, parseInt(e.target.value,10) || 0)}
                              min="0"
                              max={item.availableStock}
                              disabled={isSubmitting}
                            />
                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => incrementItemQuantity(item.productId)} disabled={isSubmitting || item.quantity >= item.availableStock}>
                              <PlusCircle className="h-4 w-4" />
                            </Button>
                          </div>
                           <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeItemFromCart(item.productId)} disabled={isSubmitting}>
                              <XCircle className="h-4 w-4" />
                            </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                {selectedItems.length > 0 && (
                  <div className="border-t pt-3 mt-3">
                    <div className="flex justify-between font-semibold">
                      <span>Total Quantity:</span>
                      <span>{summaryTotalQuantity}</span>
                    </div>
                     <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <User className="h-3 w-3" />
                        Created by: {user?.displayName || user?.email || "Current User"}
                    </p>
                  </div>
                )}
                
                <div className="space-y-3 pt-2">
                  <FormField
                    control={form.control}
                    name="customerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Customer Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Customer X, Retail Partner Y" {...field} disabled={isSubmitting} />
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
                        <FormLabel className="text-sm mb-0.5">Date of Dispatch</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn("w-full pl-3 text-left font-normal",!field.value && "text-muted-foreground")}
                                disabled={isSubmitting}
                              >
                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>} 
                                <span className="ml-auto text-xs text-muted-foreground">
                                  (Time will be current)
                                </span>
                                <CalendarIcon className="ml-2 h-4 w-4 opacity-50" />
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
              </CardContent>
              
              <CardFooter className="border-t p-3 mt-auto">
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={isSubmitting || authLoading || isLoadingProducts || selectedItems.length === 0 || summaryTotalQuantity === 0}
                >
                  {isSubmitting ? "Processing..." : "Log Outgoing & Generate Pass"}
                  {!isSubmitting && <Ticket className="ml-2 h-4 w-4" />}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      </div>
    </>
  );
}
