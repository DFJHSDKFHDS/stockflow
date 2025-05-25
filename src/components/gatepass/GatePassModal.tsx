
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
        '    white-space: pre; ' + /* Use pre for explicit line breaks from content */
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
      
      const lines = gatePassContent.split('\\n'); // Assuming your plain text uses \n for newlines
      lines.forEach(line => {
        const sanitizedLine = line
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;");

        // Check if the current line is the shop name to be bolded
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
        // printWindow.close(); 
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
        acceptAllDevices: true, // For development. For production, filter by name or service UUID.
        // Example filters (replace with your printer's actual details if known):
        // filters: [{ namePrefix: 'ATPOS' }, { services: ['YOUR_PRINTER_SERVICE_UUID_HERE'] }], 
        // optionalServices: ['YOUR_PRINTER_SERVICE_UUID_HERE'] 
      });

      if (!device) {
        toast({ title: "Bluetooth Printing", description: "No device selected.", variant: "default" });
        setIsBluetoothPrinting(false);
        return;
      }

      toast({ title: "Bluetooth Printing", description: `Connecting to "${device.name || device.id}"...` });
      if (!device.gatt) {
        toast({ title: "Bluetooth Error", description: "Selected device does not support GATT. This printer might use Bluetooth Classic SPP, which isn't directly accessible via Web Bluetooth for raw data transfer in this simple demo. Consult printer manual.", variant: "destructive" });
        setIsBluetoothPrinting(false);
        return;
      }
      
      server = await device.gatt.connect();
      toast({ title: "Bluetooth Printing", description: "Connected! Discovering services..." });

      // =====================================================================================
      // CRITICAL: YOU MUST REPLACE THESE PLACEHOLDER UUIDs WITH THE ACTUAL UUIDs
      // FOR YOUR Atpos AT-402 PRINTER.
      // Find these in your printer's technical/programming documentation.
      // The error "Invalid Service name: '0000xxxx-0000-1000-8000-00805f9b34fb'"
      // is because the 'xxxx' placeholder is still being used.
      // Common standard UUIDs for Serial Port Profile (SPP) (often used by Bluetooth printers,
      // but Web Bluetooth works best with BLE GATT services):
      //   Service: 00001101-0000-1000-8000-00805f9b34fb
      // However, your printer might use a custom BLE service for printing.
      // =====================================================================================
      const PRINTER_SERVICE_UUID = '0000xxxx-0000-1000-8000-00805f9b34fb'; // <<< REPLACE THIS
      const PRINTER_CHARACTERISTIC_UUID = '0000yyyy-0000-1000-8000-00805f9b34fb'; // <<< REPLACE THIS

      // Attempt to get the primary service and characteristic.
      // If these UUIDs are incorrect, the following lines will fail.
      const primaryService = await server.getPrimaryService(PRINTER_SERVICE_UUID);
      const characteristic = await primaryService.getCharacteristic(PRINTER_CHARACTERISTIC_UUID);

      // --- Construct ESC/POS commands ---
      // This is highly printer-specific. Refer to Atpos AT-402 manual for correct commands.
      const encoder = new TextEncoder(); 
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
      gatePassContent.split('\\n').forEach(line => {
        appendBytes(encoder.encode(line));
        appendBytes(new Uint8Array([0x0A])); // Line Feed (LF)
      });
      appendBytes(new Uint8Array([0x0A])); // Extra line feed for spacing

      // 3. Print QR Code
      //    IMPORTANT: Many printers have specific ESC/POS commands to generate and print a QR code 
      //    from a string directly. This is usually more reliable than sending a bitmap.
      //    Consult your Atpos AT-402 manual for "QR Code Print" commands.
      //    Example (conceptual, actual commands will vary):
      //    - Set QR model: e.g., GS ( k <Function 165>
      //    - Set QR size: e.g., GS ( k <Function 167>
      //    - Set QR error correction: e.g., GS ( k <Function 169>
      //    - Store QR data: e.g., GS ( k <Function 180> pL pH d1...dk + YOUR_QR_DATA_STRING_HERE
      //    - Print stored QR data: e.g., GS ( k <Function 181>
      //    For now, a text placeholder as specific commands are needed:
      appendBytes(encoder.encode("\n[Implement ESC/POS QR Print for Atpos AT-402 Here]\n"));
      appendBytes(encoder.encode(`Data for QR: ${qrCodeData}\n`));
      appendBytes(new Uint8Array([0x0A, 0x0A]));


      // 4. Feed paper and Cut (GS V B 0 - partial cut, if supported and desired)
      //    Consult your printer manual for the correct cut command.
      appendBytes(new Uint8Array([0x1D, 0x56, 0x42, 0x00])); // Example: Partial cut
      // --- End of ESC/POS command construction ---
      
      console.log("Prepared ESC/POS Commands (Hex):", Array.from(escPosCommands).map(b => b.toString(16).padStart(2, '0')).join(' '));
      console.log("Attempting to send to characteristic:", characteristic.uuid);

      await characteristic.writeValueWithResponse(escPosCommands);
      // Or use writeValueWithoutResponse if your printer/characteristic prefers it:
      // await characteristic.writeValueWithoutResponse(escPosCommands);
      
      toast({ title: "Bluetooth Printing", description: `Data sent to "${device.name || device.id}" successfully!` });
      
    } catch (error: any) {
      console.error("Bluetooth Print Error:", error);
      let errorMessage = `Failed: ${error.message || "Unknown error"}`;
      if (error.name === 'NotFoundError' && error.message.includes("getPrimaryService")) {
        errorMessage = `Could not find the required service UUID ('${PRINTER_SERVICE_UUID}') on the device. Check your printer's documentation for the correct Service UUID for printing. Printer: ${device?.name}`;
      } else if (error.name === 'NotFoundError' && error.message.includes("getCharacteristic")) {
        errorMessage = `Could not find the required characteristic UUID ('${PRINTER_CHARACTERISTIC_UUID}') on the service. Check your printer's documentation for the correct Characteristic UUID for printing. Printer: ${device?.name}`;
      } else if (error.name === 'NotFoundError') {
        errorMessage = "No Bluetooth devices found/selected or operation cancelled. Ensure printer is on and discoverable.";
      } else if (error.name === 'NotAllowedError') {
        errorMessage = "Bluetooth access denied by user or browser policy. Ensure permissions are granted.";
      } else if (error.name === 'SecurityError') {
        errorMessage = "Bluetooth connection failed (Security). Ensure page is HTTPS.";
      } else if (error.message && error.message.includes("GATT operation already in progress")) {
        errorMessage = "GATT operation already in progress. Please wait.";
      } else if (error.message && error.message.toLowerCase().includes("user cancelled")) {
        errorMessage = "Device selection cancelled by user.";
      }
      toast({ title: "Bluetooth Print Error", description: errorMessage, variant: "destructive", duration: 10000 });
    } finally {
      if (device && device.gatt && device.gatt.connected) {
        // It's often good practice to disconnect, but some printers/workflows prefer keeping the connection.
        // device.gatt.disconnect();
        // console.log("Disconnected from GATT Server.");
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
          {/* Display pre-formatted text */}
          <pre className="text-sm font-mono whitespace-pre-wrap break-all">
            {gatePassContent}
          </pre>
          {qrCodeData && (
            <div className="mt-4 text-center">
              {/* This QRCodeCanvas is for display in the modal and for the standard print function */}
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

