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
import Image from "next/image";
import { Printer, Copy, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import React from "react";

interface GatePassModalProps {
  isOpen: boolean;
  onClose: () => void;
  gatePassContent: string;
  qrCodeData: string; // For display purposes or future actual QR generation
}

export function GatePassModal({ isOpen, onClose, gatePassContent, qrCodeData }: GatePassModalProps) {
  const { toast } = useToast();
  const [qrCodeUrl, setQrCodeUrl] = React.useState('');

  React.useEffect(() => {
    if (qrCodeData) {
      // For a real QR code, you'd use a library to generate an image/SVG
      // or use an API. For now, using a placeholder.
      const placeholderQr = `https://placehold.co/150x150.png?text=QR+Data:\n${encodeURIComponent(qrCodeData.substring(0,50))}`;
      setQrCodeUrl(placeholderQr);
    }
  }, [qrCodeData]);

  const handlePrint = () => {
    // Basic print functionality
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write('<html><head><title>Gate Pass</title>');
      printWindow.document.write('<style>body { font-family: monospace; white-space: pre-wrap; margin: 20px; } .qr-code { margin-top: 20px; text-align: center; } img { max-width: 150px; } </style>');
      printWindow.document.write('</head><body>');
      printWindow.document.write(gatePassContent.replace(/</g, "&lt;").replace(/>/g, "&gt;"));
      if (qrCodeUrl) {
        printWindow.document.write(`<div class="qr-code"><img src="${qrCodeUrl}" alt="QR Code for ${qrCodeData}" /></div>`);
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
          {qrCodeUrl && (
            <div className="mt-4 text-center" data-ai-hint="qr code">
              <Image src={qrCodeUrl} alt="QR Code Placeholder" width={150} height={150} />
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
