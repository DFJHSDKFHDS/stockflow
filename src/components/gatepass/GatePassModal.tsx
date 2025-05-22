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
        try {
          qrImageForPrint = canvasElement.toDataURL('image/png');
        } catch (e) {
          console.error("Error converting canvas to DataURL:", e);
          toast({ title: "QR Print Error", description: "Could not generate QR code image for printing.", variant: "destructive"});
        }
      }

      printWindow.document.write('<html><head><title>Gate Pass</title>');
      printWindow.document.write('<style>body { font-family: monospace; white-space: pre-wrap; margin: 20px; } .qr-code-container { margin-top: 20px; text-align: center; } .qr-code-container img { max-width: 150px; } </style>');
      printWindow.document.write('</head><body>');
      printWindow.document.write(gatePassContent.replace(/</g, "&lt;").replace(/>/g, "&gt;"));
      if (qrImageForPrint) {
        printWindow.document.write(`<div class="qr-code-container"><img src="${qrImageForPrint}" alt="QR Code for ${qrCodeData}" /></div>`);
      } else if (qrCodeData) {
         printWindow.document.write(`<div class="qr-code-container"><p>[QR Code for Gate Pass ID: ${qrCodeData}]</p></div>`);
      }
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      printWindow.print();
    } else {
        toast({ title: "Print Error", description: "Could not open print window. Please check browser pop-up settings.", variant: "destructive"});
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(gatePassContent)
      .then(() => toast({ title: "Copied!", description: "Gate pass content copied to clipboard." }))
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
