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
import { QRCodeSVG } from 'qrcode.react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { cn } from "@/lib/utils";

export function GatePassScanner() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [hasCameraPermission, setHasCameraPermission] = React.useState<boolean | null>(null);
  const [scannedPassId, setScannedPassId] = React.useState<string>("");
  const [manualPassId, setManualPassId] = React.useState<string>("");
  const [fetchedPass, setFetchedPass] = React.useState<GatePass | null>(null);
  const [isLoadingPass, setIsLoadingPass] = React.useState<boolean>(false);
  const [fetchError, setFetchError] = React.useState<string | null>(null);
  const [isScannerActive, setIsScannerActive] = React.useState(false);

  const html5QrCodeScannerRef = React.useRef<Html5QrcodeScanner | null>(null);
  const qrReaderId = "qr-reader-element";

  React.useEffect(() => {
    const startScanner = async () => {
      if (typeof navigator === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Camera Not Supported',
          description: 'Your browser does not support camera access.',
        });
        return;
      }

      if (hasCameraPermission === false) return; 

      try {
        // Check for environment camera support and get permission
        const tempStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        tempStream.getTracks().forEach(track => track.stop()); // Stop temp stream, scanner will start its own
        setHasCameraPermission(true);
        setIsScannerActive(true);

        if (document.getElementById(qrReaderId) && !html5QrCodeScannerRef.current) {
          const scanner = new Html5QrcodeScanner(
            qrReaderId,
            {
              fps: 10,
              qrbox: (viewfinderWidth, viewfinderHeight) => {
                const minDimension = Math.min(viewfinderWidth, viewfinderHeight);
                const qrboxSize = Math.floor(minDimension * 0.7);
                return { width: qrboxSize, height: qrboxSize };
              },
              rememberLastUsedCamera: true,
              supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
              videoConstraints: { // Prefer back camera
                facingMode: "environment"
              }
            },
            false // verbose: false
          );

          const onScanSuccess = (decodedText: string, decodedResult: any) => {
            if (html5QrCodeScannerRef.current) {
              html5QrCodeScannerRef.current.clear().then(() => {
                setIsScannerActive(false);
              }).catch(err => {
                console.error("Failed to clear scanner", err);
                setIsScannerActive(false); 
              });
            }
            setScannedPassId(decodedText);
            setFetchedPass(null); 
            setFetchError(null);
          };

          const onScanFailure = (error: any) => {
            // console.warn(`QR scan failure: ${error}`); // Can be noisy, uncomment for debugging
          };

          scanner.render(onScanSuccess, onScanFailure);
          html5QrCodeScannerRef.current = scanner;
        }
      } catch (error) {
        console.error('Error accessing camera or starting scanner:', error);
        setHasCameraPermission(false);
        setIsScannerActive(false);
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings, ensure the back camera is available, or check if another app is using the camera.',
        });
      }
    };
    
    if (hasCameraPermission === null || (hasCameraPermission === true && !isScannerActive && !html5QrCodeScannerRef.current && document.getElementById(qrReaderId))) {
        startScanner();
    }


    return () => {
      if (html5QrCodeScannerRef.current) {
        html5QrCodeScannerRef.current.clear().catch(err => {
          // console.error("Failed to clear scanner on unmount", err); // Can be noisy
        });
        html5QrCodeScannerRef.current = null;
        setIsScannerActive(false);
      }
    };
  }, [toast, hasCameraPermission, isScannerActive]);

  React.useEffect(() => {
    if (scannedPassId && user) {
      handleFetchPass(scannedPassId);
    }
  }, [scannedPassId, user]); // Added user to dependencies


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
    if (html5QrCodeScannerRef.current && isScannerActive) {
        html5QrCodeScannerRef.current.clear().then(() => setIsScannerActive(false)).catch(console.error);
    }
    setScannedPassId(""); 
    handleFetchPass(manualPassId);
  };

  const handleRescan = () => {
    setFetchedPass(null);
    setFetchError(null);
    setScannedPassId("");
    setManualPassId("");
    if (html5QrCodeScannerRef.current) {
        html5QrCodeScannerRef.current.clear().catch(console.error);
        html5QrCodeScannerRef.current = null; 
    }
    setIsScannerActive(false); 
    setHasCameraPermission(null); // Re-trigger camera permission check and scanner start
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

        {hasCameraPermission === true && !fetchedPass && !fetchError && (
          <div className="space-y-4">
             {/* Ensure qrReaderId div is always in the DOM when scanner might activate */}
            <div id={qrReaderId} className={cn("w-full md:w-[400px] aspect-square mx-auto border rounded-md bg-muted overflow-hidden", !isScannerActive && "hidden")}>
              {/* QR Scanner will render here by html5-qrcode */}
            </div>
             {!isScannerActive && hasCameraPermission && (
              <Button onClick={handleRescan} variant="outline" className="w-full">
                Activate Scanner
              </Button>
            )}
            {isScannerActive && (
              <Alert variant="default">
                <QrCode className="h-4 w-4" />
                <AlertTitle>Scanning Active</AlertTitle>
                <AlertDescription>
                  Align the QR code within the viewfinder.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {hasCameraPermission === false && (
          <Alert variant="destructive">
            <CameraOff className="h-4 w-4" />
            <AlertTitle>Camera Access Disabled</AlertTitle>
            <AlertDescription>
              Camera access is disabled or not available. Please enable it in your browser settings, or use manual entry.
            </AlertDescription>
          </Alert>
        )}
        
        {fetchedPass && (
            <Button onClick={handleRescan} variant="outline" className="w-full">
                Scan Another Pass
            </Button>
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
              disabled={isLoadingPass || authLoading || isScannerActive}
              className="flex-grow"
            />
            <Button type="submit" disabled={isLoadingPass || authLoading || !manualPassId.trim() || isScannerActive}>
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
                        <div className="mt-3 pt-3 border-t flex flex-col items-center">
                          <QRCodeSVG value={fetchedPass.qrCodeData} size={120} bgColor={"#ffffff"} fgColor={"#000000"} level={"L"} includeMargin={false} />
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
