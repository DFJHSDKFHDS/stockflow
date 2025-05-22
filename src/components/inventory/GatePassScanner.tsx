// src/components/inventory/GatePassScanner.tsx
"use client";

import * as React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { rtdb } from "@/lib/firebase";
import { ref as databaseRef, get } from "firebase/database";
import { useToast } from "@/hooks/use-toast";
import type { GatePass, GatePassItem } from "@/types";
import { format } from "date-fns";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { QrCode, CameraOff, PackageSearch, UserCircle, CalendarDays, User as UserIcon, ShoppingBag, Hash, ImageOff, Search, Info } from "lucide-react";

// Placeholder for QR Scanner component - you'd integrate a library here
// For example, using html5-qrcode:
// import { Html5QrcodeScanner } from 'html5-qrcode';

export function GatePassScanner() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = React.useState<boolean | null>(null);
  const [scannedPassId, setScannedPassId] = React.useState<string>("");
  const [manualPassId, setManualPassId] = React.useState<string>("");
  const [fetchedPass, setFetchedPass] = React.useState<GatePass | null>(null);
  const [isLoadingPass, setIsLoadingPass] = React.useState<boolean>(false);
  const [fetchError, setFetchError] = React.useState<string | null>(null);

  // Request camera permission
  React.useEffect(() => {
    const getCameraPermission = async () => {
      if (typeof navigator !== "undefined" && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
          setHasCameraPermission(true);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
          // Initialize QR Scanner here if using a library
          // Example with html5-qrcode (conceptual):
          // const scanner = new Html5QrcodeScanner(
          //   "qr-reader", // ID of the div to render the scanner
          //   { fps: 10, qrbox: {width: 250, height: 250} },
          //   false // verbose
          // );
          // const onScanSuccess = (decodedText: string, decodedResult: any) => {
          //   setScannedPassId(decodedText);
          //   scanner.clear(); // Stop scanning
          //   if (videoRef.current && videoRef.current.srcObject) {
          //      (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
          //   }
          // };
          // scanner.render(onScanSuccess, (error: any) => { /* console.warn(error); */ });

        } catch (error) {
          console.error('Error accessing camera:', error);
          setHasCameraPermission(false);
          toast({
            variant: 'destructive',
            title: 'Camera Access Denied',
            description: 'Please enable camera permissions in your browser settings to use the scanner.',
          });
        }
      } else {
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Camera Not Supported',
          description: 'Your browser does not support camera access.',
        });
      }
    };

    getCameraPermission();

    return () => {
      // Cleanup: stop video stream when component unmounts
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      // If using a scanner library, ensure it's cleaned up too.
      // e.g. if (scanner) scanner.clear();
    };
  }, [toast]);
  
  React.useEffect(() => {
    if (scannedPassId && user) { // Ensure user is available before fetching
      handleFetchPass(scannedPassId);
    }
  }, [scannedPassId, user]); // Added user to dependency array


  const handleFetchPass = async (passIdToFetch: string) => {
    if (!user || !passIdToFetch.trim()) {
      if (!passIdToFetch.trim()) {
        toast({ title: "Input Error", description: "Please enter a Pass ID.", variant: "default" });
      }
      return;
    }
    setIsLoadingPass(true);
    setFetchError(null);
    setFetchedPass(null);
    try {
      const passDbRef = databaseRef(rtdb, `Stockflow/${user.uid}/gatePasses/${passIdToFetch.trim()}`);
      const snapshot = await get(passDbRef);
      if (snapshot.exists()) {
        setFetchedPass({ ...snapshot.val(), id: snapshot.key } as GatePass);
      } else {
        setFetchError("Gate Pass ID not found.");
        toast({ title: "Not Found", description: "No gate pass found with this ID.", variant: "destructive" });
      }
    } catch (err: any) {
      console.error("Error fetching pass:", err);
      setFetchError("Failed to fetch gate pass details.");
      toast({ title: "Error", description: err.message || "Failed to fetch pass details.", variant: "destructive" });
    } finally {
      setIsLoadingPass(false);
    }
  };

  const handleSubmitManualId = (e: React.FormEvent) => {
    e.preventDefault();
    handleFetchPass(manualPassId);
  };


  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><QrCode className="h-6 w-6 text-primary" /> Scan Gate Pass ID</CardTitle>
        <CardDescription>Point your camera at a Gate Pass QR code, or enter the ID manually.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {hasCameraPermission === null && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Camera Status</AlertTitle>
            <AlertDescription>Checking camera permissions...</AlertDescription>
          </Alert>
        )}

        {hasCameraPermission === true && (
          <div className="space-y-4">
            <div className="bg-muted rounded-md overflow-hidden aspect-video relative flex items-center justify-center">
              <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-60 h-60 border-4 border-dashed border-primary/70 rounded-lg"></div>
              </div>
              {/* This is where you'd integrate a QR scanner library display element */}
              {/* <div id="qr-reader" className="w-full"></div> */}
            </div>
             <Alert variant="default">
              <QrCode className="h-4 w-4" />
              <AlertTitle>Scanning Active</AlertTitle>
              <AlertDescription>
                Point your camera at the QR code. 
                If scanning doesn't work, use the manual entry below.
                <br />
                <strong className="font-semibold">Note:</strong> Actual QR code scanning logic needs a specialized library (e.g., html5-qrcode) to be integrated here.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {hasCameraPermission === false && (
          <Alert variant="destructive">
            <CameraOff className="h-4 w-4" />
            <AlertTitle>Camera Access Required</AlertTitle>
            <AlertDescription>
              Camera access is disabled or not available. Please enable it in your browser settings, or use manual entry.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmitManualId} className="space-y-3">
          <Label htmlFor="manualPassId">Manual Gate Pass ID Entry</Label>
          <div className="flex gap-2">
            <Input
              id="manualPassId"
              type="text"
              value={manualPassId}
              onChange={(e) => setManualPassId(e.target.value)}
              placeholder="Enter Gate Pass ID"
              disabled={isLoadingPass || authLoading}
              className="flex-grow"
            />
            <Button type="submit" disabled={isLoadingPass || authLoading || !manualPassId.trim()}>
              <Search className="mr-2 h-4 w-4" /> Find
            </Button>
          </div>
        </form>

        {isLoadingPass && (
           <div className="space-y-4 pt-4">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {fetchError && !isLoadingPass && (
          <Alert variant="destructive">
            <PackageSearch className="h-4 w-4" />
            <AlertTitle>Fetch Error</AlertTitle>
            <AlertDescription>{fetchError}</AlertDescription>
          </Alert>
        )}

        {fetchedPass && !isLoadingPass && (
          <div className="border-t pt-6 mt-6 space-y-4">
            <h3 className="text-xl font-semibold">Gate Pass Summary</h3>
            <Card className="shadow-md">
                <CardHeader className="pb-2 bg-muted/30">
                    <CardTitle className="text-lg">Details</CardTitle>
                     <CardDescription>
                        ID: {fetchedPass.id.substring(1, 9)}... | Created: {fetchedPass.createdAt ? format(new Date(fetchedPass.createdAt), "PPpp") : "N/A"}
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-sm space-y-3 pt-4">
                    <div className="flex items-center">
                        <UserCircle className="mr-2 h-5 w-5 text-muted-foreground" />
                        <strong>Customer:</strong> <span className="ml-1">{fetchedPass.customerName}</span>
                    </div>
                    <div className="flex items-center">
                        <CalendarDays className="mr-2 h-5 w-5 text-muted-foreground" />
                        <strong>Dispatch Date & Time:</strong> 
                        <span className="ml-1">
                            {fetchedPass.date ? format(new Date(fetchedPass.date), "PPPp") : "N/A"}
                        </span>
                    </div>
                    <div className="flex items-center">
                      <UserIcon className="mr-2 h-5 w-5 text-muted-foreground" />
                      <strong>Authorized By:</strong> <span className="ml-1">{fetchedPass.userName}</span>
                    </div>
                     <div className="flex items-center">
                        <ShoppingBag className="mr-2 h-5 w-5 text-muted-foreground" />
                        <strong>Total Items:</strong> <span className="ml-1">{fetchedPass.totalQuantity}</span>
                    </div>
                    <div className="flex items-center">
                        <Hash className="mr-2 h-5 w-5 text-muted-foreground" />
                        <strong>QR Data (ID):</strong> <span className="ml-1 font-mono text-xs">{fetchedPass.qrCodeData}</span>
                    </div>
                    {fetchedPass.qrCodeData && (
                        <div className="mt-3 pt-3 border-t flex flex-col items-center" data-ai-hint="qr code">
                        <Image 
                            src={`https://placehold.co/120x120.png?text=ID:\n${encodeURIComponent(fetchedPass.qrCodeData.substring(0,50))}`} 
                            alt="QR Code Placeholder" 
                            width={120} 
                            height={120}
                            className="rounded-md"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Scan for Pass ID</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="shadow-md">
                <CardHeader className="pb-2 bg-muted/30">
                    <CardTitle className="text-lg">Items Dispatched</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <ScrollArea className="max-h-[300px]">
                    {fetchedPass.items.length === 0 ? (
                        <p className="text-muted-foreground">No items listed for this pass.</p>
                    ) : (
                    <div className="space-y-3">
                        {fetchedPass.items.map((item: GatePassItem) => (
                        <div key={item.productId || item.name} className="flex items-center gap-3 p-3 border rounded-lg bg-background hover:shadow-sm transition-shadow">
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
                  </ScrollArea>
                </CardContent>
            </Card>
             {fetchedPass.generatedPassContent && (
                <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Printable Slip Available</AlertTitle>
                    <AlertDescription>
                        This gate pass has an AI-generated printable slip. You can view it from the "Outgoing Stock" page.
                    </AlertDescription>
                </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

    