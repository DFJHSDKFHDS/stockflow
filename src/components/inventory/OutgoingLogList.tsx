// src/components/inventory/OutgoingLogList.tsx
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
import type { GatePass, GatePassItem } from "@/types";
import { FileText, CalendarDays, UserCircle, ShoppingBag, Hash, Eye, Printer, ImageOff } from "lucide-react"; 
import { User as UserIcon } from "lucide-react"; 
import { useAuth } from "@/contexts/AuthContext";
import { rtdb } from "@/lib/firebase";
import { ref as databaseRef, onValue, off } from "firebase/database";
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
import { GatePassModal } from "@/components/gatepass/GatePassModal"; 
import { QRCodeSVG } from 'qrcode.react'; // Import QRCodeSVG

export function OutgoingLogList() {
  const [gatePasses, setGatePasses] = React.useState<GatePass[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [selectedPass, setSelectedPass] = React.useState<GatePass | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = React.useState(false);
  const [isPrintableSlipModalOpen, setIsPrintableSlipModalOpen] = React.useState(false);


  React.useEffect(() => {
    if (authLoading || !user) {
      setIsLoading(authLoading);
      if (!authLoading && !user) setGatePasses([]);
      return;
    }

    setIsLoading(true);
    const gatePassesDbRef = databaseRef(rtdb, `Stockflow/${user.uid}/gatePasses`);

    const listener = onValue(gatePassesDbRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const passList: GatePass[] = Object.entries(data)
          .map(([key, value]) => ({
            ...(value as Omit<GatePass, 'id'>),
            id: key,
          }))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); 
        setGatePasses(passList);
      } else {
        setGatePasses([]);
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching gate passes:", error);
      toast({ title: "Error", description: "Failed to fetch outgoing logs.", variant: "destructive" });
      setIsLoading(false);
    });

    return () => {
      off(gatePassesDbRef, 'value', listener);
    };
  }, [user, authLoading, toast]);

  const handleViewPassDetails = (pass: GatePass) => {
    setSelectedPass(pass);
    setIsDetailsModalOpen(true);
  };

  const handleViewPrintableSlip = () => {
    if (selectedPass && selectedPass.generatedPassContent) {
      setIsPrintableSlipModalOpen(true);
    } else {
      toast({ title: "Not Available", description: "Printable slip content not found for this pass.", variant: "default" });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-full max-w-sm mt-1" />
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {[...Array(6)].map((_, i) => <TableHead key={i}><Skeleton className="h-5 w-full" /></TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(6)].map((_, j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}
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
          if (!isOpen) setSelectedPass(null);
      }}>
        <DialogContent className="sm:max-w-2xl"> 
          <DialogHeader>
            <DialogTitle>Gate Pass Summary</DialogTitle>
            <DialogDescription>
              ID: {selectedPass?.id.substring(1, 9)}... | Created: {selectedPass?.createdAt ? format(new Date(selectedPass.createdAt), "PPpp") : "N/A"}
            </DialogDescription>
          </DialogHeader>
          {selectedPass && (
            <ScrollArea className="max-h-[70vh] p-1 pr-3">
              <div className="space-y-4 my-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Details</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2 pt-4">
                        <div className="flex items-center">
                            <UserCircle className="mr-2 h-5 w-5 text-muted-foreground" />
                            <strong>Customer:</strong> <span className="ml-1">{selectedPass.customerName}</span>
                        </div>
                        <div className="flex items-center">
                            <CalendarDays className="mr-2 h-5 w-5 text-muted-foreground" />
                            <strong>Dispatch Date & Time:</strong> 
                            <span className="ml-1">
                                {selectedPass.date ? format(new Date(selectedPass.date), "PPPp") : "N/A"}
                            </span>
                        </div>
                        <div className="flex items-center">
                          <UserIcon className="mr-2 h-5 w-5 text-muted-foreground" />
                          <strong>Authorized By:</strong> <span className="ml-1">{selectedPass.userName}</span>
                        </div>
                         <div className="flex items-center">
                            <ShoppingBag className="mr-2 h-5 w-5 text-muted-foreground" />
                            <strong>Total Items:</strong> <span className="ml-1">{selectedPass.totalQuantity}</span>
                        </div>
                        <div className="flex items-center">
                            <Hash className="mr-2 h-5 w-5 text-muted-foreground" />
                            <strong>QR Data (ID):</strong> <span className="ml-1 font-mono text-xs">{selectedPass.qrCodeData}</span>
                        </div>
                        {selectedPass.qrCodeData && (
                            <div className="mt-3 pt-3 border-t flex flex-col items-center">
                              <QRCodeSVG value={selectedPass.qrCodeData} size={120} bgColor={"#ffffff"} fgColor={"#000000"} level={"L"} includeMargin={false} />
                              <p className="text-xs text-muted-foreground mt-1">Scan for Pass ID</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Items Dispatched</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                        {selectedPass.items.length === 0 ? (
                            <p className="text-muted-foreground">No items listed for this pass.</p>
                        ) : (
                        <div className="space-y-3">
                            {selectedPass.items.map((item: GatePassItem) => (
                            <div key={item.productId || item.name} className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50 hover:shadow-sm transition-shadow">
                                {item.imageUrl ? (
                                <Image
                                    src={item.imageUrl}
                                    alt={item.name}
                                    width={64}
                                    height={64}
                                    className="h-16 w-16 rounded-md object-cover border"
                                    data-ai-hint="product item"
                                />
                                ) : (
                                <div className="h-16 w-16 rounded-md bg-muted flex items-center justify-center border" data-ai-hint="placeholder item">
                                    <ImageOff className="h-8 w-8 text-muted-foreground" />
                                </div>
                                )}
                                <div className="flex-grow">
                                <p className="font-semibold">{item.name}</p>
                                <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                                </div>
                                <div className="text-right">
                                <p className="font-medium">Qty: {item.quantity}</p>
                                </div>
                            </div>
                            ))}
                        </div>
                        )}
                    </CardContent>
                </Card>
              </div>
            </ScrollArea>
          )}
          <DialogFooter className="sm:justify-between gap-2">
            {selectedPass?.generatedPassContent && (
                <Button variant="outline" onClick={handleViewPrintableSlip}>
                    <Printer className="mr-2 h-4 w-4" /> View Printable Slip
                </Button>
            )}
            <DialogClose asChild>
                <Button variant="default" onClick={() => setIsDetailsModalOpen(false)}>Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedPass && selectedPass.generatedPassContent && (
        <GatePassModal
          isOpen={isPrintableSlipModalOpen}
          onClose={() => setIsPrintableSlipModalOpen(false)}
          gatePassContent={selectedPass.generatedPassContent}
          qrCodeData={selectedPass.qrCodeData}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileText className="h-6 w-6 text-primary" /> Outgoing Stock</CardTitle>
          <CardDescription>History of all generated gate passes and outgoing product movements.</CardDescription>
        </CardHeader>
        <CardContent>
          {gatePasses.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No outgoing stock entries found.</p>
          ) : (
            <div className="rounded-md border shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Date & Time</TableHead>
                    <TableHead>Gate Pass ID</TableHead>
                    <TableHead>Customer Name</TableHead>
                    <TableHead className="text-right">Total Items</TableHead>
                    <TableHead>Authorized By</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gatePasses.map((pass) => (
                    <TableRow key={pass.id}>
                      <TableCell>{pass.date ? format(new Date(pass.date), "MMM dd, yyyy p") : "N/A"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono">{pass.id.substring(1, 9)}...</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{pass.customerName}</TableCell>
                      <TableCell className="text-right">{pass.totalQuantity}</TableCell>
                      <TableCell>{pass.userName}</TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="sm" onClick={() => handleViewPassDetails(pass)}>
                          <Eye className="mr-1 h-4 w-4" /> View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
