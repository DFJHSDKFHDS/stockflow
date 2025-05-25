
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
import { Printer, Copy, Bluetooth, Loader2 } from "lucide-react"; 
import { useToast } from "@/hooks/use-toast";
import React from "react";
import { QRCodeCanvas } from 'qrcode.react';

interface GatePassModalProps {
  isOpen: boolean;
  onClose: () => void;
  gatePassContent: string;
  qrCodeData: string; 
  shopNameToBold?: string;
}

export function GatePassModal({ isOpen, onClose, gatePassContent, qrCodeData, shopNameToBold }: GatePassModalProps) {
  const { toast } = useToast();
  const qrCanvasId = "qr-canvas-for-print";
  const [isBluetoothPrinting, setIsBluetoothPrinting] = React.useState(false);

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
      printWindow.document.write(
        '<style>' +
        '  @page { ' +
        '    size: 80mm auto; ' +
        '    margin: 2mm; ' +
        '  }' +
        '  body { ' +
        '    font-family: \'Courier New\', Courier, monospace; ' +
        '    white-space: pre-wrap; ' +
        '    margin: 0; ' +
        '    padding: 0; ' +
        '    font-size: 10pt; ' +
        '    line-height: 1.15; ' +
        '    width: 76mm; ' +
        '    box-sizing: border-box;' +
        '  }' +
        '  .content-wrapper {' +
        '    width: 100%;' +
        '    box-sizing: border-box;' +
        '  }' +
        '  .pass-line {' +
        '    margin:0; ' +
        '    padding:0; ' +
        '    font-family: \'Courier New\', Courier, monospace;' +
        '    font-size: 10pt;' +
        '    line-height: 1.15;' +
        '    white-space: pre; /* Use pre to respect all spaces for alignment */' +
        '    word-wrap: break-word; ' +
        '    box-sizing: border-box;' +
        '    width: 100%;' +
        '  }' +
        '  .shop-name-line {' +
        '    font-weight: bold;' +
        '  }' +
        '  .qr-code-container { ' +
        '    margin-top: 5mm; ' +
        '    text-align: center; ' +
        '    page-break-inside: avoid; ' +
        '  } ' +
        '  .qr-code-container img { ' +
        '    max-width: 35mm; ' +
        '    max-height: 35mm;' +
        '    display: block;' +
        '    margin-left: auto;' +
        '    margin-right: auto;' +
        '  }' +
        '  .no-print { display: none; }' +
        '</style>'
      );
      printWindow.document.write('</head><body>');
      
      printWindow.document.write('<div class="content-wrapper">');
      
      const lines = gatePassContent.split('\\n');
      lines.forEach(line => {
        const sanitizedLine = line
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;");

        const isShopNameLine = shopNameToBold && sanitizedLine.trim().toUpperCase() === shopNameToBold.trim().toUpperCase();
        
        if (isShopNameLine) {
          printWindow.document.write('<div class="pass-line shop-name-line">' + sanitizedLine + '</div>');
        } else {
          printWindow.document.write('<div class="pass-line">' + sanitizedLine + '</div>');
        }
      });

      printWindow.document.write('</div>');
      
      if (qrImageForPrint) {
        printWindow.document.write('<div class="qr-code-container"><img src="' + qrImageForPrint + '" alt="QR Code for ' + qrCodeData.substring(0,15) + '..." /></div>');
      } else if (qrCodeData) {
         printWindow.document.write('<div class="qr-code-container"><p style="font-size: 8pt;">[QR Code for Pass ID: ' + qrCodeData.substring(0,15) + '... Image generation failed]</p></div>');
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
      toast({ title: "Error", description: "Web Bluetooth API not available. Use Chrome/Edge on Desktop/Android.", variant: "destructive" });
      return;
    }
    setIsBluetoothPrinting(true);
    toast({ title: "Bluetooth Printing", description: "Searching for Bluetooth devices..." });

    let device: BluetoothDevice | null = null;
    let server: BluetoothRemoteGATTServer | undefined = undefined;

    try {
      device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true, 
        // For production, you'd filter by specific service UUIDs or name prefixes
        // e.g., filters: [{ namePrefix: 'ATPOS' }, { services: ['your_printer_service_uuid_here'] }]
        // Common Serial Port Profile (SPP) UUID for some printers: '00001101-0000-1000-8000-00805f9b34fb'
        // Consult your Atpos AT-402 manual for specific service UUIDs related to printing.
      });

      if (!device) {
        toast({ title: "Bluetooth Printing", description: "No device selected.", variant: "default" });
        setIsBluetoothPrinting(false);
        return;
      }

      toast({ title: "Bluetooth Printing", description: `Connecting to "${device.name || device.id}"...` });
      if (!device.gatt) {
        toast({ title: "Bluetooth Error", description: "Selected device does not support GATT. This printer might use Bluetooth Classic SPP which isn't directly accessible via Web Bluetooth for raw data transfer in the same way as GATT for this simple demo.", variant: "destructive" });
        setIsBluetoothPrinting(false);
        return;
      }
      
      server = await device.gatt.connect();
      toast({ title: "Bluetooth Printing", description: "Connected! Discovering services..." });

      // TODO: Replace with your printer's actual Service and Characteristic UUIDs
      // These UUIDs are specific to how your Atpos AT-402 printer exposes its printing functionality.
      // You MUST find these in the printer's technical/programming manual.
      const PRINTER_SERVICE_UUID = '000018f0-0000-1000-8000-00805f9b34fb'; // Example: Generic Access Service (for test) / OR actual printer service
      const PRINTER_CHARACTERISTIC_UUID = '00002af1-0000-1000-8000-00805f9b34fb'; // Example: Generic Write Characteristic (for test) / OR actual printer characteristic

      // For actual printing, find the service and characteristic that accept print data
      // const primaryService = await server.getPrimaryService(PRINTER_SERVICE_UUID);
      // const characteristic = await primaryService.getCharacteristic(PRINTER_CHARACTERISTIC_UUID);

      // --- Construct ESC/POS commands ---
      const encoder = new TextEncoder(); // Default is UTF-8
      let escPosCommands = new Uint8Array();

      const appendBytes = (newBytes: Uint8Array) => {
        const combined = new Uint8Array(escPosCommands.length + newBytes.length);
        combined.set(escPosCommands);
        combined.set(newBytes, escPosCommands.length);
        escPosCommands = combined;
      };
      
      // 1. Initialize Printer (ESC @)
      appendBytes(new Uint8Array([0x1B, 0x40]));

      // 2. Add Gate Pass Text Content (line by line)
      gatePassContent.split('\\n').forEach(line => {
        appendBytes(encoder.encode(line));
        appendBytes(new Uint8Array([0x0A])); // Line Feed (LF)
      });
      appendBytes(new Uint8Array([0x0A])); // Extra line feed

      // 3. Print QR Code
      //    This is highly printer-specific. Many printers have ESC/POS commands to generate
      //    and print a QR code from a string. Refer to Atpos AT-402 manual.
      //    Example conceptual structure (actual commands will vary greatly):
      //    const qrDataBytes = encoder.encode(qrCodeData);
      //    // Parameters for QR: model, size, error correction level
      //    // Example: GS ( k <Function 180> for QR setup
      //    appendBytes(new Uint8Array([0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00])); // Model QR Code 2
      //    appendBytes(new Uint8Array([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, 0x03 ]));     // Size: 3
      //    appendBytes(new Uint8Array([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x30 ]));     // Error correction: L (ASCII '0')
      //    // Store data: GS ( k <Function 181>
      //    const pL = (qrDataBytes.length + 3) % 256;
      //    const pH = Math.floor((qrDataBytes.length + 3) / 256);
      //    appendBytes(new Uint8Array([0x1D, 0x28, 0x6B, pL, pH, 0x31, 0x50, 0x30]));
      //    appendBytes(qrDataBytes);
      //    // Print stored QR: GS ( k <Function 182>
      //    appendBytes(new Uint8Array([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30]));
      //    appendBytes(new Uint8Array([0x0A])); // Line feed after QR
      // For now, a text placeholder as specific commands are needed:
      appendBytes(encoder.encode("\n[Implement ESC/POS QR Print Here]\n"));
      appendBytes(new Uint8Array([0x0A, 0x0A]));


      // 4. Feed paper and Cut (GS V B 0 - partial cut, if supported)
      appendBytes(new Uint8Array([0x1D, 0x56, 0x42, 0x00])); 
      // Or just feed a few lines: ESC d n (n lines)
      // appendBytes(new Uint8Array([0x1B, 0x64, 0x03])); // Feed 3 lines
      // --- End of ESC/POS command construction ---

      // TODO: Uncomment and use the actual characteristic when UUIDs are known and printer is ready
      // await characteristic.writeValueWithResponse(escPosCommands);
      // toast({ title: "Bluetooth Printing", description: "Data sent to printer successfully!" });
      
      console.log("Simulating sending ESC/POS commands:", escPosCommands);
      const commandPreview = Array.from(escPosCommands).map(b => b.toString(16).padStart(2, '0')).join(' ');
      console.log("ESC/POS (hex):", commandPreview);
      toast({ 
        title: "Bluetooth Ready (Simulated)", 
        description: `ESC/POS commands prepared for "${device.name || device.id}". Actual sending is commented out. Check console for command hex.`,
        duration: 7000,
      });


    } catch (error: any) {
      console.error("Bluetooth Print Error:", error);
      let errorMessage = `Failed: ${error.message || "Unknown error"}`;
      if (error.name === 'NotFoundError') {
        errorMessage = "No Bluetooth devices found/selected or operation cancelled.";
      } else if (error.name === 'NotAllowedError') {
        errorMessage = "Bluetooth access denied by user or browser policy.";
      } else if (error.name === 'SecurityError') {
        errorMessage = "Bluetooth connection failed (Security). Ensure page is HTTPS.";
      } else if (error.message && error.message.includes("GATT operation already in progress")) {
        errorMessage = "GATT operation already in progress. Please wait.";
      }
      toast({ title: "Bluetooth Print Error", description: errorMessage, variant: "destructive", duration: 7000 });
    } finally {
      if (device && device.gatt && device.gatt.connected) {
        try {
          // device.gatt.disconnect(); // Disconnect commented out as some printers prefer to stay connected
          // console.log("Disconnected from GATT Server.");
        } catch (disconnectError) {
          console.error("Error disconnecting from GATT:", disconnectError);
        }
      }
      setIsBluetoothPrinting(false);
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
                <Button variant="outline" onClick={handleCopy} size="sm" disabled={isBluetoothPrinting}>
                    <Copy className="mr-2 h-4 w-4" /> Copy
                </Button>
            </div>
            <div className="flex gap-2">
                <Button variant="outline" onClick={onClose} size="sm" disabled={isBluetoothPrinting}>Close</Button>
                <Button onClick={handleBluetoothPrint} size="sm" variant="default" disabled={isBluetoothPrinting}>
                    {isBluetoothPrinting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bluetooth className="mr-2 h-4 w-4" />}
                    {isBluetoothPrinting ? "Processing..." : "Bluetooth Print"}
                </Button>
                <Button onClick={handleStandardPrint} size="sm" disabled={isBluetoothPrinting}>
                    <Printer className="mr-2 h-4 w-4" /> Print (Standard)
                </Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
