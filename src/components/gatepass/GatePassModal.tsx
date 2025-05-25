
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
        '    size: 80mm auto; ' + // Suggests 80mm width, auto height
        '    margin: 2mm; ' + // Minimal margins
        '  }' +
        '  body { ' +
        '    font-family: \'Courier New\', Courier, monospace; ' + // Monospace font is good for alignment
        '    white-space: pre-wrap; ' + // Respects line breaks and spaces from your formatted string
        '    margin: 0; ' +
        '    padding: 0; ' +
        '    font-size: 10pt; ' + // Common POS font size
        '    line-height: 1.15; ' +
        '    width: 76mm; ' + // Content width (80mm paper - 2mm margins on each side)
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
        '    word-wrap: break-word; ' + // Ensure long lines wrap
        '    box-sizing: border-box;' +
        '    width: 100%;' +
        '  }' +
        '  .shop-name-line {' + // Class to target the shop name for bolding
        '    font-weight: bold;' +
        '  }' +
        '  .qr-code-container { ' +
        '    margin-top: 5mm; ' +
        '    text-align: center; ' +
        '    page-break-inside: avoid; ' + // Try to keep QR code on the same page
        '  } ' +
        '  .qr-code-container img { ' +
        '    max-width: 35mm; ' + // Control QR code size
        '    max-height: 35mm;' +
        '    display: block;' +
        '    margin-left: auto;' +
        '    margin-right: auto;' +
        '  }' +
        '  .no-print { display: none; }' + // For elements not to be printed
        '</style>'
      );
      printWindow.document.write('</head><body>');
      
      // Render gatePassContent line by line
      printWindow.document.write('<div class="content-wrapper">');
      
      const lines = gatePassContent.split('\\n'); // Assuming \\n from your generatePlainTextGatePass
      lines.forEach(line => {
        // Sanitize line to prevent HTML injection if content is dynamic
        const sanitizedLine = line
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;");

        // Check if this is the shop name line
        const isShopNameLine = shopNameToBold && sanitizedLine.trim().toUpperCase() === shopNameToBold.trim().toUpperCase();
        
        if (isShopNameLine) {
          printWindow.document.write('<div class="pass-line shop-name-line">' + sanitizedLine + '</div>');
        } else {
          printWindow.document.write('<div class="pass-line">' + sanitizedLine + '</div>');
        }
      });

      printWindow.document.write('</div>'); // End content-wrapper
      
      // Add QR code image
      if (qrImageForPrint) {
        printWindow.document.write('<div class="qr-code-container"><img src="' + qrImageForPrint + '" alt="QR Code for ' + qrCodeData.substring(0,15) + '..." /></div>');
      } else if (qrCodeData) {
         // Fallback if image generation failed
         printWindow.document.write('<div class="qr-code-container"><p style="font-size: 8pt;">[QR Code for Pass ID: ' + qrCodeData.substring(0,15) + '... Image generation failed]</p></div>');
      }
      printWindow.document.write('</body></html>');
      printWindow.document.close(); // Important for some browsers
      
      // Give the browser a moment to render the content in the new window before printing
      setTimeout(() => {
        printWindow.focus(); // Ensure the print window is focused
        printWindow.print();
        // printWindow.close(); // Optionally close after printing
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
      // Request device from user.
      // For production, you'd ideally filter by printer name prefix or specific service UUIDs.
      // Example Atpos AT-402 might use a generic Serial Port Profile (SPP) or a custom service.
      // You MUST find the correct service UUID for printing in your printer's documentation.
      device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true, // Use true for initial testing if specific filters don't work
        // filters: [{ namePrefix: 'ATPOS' }], // Example filter by name
        // optionalServices: ['your_printer_service_uuid_here'] // UUID for the printer service
      });

      if (!device) {
        toast({ title: "Bluetooth Printing", description: "No device selected.", variant: "default" });
        setIsBluetoothPrinting(false);
        return;
      }

      toast({ title: "Bluetooth Printing", description: `Connecting to "${device.name || device.id}"...` });
      if (!device.gatt) {
        toast({ title: "Bluetooth Error", description: "Selected device does not support GATT. This printer might use Bluetooth Classic SPP which isn't directly accessible via Web Bluetooth for raw data transfer in the same way as GATT for this simple demo. Consult printer manual.", variant: "destructive" });
        setIsBluetoothPrinting(false);
        return;
      }
      
      server = await device.gatt.connect();
      toast({ title: "Bluetooth Printing", description: "Connected! Discovering services..." });

      // TODO: IMPORTANT - Replace with your printer's actual Service and Characteristic UUIDs for printing.
      // These are placeholders and unlikely to work. Consult your Atpos AT-402 manual.
      const PRINTER_SERVICE_UUID = '0000xxxx-0000-1000-8000-00805f9b34fb'; // Example: Replace with actual service UUID
      const PRINTER_CHARACTERISTIC_UUID = '0000yyyy-0000-1000-8000-00805f9b34fb'; // Example: Replace with actual characteristic UUID

      // const primaryService = await server.getPrimaryService(PRINTER_SERVICE_UUID);
      // const characteristic = await primaryService.getCharacteristic(PRINTER_CHARACTERISTIC_UUID);

      // --- Construct ESC/POS commands ---
      // This is highly printer-specific. Refer to Atpos AT-402 manual for correct commands.
      const encoder = new TextEncoder(); // Default is UTF-8, common for ESC/POS
      let escPosCommands = new Uint8Array();

      const appendBytes = (newBytes: Uint8Array) => {
        const combined = new Uint8Array(escPosCommands.length + newBytes.length);
        combined.set(escPosCommands);
        combined.set(newBytes, escPosCommands.length);
        escPosCommands = combined;
      };
      
      // 1. Initialize Printer (ESC @ - Common command)
      appendBytes(new Uint8Array([0x1B, 0x40]));

      // 2. Add Gate Pass Text Content (line by line)
      //    You might need specific ESC/POS commands for font size, bold, alignment here.
      gatePassContent.split('\\n').forEach(line => {
        appendBytes(encoder.encode(line));
        appendBytes(new Uint8Array([0x0A])); // Line Feed (LF)
      });
      appendBytes(new Uint8Array([0x0A])); // Extra line feed for spacing

      // 3. Print QR Code
      //    Many printers have specific ESC/POS commands to generate and print a QR code from a string.
      //    Example (conceptual, actual commands for Atpos AT-402 will vary):
      //    - Set QR model: e.g., GS ( k <Function 165>
      //    - Set QR size: e.g., GS ( k <Function 167>
      //    - Set QR error correction: e.g., GS ( k <Function 169>
      //    - Store QR data: e.g., GS ( k <Function 180> pL pH d1...dk
      //    - Print stored QR data: e.g., GS ( k <Function 181>
      //    For now, a text placeholder as specific commands are needed:
      appendBytes(encoder.encode("\n[Implement ESC/POS QR Print for Atpos AT-402 Here]\n"));
      appendBytes(encoder.encode(`Data: ${qrCodeData}\n`));
      appendBytes(new Uint8Array([0x0A, 0x0A]));


      // 4. Feed paper and Cut (GS V B 0 - partial cut, if supported and desired)
      appendBytes(new Uint8Array([0x1D, 0x56, 0x42, 0x00])); 
      // Or just feed a few lines: ESC d n (n lines)
      // appendBytes(new Uint8Array([0x1B, 0x64, 0x03])); // Feed 3 lines
      // --- End of ESC/POS command construction ---

      // TODO: Uncomment and use the actual characteristic.writeValueWithResponse when UUIDs and commands are correct.
      // await characteristic.writeValueWithResponse(escPosCommands);
      // toast({ title: "Bluetooth Printing", description: "Data sent to printer successfully!" });
      
      // For demonstration: Log the prepared commands and show a toast.
      console.log("Simulating sending ESC/POS commands to Bluetooth printer:", device.name || device.id);
      console.log("ESC/POS Commands (hex):", Array.from(escPosCommands).map(b => b.toString(16).padStart(2, '0')).join(' '));
      console.log("ESC/POS Commands (decimal):", Array.from(escPosCommands).join(' '));
      
      toast({ 
        title: "Bluetooth Ready (Simulated Send)", 
        description: `ESC/POS commands prepared for "${device.name || device.id}". Actual sending is commented out. Check console for command details. You need to implement the characteristic write and specific ESC/POS commands for your Atpos AT-402.`,
        duration: 10000,
      });


    } catch (error: any) {
      console.error("Bluetooth Print Error:", error);
      let errorMessage = `Failed: ${error.message || "Unknown error"}`;
      if (error.name === 'NotFoundError') {
        errorMessage = "No Bluetooth devices found/selected or operation cancelled. Ensure printer is on and discoverable.";
      } else if (error.name === 'NotAllowedError') {
        errorMessage = "Bluetooth access denied by user or browser policy. Ensure permissions are granted.";
      } else if (error.name === 'SecurityError') {
        errorMessage = "Bluetooth connection failed (Security). Ensure page is HTTPS.";
      } else if (error.message && error.message.includes("GATT operation already in progress")) {
        errorMessage = "GATT operation already in progress. Please wait.";
      } else if (error.message && error.message.includes("getPrimaryService")) {
        errorMessage = `Could not find the required service UUID on the device. Check PRINTER_SERVICE_UUID. Printer: ${device?.name}`;
      } else if (error.message && error.message.includes("getCharacteristic")) {
        errorMessage = `Could not find the required characteristic UUID on the service. Check PRINTER_CHARACTERISTIC_UUID. Printer: ${device?.name}`;
      }
      toast({ title: "Bluetooth Print Error", description: errorMessage, variant: "destructive", duration: 10000 });
    } finally {
      if (device && device.gatt && device.gatt.connected) {
        // It's often good practice to disconnect, but some printers/workflows prefer keeping the connection.
        // device.gatt.disconnect();
        // console.log("Disconnected from GATT Server (if connection was kept open).");
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

