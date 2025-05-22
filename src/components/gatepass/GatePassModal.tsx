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
import { Printer, Copy, Bluetooth } from "lucide-react"; // Added Bluetooth icon
import { useToast } from "@/hooks/use-toast";
import React from "react";
import { QRCodeCanvas } from 'qrcode.react';

interface GatePassModalProps {
  isOpen: boolean;
  onClose: () => void;
  gatePassContent: string;
  qrCodeData: string; 
}

export function GatePassModal({ isOpen, onClose, gatePassContent, qrCodeData }: GatePassModalProps) {
  const { toast } = useToast();
  const qrCanvasId = "qr-canvas-for-print";

  const handleStandardPrint = () => {
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
            font-family: monospace; 
            white-space: pre-wrap; 
            margin: 0; 
            padding: 0; 
            font-size: 10pt; 
            line-height: 1.15; 
            width: 76mm; /* Approx 80mm - 2*2mm page margins */
            box-sizing: border-box;
          }
          .content-wrapper {
            width: 100%;
            box-sizing: border-box;
          }
          .pass-text {
            margin:0; 
            padding:0; 
            font-family: monospace;
            font-size: 10pt;
            line-height: 1.15;
            white-space: pre-wrap;
            word-wrap: break-word;
            box-sizing: border-box;
            width: 100%;
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
      
      const sanitizedGatePassContent = gatePassContent
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
      
      printWindow.document.write('<div class="content-wrapper">');
      printWindow.document.write('<pre class="pass-text">' + sanitizedGatePassContent + '</pre>');
      printWindow.document.write('</div>');
      
      if (qrImageForPrint) {
        printWindow.document.write(`<div class="qr-code-container"><img src="${qrImageForPrint}" alt="QR Code for ${qrCodeData}" /></div>`);
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
    toast({
      title: "Bluetooth Print (Info)",
      description: "Bluetooth printing requires Web Bluetooth API and ESC/POS command implementation. This feature is not fully implemented yet.",
      duration: 5000,
    });

    // --- Web Bluetooth API Implementation Guide ---
    // 1. Check for Web Bluetooth availability
    if (!navigator.bluetooth) {
      toast({ title: "Error", description: "Web Bluetooth API not available in this browser.", variant: "destructive" });
      return;
    }

    try {
      // 2. Request Bluetooth device (printer)
      // You'll need to know the service UUIDs your printer exposes.
      // Common thermal printer service UUIDs might be generic (e.g., '000018f0-0000-1000-8000-00805f9b34fb' for serial port profile)
      // or specific to the printer manufacturer.
      // const device = await navigator.bluetooth.requestDevice({
      //   filters: [{ services: ['service-uuid-for-your-printer'] }], // Replace with actual service UUID
      //   // acceptAllDevices: true, // Use with caution, prefer filtered list
      //   optionalServices: [] // Add any other optional services
      // });
      // toast({ title: "Device Requested", description: `Attempting to connect...` });

      // 3. Connect to the GATT Server
      // const server = await device.gatt.connect();
      // toast({ title: "Connected", description: `Connected to ${device.name}` });

      // 4. Get the Printer Service and Characteristic
      // const service = await server.getPrimaryService('service-uuid-for-your-printer'); // Replace
      // const characteristic = await service.getCharacteristic('characteristic-uuid-for-printing'); // Replace

      // 5. Prepare Data (ESC/POS Commands)
      // This is the most complex part. You need to convert `gatePassContent` and the QR code
      // into a sequence of ESC/POS bytes.
      // Example for plain text (very basic):
      // const encoder = new TextEncoder();
      // const textData = encoder.encode(gatePassContent + "\n\n\n\n"); // Add newlines for paper feed/cut

      // To print a QR code via ESC/POS, you'd need specific commands for your printer model.
      // Or, convert the QR canvas to a bitmap and send it using ESC/POS image printing commands.

      // Example for sending (very simplified, actual commands depend on printer):
      // let commands = [];
      // Initialize printer:
      // commands.push(0x1B, 0x40); // ESC @
      // Add text:
      // gatePassContent.split('\n').forEach(line => {
      //   commands.push(...new TextEncoder().encode(line), 0x0A); // LF
      // });
      // Add QR Code (this is highly printer-specific)
      // E.g., for GS ( k <fn=165> (QR Code model) <fn=167> (size) <fn=169> (error correction) <fn=180> (data)
      // const qrBytes = new TextEncoder().encode(qrCodeData);
      // commands.push(0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, 0x03); // Model, Size, ECC
      // commands.push(0x1D, 0x28, 0x6B, qrBytes.length + 3, 0x00, 0x31, 0x50, 0x30, ...qrBytes); // Store
      // commands.push(0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30); // Print

      // Cut paper (partial cut):
      // commands.push(0x1D, 0x56, 0x42, 0x00); // GS V B n
      // const commandPayload = new Uint8Array(commands);


      // 6. Write data to the characteristic
      // await characteristic.writeValueWithoutResponse(commandPayload); // Or writeValueWithResponse if needed
      // toast({ title: "Success", description: "Data sent to printer." });

      // 7. Disconnect (optional, or keep connection if printing frequently)
      // await server.disconnect();
      // toast({ title: "Disconnected", description: "Disconnected from printer." });

    } catch (error: any) {
      console.error("Bluetooth Print Error:", error);
      toast({ title: "Bluetooth Print Error", description: error.message || "Failed to print via Bluetooth.", variant: "destructive" });
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
        <DialogFooter className="sm:justify-between gap-2 flex-wrap"> {/* Added flex-wrap for better responsiveness */}
            <div className="flex gap-2">
                <Button variant="outline" onClick={handleCopy} size="sm">
                    <Copy className="mr-2 h-4 w-4" /> Copy
                </Button>
            </div>
            <div className="flex gap-2">
                <Button variant="outline" onClick={onClose} size="sm">Close</Button>
                <Button onClick={handleBluetoothPrint} size="sm" variant="outline"> {/* Added Bluetooth Print button */}
                    <Bluetooth className="mr-2 h-4 w-4" /> Bluetooth Print
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

    