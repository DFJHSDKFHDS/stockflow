// src/components/inventory/IncomingLogList.tsx
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
import { Badge } from "@/components/ui/badge";
import type { IncomingLog, Product } from "@/types";
import { FileText, CalendarDays, Package, Hash, Eye, PlusCircle, ShoppingCart, UserCircle, Tag, ImageOff } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { rtdb } from "@/lib/firebase";
import { ref as databaseRef, onValue, off, get } from "firebase/database";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from "next/image";

export function IncomingLogList() {
  const [incomingLogs, setIncomingLogs] = React.useState<IncomingLog[]>([]);
  const [productsMap, setProductsMap] = React.useState<Record<string, Product>>({});
  const [isLoading, setIsLoading] = React.useState(true);
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [selectedLog, setSelectedLog] = React.useState<IncomingLog | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = React.useState(false);

  React.useEffect(() => {
    if (authLoading || !user) {
      setIsLoading(authLoading);
      if (!authLoading && !user) {
        setIncomingLogs([]);
        setProductsMap({});
      }
      return;
    }

    setIsLoading(true);
    const productsDbRef = databaseRef(rtdb, `Stockflow/${user.uid}/product`);
    const productsListener = onValue(productsDbRef, (snapshot) => {
      const data = snapshot.val();
      setProductsMap(data || {});
    }, (error) => {
      console.error("Error fetching products for map:", error);
      toast({ title: "Error", description: "Failed to fetch product details for logs.", variant: "destructive" });
    });

    const incomingLogsDbRef = databaseRef(rtdb, `Stockflow/${user.uid}/incomingLogs`);
    const logsListener = onValue(incomingLogsDbRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const logList: IncomingLog[] = Object.entries(data)
          .map(([key, value]) => ({
            ...(value as Omit<IncomingLog, 'id'>),
            id: key,
          }))
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); // Sort by log creation time
        setIncomingLogs(logList);
      } else {
        setIncomingLogs([]);
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching incoming logs:", error);
      toast({ title: "Error", description: "Failed to fetch incoming stock logs.", variant: "destructive" });
      setIsLoading(false);
    });

    return () => {
      off(productsDbRef, 'value', productsListener);
      off(incomingLogsDbRef, 'value', logsListener);
    };
  }, [user, authLoading, toast]);

  const handleViewLogDetails = (log: IncomingLog) => {
    setSelectedLog(log);
    setIsDetailsModalOpen(true);
  };

  const getProductImage = (productId: string): string | undefined => {
    return productsMap[productId]?.imageUrl;
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><ShoppingCart className="h-6 w-6 text-primary" /> Incoming Stock Logs</CardTitle>
            <CardDescription>History of all received stock.</CardDescription>
          </div>
          <Skeleton className="h-10 w-32" />
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {[...Array(7)].map((_, i) => <TableHead key={i}><Skeleton className="h-5 w-full" /></TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(7)].map((_, j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Dialog open={isDetailsModalOpen} onOpenChange={(isOpen) => {
          setIsDetailsModalOpen(isOpen);
          if (!isOpen) setSelectedLog(null);
      }}>
        <DialogContent className="sm:max-w-lg"> 
          <DialogHeader>
            <DialogTitle>Incoming Stock Log Details</DialogTitle>
            <DialogDescription>
              Logged: {selectedLog?.timestamp ? format(new Date(selectedLog.timestamp), "PPpp") : "N/A"}
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <ScrollArea className="max-h-[60vh] p-1 pr-3">
              <div className="space-y-4 my-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                          {getProductImage(selectedLog.productId) ? (
                            <Image src={getProductImage(selectedLog.productId)!} alt={selectedLog.productName} width={40} height={40} className="rounded-md object-cover border" data-ai-hint="product item"/>
                          ) : (
                            <Package className="h-6 w-6 text-muted-foreground" />
                          )}
                           {selectedLog.productName}
                        </CardTitle>
                         <CardDescription>SKU: {productsMap[selectedLog.productId]?.sku || 'N/A'}</CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2 pt-4">
                        <div className="flex items-center">
                            <Package className="mr-2 h-5 w-5 text-muted-foreground" />
                            Quantity Received: <Badge variant="default" className="ml-1">{selectedLog.quantity}</Badge>
                        </div>
                        <div className="flex items-center">
                            <CalendarDays className="mr-2 h-5 w-5 text-muted-foreground" />
                            Date Received: 
                            <span className="ml-1">
                                {selectedLog.receivedAt ? format(new Date(selectedLog.receivedAt), "PPP") : "N/A"}
                            </span>
                        </div>
                        {selectedLog.purchaseOrder && (
                          <div className="flex items-center">
                              <FileText className="mr-2 h-5 w-5 text-muted-foreground" />
                              Purchase Order #: <span className="ml-1">{selectedLog.purchaseOrder}</span>
                          </div>
                        )}
                        {selectedLog.supplier && (
                          <div className="flex items-center">
                              <UserCircle className="mr-2 h-5 w-5 text-muted-foreground" />
                              Supplier: <span className="ml-1">{selectedLog.supplier}</span>
                          </div>
                        )}
                        <div className="flex items-center">
                            <Hash className="mr-2 h-5 w-5 text-muted-foreground" />
                            Log ID: <span className="ml-1 font-mono text-xs">{selectedLog.id.substring(1,9)}...</span>
                        </div>
                    </CardContent>
                </Card>
              </div>
            </ScrollArea>
          )}
          <DialogFooter>
            <DialogClose asChild>
                <Button variant="default" onClick={() => setIsDetailsModalOpen(false)}>Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader className="flex flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2"><ShoppingCart className="h-6 w-6 text-primary" /> Incoming Stock</CardTitle>
            <CardDescription>History of all received stock and inventory updates.</CardDescription>
          </div>
          <Link href="/incoming/restock" passHref>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Restock
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {incomingLogs.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No incoming stock entries found. Click "Add Restock" to get started.</p>
          ) : (
            <div className="rounded-md border shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">Image</TableHead>
                    <TableHead className="w-[180px]">Date Received</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>PO #</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incomingLogs.map((log) => {
                    const productImageUrl = getProductImage(log.productId);
                    return (
                      <TableRow key={log.id}>
                        <TableCell>
                          {productImageUrl ? (
                            <Image
                              src={productImageUrl}
                              alt={log.productName}
                              width={40}
                              height={40}
                              className="rounded-md object-cover aspect-square"
                              data-ai-hint="product item"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-muted rounded-md flex items-center justify-center" data-ai-hint="placeholder item">
                              <ImageOff className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{log.receivedAt ? format(new Date(log.receivedAt), "MMM dd, yyyy") : "N/A"}</TableCell>
                        <TableCell className="font-medium">{log.productName}</TableCell>
                        <TableCell className="text-right">{log.quantity}</TableCell>
                        <TableCell>{log.supplier || "-"}</TableCell>
                        <TableCell>{log.purchaseOrder || "-"}</TableCell>
                        <TableCell className="text-center">
                          <Button variant="ghost" size="sm" onClick={() => handleViewLogDetails(log)}>
                            <Eye className="mr-1 h-4 w-4" /> View
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
