// src/components/gatepass/GatePassModal.tsx
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Printer, Copy, Bluetooth } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import React from "react";
import { QRCodeCanvas } from 'qrcode.react';

interface GatePassModalProps {
  isOpen: boolean;
  onClose: () => void;
  gatePassContent: string;
  qrCodeData: string; 
  shopNameToBold?: string; // Added prop
}

export function GatePassModal({ isOpen, onClose, gatePassContent, qrCodeData, shopNameToBold }: GatePassModalProps) {
  const { toast } = useToast();
  const qrCanvasId = "qr-canvas-for-print";

  const handleStandardPrint = () => {
    toast({
      title: "Print Dialog Open",
      description: "Please check your printer settings (Paper Size: 80mm, Scale: 100%, Margins: None).",
      duration: 5000,
    });
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      let qrImageForPrint = '';
      const canvasElement = document.getElementById(qrCanvasId) as HTMLCanvasElement;
      
      if (canvasElement) {
        if (canvasElement.width === 0 || canvasElement.height === 0) {
            console.error("QR Canvas has no dimensions, not ready for printing.");
            toast({ title: "QR Print Error", description: "QR Canvas not ready. Please close and reopen modal, then try again.", variant: "destructive"});
        } else {
            try {
              qrImageForPrint = canvasElement.toDataURL('image/png');
              if (!qrImageForPrint || qrImageForPrint === "data:,") {
                console.error("toDataURL returned empty or invalid data for QR code.");
                qrImageForPrint = ""; 
                toast({ title: "QR Print Error", description: "Failed to generate QR image data.", variant: "destructive"});
              }
            } catch (e: any) {
              console.error("Error converting canvas to DataURL:", e);
              toast({ title: "QR Print Error", description: `Could not generate QR code image: ${e.message || 'Unknown error'}.`, variant: "destructive"});
              qrImageForPrint = ""; 
            }
        }
      } else {
          console.error("QR Canvas element not found for printing:", qrCanvasId);
          toast({ title: "QR Print Error", description: "QR Canvas element not found.", variant: "destructive"});
      }

      printWindow.document.write('<html><head><title>Gate Pass</title>');
      printWindow.document.write(`
        <style>
          @page { 
            size: 80mm auto; 
            margin: 2mm; 
          }
          body { 
            font-family: 'Courier New', Courier, monospace; 
            white-space: pre-wrap; 
            margin: 0; 
            padding: 0; 
            font-size: 10pt; 
            line-height: 1.15; 
            width: 76mm; 
            box-sizing: border-box;
          }
          .content-wrapper {
            width: 100%;
            box-sizing: border-box;
          }
          .pass-line {
            margin:0; 
            padding:0; 
            font-family: 'Courier New', Courier, monospace;
            font-size: 10pt;
            line-height: 1.15;
            white-space: pre; /* Use pre to respect all spaces for alignment */
            word-wrap: break-word; 
            box-sizing: border-box;
            width: 100%;
          }
          .shop-name-line {
            font-weight: bold;
          }
          .qr-code-container { 
            margin-top: 5mm; 
            text-align: center; 
            page-break-inside: avoid; 
          } 
          .qr-code-container img { 
            max-width: 35mm; 
            max-height: 35mm;
            display: block;
            margin-left: auto;
            margin-right: auto;
          }
          .no-print { display: none; }
        </style>
      `);
      printWindow.document.write('</head><body>');
      
      printWindow.document.write('<div class="content-wrapper">');
      
      const lines = gatePassContent.split('\n');
      lines.forEach(line => {
        const sanitizedLine = line
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;");

        // Check if shopNameToBold is provided and if the current line *is* the shop name
        // Assuming shopNameToBold is the exact, uppercase string as generated.
        const isShopNameLine = shopNameToBold && sanitizedLine.trim().toUpperCase() === shopNameToBold.trim().toUpperCase();
        
        if (isShopNameLine) {
          printWindow.document.write('<div class="pass-line shop-name-line">' + sanitizedLine + '</div>');
        } else {
          printWindow.document.write('<div class="pass-line">' + sanitizedLine + '</div>');
        }
      });

      printWindow.document.write('</div>');
      
      if (qrImageForPrint) {
        printWindow.document.write(`<div class="qr-code-container"><img src="${qrImageForPrint}" alt="QR Code for ${qrCodeData.substring(0,15)}..." /></div>`);
      } else if (qrCodeData) {
         printWindow.document.write(`<div class="qr-code-container"><p style="font-size: 8pt;">[QR Code for Pass ID: ${qrCodeData.substring(0,15)}... Image generation failed]</p></div>`);
      }
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      
      setTimeout(() => {
        printWindow.focus(); 
        printWindow.print();
      }, 250); 

    } else {
        toast({ title: "Print Error", description: "Could not open print window. Check browser pop-up settings.", variant: "destructive"});
    }
  };

  const handleBluetoothPrint = async () => {
    if (!navigator.bluetooth) {
      toast({ title: "Error", description: "Web Bluetooth API not available in this browser.", variant: "destructive" });
      return;
    }

    toast({ title: "Bluetooth Test", description: "Attempting to discover Bluetooth devices..." });

    try {
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true, 
        optionalServices: [] 
      });
      
      if (device) {
        console.log("Selected Bluetooth device:", device);
        toast({ 
          title: "Device Selected!", 
          description: `Device "${device.name || device.id}" selected. Next step would be GATT connection to a printer.` 
        });
      } else {
        toast({ title: "Bluetooth Test", description: "No device was selected or selection process was cancelled without error.", variant: "default"});
      }
    } catch (error: any) {
      console.error("Bluetooth Test Error:", error);
      let errorMessage = "Failed to select or interact with Bluetooth device.";
      if (error.name === 'NotFoundError') {
        errorMessage = "No Bluetooth devices found or selected. Ensure Bluetooth is on and device is discoverable.";
      } else if (error.name === 'NotAllowedError') {
        errorMessage = "Bluetooth access denied. Please allow Bluetooth permissions for this site.";
      } else {
        errorMessage = error.message || errorMessage;
      }
      toast({ title: "Bluetooth Test Error", description: errorMessage, variant: "destructive" });
    }
  };


  const handleCopy = () => {
    const textToCopy = `${gatePassContent}\n\nQR Code Data: ${qrCodeData}`;
    navigator.clipboard.writeText(textToCopy)
      .then(() => toast({ title: "Copied!", description: "Gate pass content and QR data copied." }))
      .catch(() => toast({ title: "Copy Failed", description: "Could not copy content.", variant: "destructive" }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Generated Gate Pass</DialogTitle>
          <DialogDescription>
            This gate pass is formatted for thermal printer output. Review and print.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[400px] w-full rounded-md border p-4 my-4">
          <pre className="text-sm font-mono whitespace-pre-wrap break-all">
            {gatePassContent}
          </pre>
          {qrCodeData && (
            <div className="mt-4 text-center">
              <QRCodeCanvas id={qrCanvasId} value={qrCodeData} size={150} bgColor={"#ffffff"} fgColor={"#000000"} level={"L"} includeMargin={false} style={{display: 'block', margin: '0 auto'}} />
              <p className="text-xs text-muted-foreground mt-1">QR Code (Data: {qrCodeData.substring(0,30)}...)</p>
            </div>
          )}
        </ScrollArea>
        <DialogFooter className="sm:justify-between gap-2 flex-wrap"> 
            <div className="flex gap-2">
                <Button variant="outline" onClick={handleCopy} size="sm">
                    <Copy className="mr-2 h-4 w-4" /> Copy
                </Button>
            </div>
            <div className="flex gap-2">
                <Button variant="outline" onClick={onClose} size="sm">Close</Button>
                <Button onClick={handleBluetoothPrint} size="sm" variant="outline">
                    <Bluetooth className="mr-2 h-4 w-4" /> Bluetooth Test
                </Button>
                <Button onClick={handleStandardPrint} size="sm">
                    <Printer className="mr-2 h-4 w-4" /> Print
                </Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
