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
import type { GatePass } from "@/types";
import { FileText, CalendarDays, UserCircle, ShoppingBag, Hash, Eye, User } from "lucide-react"; // Added User
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
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from "next/image";
import { GatePassModal } from "@/components/gatepass/GatePassModal"; // Re-use for viewing

export function OutgoingLogList() {
  const [gatePasses, setGatePasses] = React.useState<GatePass[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [selectedPass, setSelectedPass] = React.useState<GatePass | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = React.useState(false);

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
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); // Sort by most recent
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

  const handleViewPass = (pass: GatePass) => {
    setSelectedPass(pass);
    setIsViewModalOpen(true);
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
      {selectedPass && selectedPass.generatedPassContent && ( // Check if AI content exists
         <GatePassModal
          isOpen={isViewModalOpen && !!selectedPass.generatedPassContent}
          onClose={() => {
            setIsViewModalOpen(false);
            // setSelectedPass(null); // Keep selectedPass if you want to show details dialog first
          }}
          gatePassContent={selectedPass.generatedPassContent}
          qrCodeData={selectedPass.qrCodeData}
        />
      )}
      {/* Details Dialog for passes without AI content or for general view */}
      <Dialog open={isViewModalOpen && !selectedPass?.generatedPassContent} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Gate Pass Details (ID: {selectedPass?.id.substring(0, 8)}...)</DialogTitle>
            <DialogDescription>
              Details for gate pass created on {selectedPass?.date ? format(new Date(selectedPass.date), "PPP") : "N/A"}.
            </DialogDescription>
          </DialogHeader>
          {selectedPass && (
            <ScrollArea className="max-h-[60vh] p-1">
              <div className="space-y-3 my-4">
                <div className="flex items-center">
                  <UserCircle className="mr-2 h-5 w-5 text-muted-foreground" />
                  <strong>Customer:</strong> <span className="ml-1">{selectedPass.customerName}</span>
                </div>
                <div className="flex items-center">
                  <CalendarDays className="mr-2 h-5 w-5 text-muted-foreground" />
                  <strong>Date:</strong> <span className="ml-1">{format(new Date(selectedPass.date), "PPP")}</span>
                </div>
                 <div className="flex items-center">
                  <User className="mr-2 h-5 w-5 text-muted-foreground" />
                  <strong>Authorized By:</strong> <span className="ml-1">{selectedPass.userName}</span>
                </div>
                <div className="flex items-center">
                  <ShoppingBag className="mr-2 h-5 w-5 text-muted-foreground" />
                  <strong>Total Items:</strong> <span className="ml-1">{selectedPass.totalQuantity}</span>
                </div>
                <div className="flex items-center">
                  <Hash className="mr-2 h-5 w-5 text-muted-foreground" />
                  <strong>QR Data:</strong> <span className="ml-1 truncate">{selectedPass.qrCodeData}</span>
                </div>

                <h4 className="font-semibold mt-3 pt-3 border-t">Items:</h4>
                <ul className="space-y-2">
                  {selectedPass.items.map(item => (
                    <li key={item.productId} className="text-sm p-2 border rounded-md bg-muted/50">
                      {item.name} (SKU: {item.sku}) - Qty: {item.quantity}
                    </li>
                  ))}
                </ul>
                 {selectedPass.qrCodeData && (
                    <div className="mt-4 text-center pt-3 border-t" data-ai-hint="qr code">
                      <Image 
                        src={`https://placehold.co/150x150.png?text=QR+Data:\n${encodeURIComponent(selectedPass.qrCodeData.substring(0,50))}`} 
                        alt="QR Code Placeholder" 
                        width={120} 
                        height={120}
                      />
                      <p className="text-xs text-muted-foreground mt-1">QR Code (Data: {selectedPass.qrCodeData.substring(0,30)}...)</p>
                    </div>
                  )}
              </div>
            </ScrollArea>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileText className="h-6 w-6 text-primary" /> Outgoing Logs</CardTitle>
          <CardDescription>History of all generated gate passes and outgoing product movements.</CardDescription>
        </CardHeader>
        <CardContent>
          {gatePasses.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No outgoing logs found.</p>
          ) : (
            <div className="rounded-md border shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">Date</TableHead>
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
                      <TableCell>{format(new Date(pass.date), "MMM dd, yyyy")}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono">{pass.id.substring(1, 9)}...</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{pass.customerName}</TableCell>
                      <TableCell className="text-right">{pass.totalQuantity}</TableCell>
                      <TableCell>{pass.userName}</TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="sm" onClick={() => handleViewPass(pass)}>
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

    