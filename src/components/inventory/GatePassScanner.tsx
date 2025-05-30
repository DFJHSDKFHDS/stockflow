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
import { QrCode, CameraOff, PackageSearch, UserCircle, CalendarDays, User as UserIcon, ShoppingBag, Hash, ImageOff, Search, Info, ChevronDown, ChevronUp, Printer, Ticket as TicketIcon } from "lucide-react";
import { QRCodeSVG } from 'qrcode.react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { cn } from "@/lib/utils";
import { GatePassModal } from "@/components/gatepass/GatePassModal";

const ITEMS_DISPLAY_THRESHOLD = 3;

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
  const [showAllItems, setShowAllItems] = React.useState(false);

  const [isPrintableSlipModalOpen, setIsPrintableSlipModalOpen] = React.useState(false);

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
        const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
        tempStream.getTracks().forEach(track => track.stop()); 
        setHasCameraPermission(true);
        
        if (document.getElementById(qrReaderId) && !html5QrCodeScannerRef.current && isScannerActive) {
          const qrReaderContainer = document.getElementById(qrReaderId);
          if (qrReaderContainer) {
            qrReaderContainer.innerHTML = ''; 
          } else {
            console.error("QR Reader container not found for clearing.");
            return; 
          }

          setTimeout(() => {
            if (document.getElementById(qrReaderId) && !html5QrCodeScannerRef.current && isScannerActive) {
              try {
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
                    videoConstraints: { 
                      facingMode: { ideal: "environment" } 
                    }
                  },
                  false 
                );

                const onScanSuccessCallback = (decodedText: string, decodedResult: any) => {
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
                  setShowAllItems(false); 
                };

                const onScanFailureCallback = (error: any) => {
                  // console.warn(`QR scan failure: ${error}`); 
                };
                
                scanner.render(onScanSuccessCallback, onScanFailureCallback);
                html5QrCodeScannerRef.current = scanner;
              } catch (initError) {
                  console.error("Error initializing Html5QrcodeScanner:", initError);
                  toast({
                      variant: 'destructive',
                      title: 'Scanner Init Error',
                      description: 'Failed to initialize the QR code scanner. Please ensure camera is not in use and try again.',
                  });
                  setIsScannerActive(false); 
              }
            }
          }, 0); 
        }
      } catch (error) {
        console.error('Error accessing camera or starting scanner:', error);
        setHasCameraPermission(false);
        setIsScannerActive(false); 
        toast({
          variant: 'destructive',
          title: 'Camera Access Problem',
          description: 'Could not access camera. Please enable permissions and ensure camera is not in use.',
        });
      }
    };
    
    if (isScannerActive && hasCameraPermission !== false) { 
        startScanner();
    }

    return () => {
      if (html5QrCodeScannerRef.current) {
        html5QrCodeScannerRef.current.clear().catch(err => {
          // console.error("Failed to clear scanner on unmount", err);
        });
        html5QrCodeScannerRef.current = null;
      }
    };
  }, [toast, hasCameraPermission, isScannerActive]); 

  React.useEffect(() => {
    if (scannedPassId && user) {
      handleFetchPass(scannedPassId);
    }
  }, [scannedPassId, user]); 


  const handleFetchPass = async (passIdToFetch: string) => {
    if (!user || !passIdToFetch.trim()) {
      if (!passIdToFetch.trim()) {
        toast({ title: "Input Error", description: "Please enter a Pass ID.", variant: "default" });
      }
      return;
    }
    setFetchedPass(null); 
    setShowAllItems(false);
    setIsLoadingPass(true);
    setFetchError(null);
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

  const activateScanner = async () => {
    setFetchedPass(null);
    setFetchError(null);
    setScannedPassId("");
    setManualPassId("");
    setShowAllItems(false); 
     if (html5QrCodeScannerRef.current) {
        await html5QrCodeScannerRef.current.clear().catch(console.error);
        html5QrCodeScannerRef.current = null;
    }
    setIsScannerActive(true); 
    if (hasCameraPermission === null || hasCameraPermission === false) { 
        setHasCameraPermission(null); 
    }
  };

  const handleViewPrintableSlip = () => {
    if (fetchedPass && fetchedPass.generatedPassContent) {
      setIsPrintableSlipModalOpen(true);
    } else {
      toast({ title: "Not Available", description: "Printable slip content not found for this pass.", variant: "default" });
    }
  };

  const itemsToDisplay = fetchedPass?.items
    ? (showAllItems ? fetchedPass.items : fetchedPass.items.slice(0, ITEMS_DISPLAY_THRESHOLD))
    : [];


  return (
    <>
      {fetchedPass && fetchedPass.generatedPassContent && (
        <GatePassModal
          isOpen={isPrintableSlipModalOpen}
          onClose={() => setIsPrintableSlipModalOpen(false)}
          gatePassContent={fetchedPass.generatedPassContent}
          qrCodeData={fetchedPass.qrCodeData}
        />
      )}
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><QrCode className="h-6 w-6 text-primary" /> Scan Gate Pass ID</CardTitle>
          <CardDescription>Point your camera at a Gate Pass QR code, or enter the ID manually.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          {hasCameraPermission === null && !isScannerActive && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Camera Status</AlertTitle>
              <AlertDescription>Click "Activate Scanner" to check camera permissions.</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
              <div id={qrReaderId} className={cn("w-full md:w-[400px] min-h-[300px] mx-auto border rounded-md bg-muted overflow-hidden", !isScannerActive && "hidden")}>
              </div>
              {!isScannerActive && (
              <Button onClick={activateScanner} variant="outline" className="w-full">
                  Activate Scanner
              </Button>
              )}
              {isScannerActive && (
              <Alert variant="default">
                  <QrCode className="h-4 w-4" />
                  <AlertTitle>Scanning Active</AlertTitle>
                  <AlertDescription>
                  Align the QR code within the viewfinder. Use the dropdown above the viewfinder to select a different camera if needed.
                  </AlertDescription>
              </Alert>
              )}
          </div>


          {hasCameraPermission === false && !isScannerActive && ( 
            <Alert variant="destructive">
              <CameraOff className="h-4 w-4" />
              <AlertTitle>Camera Access Problem</AlertTitle>
              <AlertDescription>
                Could not access camera. Please ensure camera permissions are enabled for this site in your browser settings and that no other app is using the camera. Try activating scanner again.
              </AlertDescription>
            </Alert>
          )}
          
          {(fetchedPass || (isScannerActive && hasCameraPermission)) && ( 
              <Button onClick={activateScanner} variant="outline" className="w-full mt-4">
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
                          Created: {fetchedPass.createdAt ? format(new Date(fetchedPass.createdAt), "PPpp") : "N/A"}
                      </CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm space-y-3 pt-4">
                      <div className="flex items-center font-semibold text-base">
                          <TicketIcon className="mr-2 h-5 w-5 text-primary" />
                           Gate Pass No.: <span className="ml-1">{fetchedPass.gatePassNumber}</span>
                      </div>
                      <div className="flex items-center">
                          <UserCircle className="mr-2 h-5 w-5 text-muted-foreground" />
                          Customer: <span className="ml-1">{fetchedPass.customerName}</span>
                      </div>
                      <div className="flex items-center">
                          <CalendarDays className="mr-2 h-5 w-5 text-muted-foreground" />
                          Dispatch Date & Time:
                          <span className="ml-1">
                              {fetchedPass.date ? format(new Date(fetchedPass.date), "PPPp") : "N/A"}
                          </span>
                      </div>
                      <div className="flex items-center">
                        <UserIcon className="mr-2 h-5 w-5 text-muted-foreground" />
                        Authorized By: <span className="ml-1">{fetchedPass.userName}</span>
                      </div>
                       <div className="flex items-center">
                          <ShoppingBag className="mr-2 h-5 w-5 text-muted-foreground" />
                          Total Items: <span className="ml-1">{fetchedPass.totalQuantity}</span>
                      </div>
                      <div className="flex items-center">
                          <Hash className="mr-2 h-5 w-5 text-muted-foreground" />
                          Gate Pass ID: <span className="ml-1 font-mono text-xs">{fetchedPass.id.substring(1,9)}...</span>
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
                    <ScrollArea className="pr-1"> 
                      {(!fetchedPass || !fetchedPass.items || fetchedPass.items.length === 0) ? (
                          <p className="text-muted-foreground">No items listed for this pass.</p>
                      ) : (
                      <div className="space-y-3">
                          {itemsToDisplay.map((item: GatePassItem) => (
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
                          {fetchedPass && fetchedPass.items && fetchedPass.items.length > ITEMS_DISPLAY_THRESHOLD && (
                              <Button
                                  variant="link"
                                  className="w-full mt-2"
                                  onClick={() => setShowAllItems(!showAllItems)}
                              >
                                  {showAllItems ? (
                                      <>Show Less <ChevronUp className="ml-2 h-4 w-4" /></>
                                  ) : (
                                      <>Show More ({fetchedPass.items.length - ITEMS_DISPLAY_THRESHOLD} more) <ChevronDown className="ml-2 h-4 w-4" /></>
                                  )}
                              </Button>
                          )}
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
              </Card>
               {fetchedPass.generatedPassContent && (
                  <div className="mt-4">
                    <Button variant="outline" onClick={handleViewPrintableSlip} className="w-full">
                        <Printer className="mr-2 h-4 w-4" /> View Printable Slip
                    </Button>
                  </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
