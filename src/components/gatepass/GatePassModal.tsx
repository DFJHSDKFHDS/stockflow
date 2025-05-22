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
import { Printer, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import React from "react";
import { QRCodeCanvas } from 'qrcode.react'; // Import QRCodeCanvas

interface GatePassModalProps {
  isOpen: boolean;
  onClose: () => void;
  gatePassContent: string;
  qrCodeData: string; 
}

export function GatePassModal({ isOpen, onClose, gatePassContent, qrCodeData }: GatePassModalProps) {
  const { toast } = useToast();
  const qrCanvasId = "qr-canvas-for-print"; // ID for the canvas

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      let qrImageForPrint = '';
      const canvasElement = document.getElementById(qrCanvasId) as HTMLCanvasElement;
      
      if (canvasElement) {
        if (canvasElement.width === 0 || canvasElement.height === 0) {
            console.error("QR Canvas has no dimensions, not ready for printing.");
            toast({ title: "QR Print Error", description: "QR Canvas not ready for printing. Please close and reopen the modal, then try again.", variant: "destructive"});
        } else {
            try {
              qrImageForPrint = canvasElement.toDataURL('image/png');
              if (!qrImageForPrint || qrImageForPrint === "data:,") {
                console.error("toDataURL returned empty or invalid data for QR code.");
                qrImageForPrint = ""; // Ensure it's empty to trigger fallback
                toast({ title: "QR Print Error", description: "Failed to generate QR image data for printing.", variant: "destructive"});
              }
            } catch (e: any) {
              console.error("Error converting canvas to DataURL:", e);
              toast({ title: "QR Print Error", description: `Could not generate QR code image: ${e.message || 'Unknown error'}.`, variant: "destructive"});
              qrImageForPrint = ""; // Ensure fallback
            }
        }
      } else {
          console.error("QR Canvas element not found by ID for printing:", qrCanvasId);
          toast({ title: "QR Print Error", description: "QR Canvas element not found. Cannot print QR code image.", variant: "destructive"});
      }

      printWindow.document.write('<html><head><title>Gate Pass</title>');
      // Updated print styles
      printWindow.document.write(`
        <style>
          @page { 
            size: 80mm auto; /* Suggest 80mm width, auto height */
            margin: 2mm;     /* Minimal margins as requested */
          }
          body { 
            font-family: monospace; 
            white-space: pre-wrap; 
            margin: 0; /* Body margin handled by @page */
            padding: 0; /* Content should flow within the @page margins */
            font-size: 10pt; /* Requested font size */
            line-height: 1.15; /* Requested line spacing */
            width: 76mm; /* Approx 80mm - 2*2mm page margins */
            box-sizing: border-box;
          } 
          .qr-code-container { 
            margin-top: 5mm; /* Space above QR code */
            text-align: center; 
            page-break-inside: avoid; /* Try to keep QR with content */
          } 
          .qr-code-container img { 
            max-width: 35mm; /* Adjust QR code size for 80mm paper */
            max-height: 35mm;
            display: block;
            margin-left: auto;
            margin-right: auto;
          }
          /* Hide elements not meant for printing if any were added */
          .no-print { display: none; }
        </style>
      `);
      printWindow.document.write('</head><body>');
      // Sanitize gatePassContent for HTML display in print window
      const sanitizedGatePassContent = gatePassContent
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
      printWindow.document.write('<pre style="margin:0; padding:0;">' + sanitizedGatePassContent + '</pre>'); // Wrap in pre for formatting
      
      if (qrImageForPrint) {
        printWindow.document.write(`<div class="qr-code-container"><img src="${qrImageForPrint}" alt="QR Code for ${qrCodeData}" /></div>`);
      } else if (qrCodeData) {
         printWindow.document.write(`<div class="qr-code-container"><p style="font-size: 8pt;">[QR Code for Pass ID: ${qrCodeData.substring(0,15)}... Image generation failed or not available]</p></div>`);
      }
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      
      setTimeout(() => {
        printWindow.focus(); // Ensure the window has focus
        printWindow.print();
        // Optionally close the print window after print dialog is handled
        // printWindow.close(); // This can be disruptive if user wants to reprint or save as PDF
      }, 250);

    } else {
        toast({ title: "Print Error", description: "Could not open print window. Please check browser pop-up settings.", variant: "destructive"});
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
        <DialogFooter className="sm:justify-between gap-2">
            <div className="flex gap-2">
                <Button variant="outline" onClick={handleCopy} size="sm">
                    <Copy className="mr-2 h-4 w-4" /> Copy
                </Button>
            </div>
            <div className="flex gap-2">
                <Button variant="outline" onClick={onClose} size="sm">Close</Button>
                <Button onClick={handlePrint} size="sm">
                    <Printer className="mr-2 h-4 w-4" /> Print
                </Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
