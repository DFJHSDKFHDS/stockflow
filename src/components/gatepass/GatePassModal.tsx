
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
      description: "Please check your printer settings (Paper Size: 80mm, Scale: 100%, Margins: None). This method works best with USB or system-installed Bluetooth printers.",
      duration: 7000,
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
        '    font-family: "Courier New", Courier, monospace; ' +
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
        '    font-family: "Courier New", Courier, monospace;' + 
        '    font-size: 10pt;' +
        '    line-height: 1.15;' +
        '    white-space: pre; ' + 
        '    word-wrap: normal; ' + 
        '    overflow-wrap: break-word; ' +
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
      
      const lines = gatePassContent.split('\\n'); // Use \\n as per generatePlainTextGatePass
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
      toast({ 
        title: "Web Bluetooth Not Supported", 
        description: "Your browser does not support Web Bluetooth. Try Chrome/Edge on Desktop/Android. This feature requires a Bluetooth Low Energy (BLE/GATT) compatible printer.", 
        variant: "destructive",
        duration: 10000
      });
      return;
    }
    
    toast({ 
        title: "Bluetooth Print (Experimental)", 
        description: "Attempting to find Bluetooth devices. This direct printing method requires a BLE/GATT compatible printer. Many POS thermal printers use Bluetooth Classic SPP and may not work with this method. Use 'Print (Standard)' for system-paired printers.",
        duration: 10000 
    });

    setIsBluetoothPrinting(true);
    let device: BluetoothDevice | null = null;
    let server: BluetoothRemoteGATTServer | undefined = undefined;

    // ======================================================================
    // CRITICAL: THESE UUIDs ARE PLACEHOLDERS.
    // You MUST find the correct GATT Service and Characteristic UUIDs for *your specific printer model*
    // from its technical/programming documentation if it supports BLE/GATT for printing.
    // The standard SPP UUID ('00001101-...') is for Bluetooth Classic and will NOT work with Web Bluetooth.
    // If your printer is Bluetooth Classic SPP *only*, Web Bluetooth cannot directly print to it.
    // ======================================================================
    const PRINTER_SERVICE_UUID = '0000xxxx-0000-1000-8000-00805f9b34fb'; // <<<!!! CRITICAL: REPLACE 'xxxx' (Service) !!!>>>
    const PRINTER_CHARACTERISTIC_UUID = '0000yyyy-0000-1000-8000-00805f9b34fb'; // <<<!!! CRITICAL: REPLACE 'yyyy' (Characteristic) !!!>>>
    // ======================================================================

    try {
      device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true, 
        // If you find the correct PRINTER_SERVICE_UUID for your BLE-compatible printer, add it here:
        // optionalServices: [PRINTER_SERVICE_UUID], 
        // Using a placeholder 'xxxx' here will likely cause "Origin not allowed" or "Invalid Service name" errors.
        // Use acceptAllDevices: true for initial discovery if unsure.
        ...(PRINTER_SERVICE_UUID !== '0000xxxx-0000-1000-8000-00805f9b34fb' && { optionalServices: [PRINTER_SERVICE_UUID] })
      });

      if (!device) {
        toast({ title: "Bluetooth Printing", description: "No device selected.", variant: "default" });
        setIsBluetoothPrinting(false);
        return;
      }
      console.log('Selected Bluetooth device:', device); 

      toast({ title: "Bluetooth Printing", description: `Connecting to "${device.name || device.id}"...` });
      if (!device.gatt) {
        toast({ 
          title: "Bluetooth Connection Error", 
          description: "Selected device does not support GATT. This printer might use Bluetooth Classic SPP, which isn't directly accessible for raw data via Web Bluetooth's GATT services. Ensure printer is ON, in range, and paired if necessary. Consult printer manual for BLE/GATT compatibility.", 
          variant: "destructive",
          duration: 15000 
        });
        setIsBluetoothPrinting(false);
        return;
      }
      
      server = await device.gatt.connect(); 
      toast({ title: "Bluetooth Printing", description: "Connected to GATT Server! Discovering services..." });
      
      toast({ title: "Bluetooth Printing", description: `Attempting to get service with UUID: ${PRINTER_SERVICE_UUID}`});
      // The following line will likely fail if PRINTER_SERVICE_UUID is still the 'xxxx' placeholder or incorrect for your BLE printer
      const primaryService = await server.getPrimaryService(PRINTER_SERVICE_UUID);
      toast({ title: "Bluetooth Printing", description: `Service found! Attempting to get characteristic: ${PRINTER_CHARACTERISTIC_UUID}`});
      // This will also fail if PRINTER_CHARACTERISTIC_UUID is the 'yyyy' placeholder or incorrect
      const characteristic = await primaryService.getCharacteristic(PRINTER_CHARACTERISTIC_UUID);
      toast({ title: "Bluetooth Printing", description: `Characteristic found! Preparing to send data...`});

      const encoder = new TextEncoder(); 
      let escPosCommands = new Uint8Array();
      const appendBytes = (newBytes: Uint8Array) => {
        const combined = new Uint8Array(escPosCommands.length + newBytes.length);
        combined.set(escPosCommands);
        combined.set(newBytes, escPosCommands.length);
        escPosCommands = combined;
      };
      
      // Example ESC/POS Commands (THESE ARE GENERIC - YOU NEED PRINTER-SPECIFIC ONES)
      // Initialize printer (ESC @)
      appendBytes(new Uint8Array([0x1B, 0x40])); 
      
      // Convert gate pass content to bytes
      const textToPrint = gatePassContent.replace(/\\n/g, '\n'); // Ensure newlines are actual \n
      appendBytes(encoder.encode(textToPrint));
      appendBytes(new Uint8Array([0x0A])); // Line feed

      // Placeholder for QR Code printing via ESC/POS
      // This is highly printer-specific. Find the command for your Atpos AT-402.
      // Example: GS ( k <pL> <pH> <cn> <fn> <m> d1...dk
      // For now, printing the QR data as text as a fallback if direct QR command is unknown.
      appendBytes(encoder.encode("\n[QR Code Data (Requires printer command)]\n"));
      appendBytes(encoder.encode(`ID: ${qrCodeData}\n`));
      appendBytes(new Uint8Array([0x0A, 0x0A])); // Some spacing

      // Cut paper (GS V B 0 - full cut, or GS V m for partial cut)
      // Example: Full cut
      appendBytes(new Uint8Array([0x1D, 0x56, 0x42, 0x00])); 
      
      console.log("Prepared ESC/POS Commands (Hex):", Array.from(escPosCommands).map(b => b.toString(16).padStart(2, '0')).join(' '));
      console.log("Attempting to send to characteristic:", characteristic.uuid);
      
      // Actually send the data
      await characteristic.writeValueWithResponse(escPosCommands);
      
      toast({ title: "Bluetooth Printing Successful", description: `Data sent to "${device.name || device.id}"!` });
      
    } catch (error: any) {
      console.error("Bluetooth Print Error:", error);
      let errorMessage = `Failed: ${error.message || "Unknown error"}`;
      if (error.name === 'NotFoundError' && error.message.includes("getPrimaryService")) {
        errorMessage = `Service UUID Error: Could not find service '${PRINTER_SERVICE_UUID}' on device '${device?.name || 'Unknown'}'. This means the Service UUID placeholder ('xxxx') IS STILL INCORRECT or the printer does not expose this service via GATT. YOU MUST REPLACE 'xxxx' with the correct Service UUID from your Atpos AT-402 printer's technical documentation for BLE/GATT printing, if supported. The standard SPP UUID (00001101-...) did not work.`;
      } else if (error.name === 'NotFoundError' && error.message.includes("getCharacteristic")) {
        errorMessage = `Characteristic UUID Error: Could not find characteristic '${PRINTER_CHARACTERISTIC_UUID}' (the one with 'yyyy') for service '${PRINTER_SERVICE_UUID}' on device '${device?.name || 'Unknown'}'. YOU MUST REPLACE THE 'yyyy' PLACEHOLDER with the correct Characteristic UUID from your Atpos AT-402 printer's technical documentation for the specified BLE/GATT service.`;
      } else if (error.name === 'NotFoundError') {
        errorMessage = "Device Selection Error: No Bluetooth devices found/selected or operation cancelled. Ensure printer is on, discoverable, and in range.";
      } else if (error.name === 'NotAllowedError') {
         errorMessage = "Permission Error: Bluetooth access denied by user or browser policy. Ensure permissions are granted and the Service UUID was included in 'optionalServices' during device request if it's not a placeholder and refers to a valid BLE service.";
      } else if (error.name === 'SecurityError') {
        errorMessage = "Security Error: Bluetooth connection failed. Ensure page is HTTPS.";
      } else if (error.message && error.message.includes("GATT operation already in progress")) {
        errorMessage = "Concurrency Error: GATT operation already in progress. Please wait.";
      } else if (error.message && error.message.toLowerCase().includes("user cancelled")) {
        errorMessage = "User Action: Device selection cancelled.";
      } else if (error.message && (error.message.toLowerCase().includes("connection attempt failed") || error.message.toLowerCase().includes("gatt server disconnected"))) {
         errorMessage = `Connection Error: Failed to connect to "${device?.name || 'the printer'}" GATT server. Ensure printer is ON, in range, paired (if required by printer), and not connected to another app/device. If it's a Bluetooth Classic SPP-only printer, this Web Bluetooth method will not work. Try the 'Print (Standard)' option for system-paired printers.`;
      } else if (error.message && error.message.toLowerCase().includes("origin is not allowed to access any service")) {
        errorMessage = `Permission Error: Origin not allowed to access service. Ensure the service UUID ('${PRINTER_SERVICE_UUID}') is included in 'optionalServices' in the requestDevice() options if it's a valid BLE service UUID and not a placeholder.`;
      } else if (error.message && error.message.toLowerCase().includes("invalid service name")) {
        errorMessage = `Invalid Service UUID format: The Service UUID '${PRINTER_SERVICE_UUID}' is not in a valid format. It should be a full 128-bit UUID string (e.g., '0000xxxx-0000-1000-8000-00805f9b34fb') or a recognized 16-bit alias (e.g., 'heart_rate'). Ensure 'xxxx' is replaced if it's a BLE-compatible printer.`;
      }
      toast({ title: "Bluetooth Print Error", description: errorMessage, variant: "destructive", duration: 15000 });
    } finally {
      if (device && device.gatt && device.gatt.connected) {
        // device.gatt.disconnect(); // Consider if you want to disconnect immediately or allow multiple prints.
        // console.log("Disconnected from GATT Server.");
      }
      setIsBluetoothPrinting(false);
    }
  };

  const handleCopy = () => {
    const textToCopy = `${gatePassContent.replace(/\\n/g, '\n')}\n\nQR Code Data: ${qrCodeData}`;
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
            {gatePassContent.replace(/\\n/g, '\n')}
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

