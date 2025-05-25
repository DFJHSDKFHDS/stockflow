
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
import { Printer, Copy, Bluetooth, Loader2, Share2 } from "lucide-react"; 
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
      title: "Opening Print Dialog...",
      description: "Please check printer settings in the upcoming dialog (Paper Size: 80mm Roll, Scale: 100%, Margins: None/Minimal). This works with USB/system Bluetooth printers.",
      duration: 10000, // Increased duration
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
        '    font-family: Consolas, "Andale Mono WT", "Andale Mono", "Lucida Console", "Lucida Sans Typewriter", "DejaVu Sans Mono", "Bitstream Vera Sans Mono", "Liberation Mono", "Nimbus Mono L", Monaco, "Courier New", Courier, monospace; ' + // Broader monospace font stack
        '    white-space: pre-wrap; ' + 
        '    margin: 0; ' +
        '    padding: 0; ' +
        '    font-size: 11pt; ' + // Slightly increased font size
        '    line-height: 1.2; ' + // Adjusted line height
        '    width: 76mm; ' + 
        '    box-sizing: border-box;' +
        '    text-rendering: optimizeLegibility;' + // Text rendering hint
        '  }' +
        '  .content-wrapper {' +
        '    width: 100%;' +
        '    box-sizing: border-box;' +
        '  }' +
        '  .pass-line {' +
        '    margin:0; ' +
        '    padding:0; ' +
        '    font-family: Consolas, "Andale Mono WT", "Andale Mono", "Lucida Console", "Lucida Sans Typewriter", "DejaVu Sans Mono", "Bitstream Vera Sans Mono", "Liberation Mono", "Nimbus Mono L", Monaco, "Courier New", Courier, monospace; ' + // Ensure pass lines also use this font stack
        '    font-size: 11pt;' + // Consistent font size
        '    line-height: 1.2;' +
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
        '    max-width: 40mm; ' + // Slightly increased max-width for QR
        '    max-height: 40mm;' +
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
      }, 500); // Increased delay slightly more

    } else {
        toast({ title: "Print Error", description: "Could not open print window. Check browser pop-up settings.", variant: "destructive"});
    }
  };

  const handleBluetoothPrint = async () => {
    if (!navigator.bluetooth) {
      toast({ 
        title: "Web Bluetooth Not Supported", 
        description: "Your browser does not support Web Bluetooth. Try Chrome/Edge on Desktop/Android. This feature requires a Bluetooth Low Energy (BLE/GATT) compatible printer. Many POS thermal printers use Bluetooth Classic SPP and may not work with this method.", 
        variant: "destructive",
        duration: 15000 
      });
      return;
    }
    
    toast({ 
        title: "Bluetooth Print (Experimental)", 
        description: "Attempting to find Bluetooth devices. This direct printing method requires a BLE/GATT compatible printer. Printers using ONLY Bluetooth Classic SPP (like many POS thermal printers) might not work with this Web Bluetooth method. Use 'Print (Standard)' for system-paired printers.",
        duration: 10000 
    });

    setIsBluetoothPrinting(true);
    let device: BluetoothDevice | null = null;
    let server: BluetoothRemoteGATTServer | undefined = undefined;

    // CRITICAL: THE UUIDs BELOW ARE PLACEHOLDERS.
    // You MUST find the correct GATT Service and Characteristic UUIDs for *your specific printer model*
    // from its technical/programming documentation if it supports BLE/GATT for printing.
    // The standard SPP UUID ('00001101-...') is for Bluetooth Classic and will NOT work here if the printer doesn't bridge it to a GATT service.
    // The error "No Services matching UUID 00001101-..." confirmed the standard SPP UUID wasn't found as a GATT service.
    // You need the *actual GATT service UUID* for printing on your Atpos AT-402, if it provides one.
    const PRINTER_SERVICE_UUID = '0000xxxx-0000-1000-8000-00805f9b34fb'; // <<<!!! CRITICAL: REPLACE 'xxxx' (Service) WITH ACTUAL Atpos AT-402 GATT PRINT SERVICE UUID IF AVAILABLE !!!>>>
    const PRINTER_CHARACTERISTIC_UUID = '0000yyyy-0000-1000-8000-00805f9b34fb'; // <<<!!! CRITICAL: REPLACE 'yyyy' (Characteristic) WITH ACTUAL Atpos AT-402 GATT PRINT CHARACTERISTIC UUID IF AVAILABLE !!!>>>

    try {
      console.log('Requesting Bluetooth device with acceptAllDevices: true');
      device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true, 
        // If you find the correct PRINTER_SERVICE_UUID for your printer, add it here:
        // optionalServices: [PRINTER_SERVICE_UUID], // e.g., '000018f0-0000-1000-8000-00805f9b34fb' for a standard print service. Or '00001101-0000-1000-8000-00805f9b34fb' for SPP if GATT-wrapped.
      });
      
      if (!device) {
        toast({ title: "Bluetooth Printing", description: "No device selected.", variant: "default" });
        setIsBluetoothPrinting(false);
        return;
      }
      console.log('Selected Bluetooth device:', device); 
      if(!device.name) {
        console.warn("Selected device has no name. This might be normal for some devices.");
      }

      toast({ title: "Bluetooth Printing", description: `Connecting to "${device.name || device.id}"...` });
      if (!device.gatt) {
        toast({ 
          title: "Bluetooth Connection Error", 
          description: `Selected device "${device.name || device.id}" does not support GATT. This printer might use Bluetooth Classic SPP, which isn't directly accessible for raw data via Web Bluetooth's GATT services. Ensure printer is ON, in range, and paired if necessary. Consult printer manual for BLE/GATT compatibility.`, 
          variant: "destructive",
          duration: 15000 
        });
        setIsBluetoothPrinting(false);
        return;
      }
      
      server = await device.gatt.connect(); 
      toast({ title: "Bluetooth Printing", description: "Connected to GATT Server! Discovering services..." });
      
      // This will FAIL if PRINTER_SERVICE_UUID is still the 'xxxx' placeholder or incorrect for your printer
      toast({ title: "Bluetooth Printing", description: `Attempting to get service with UUID: ${PRINTER_SERVICE_UUID}`});
      const primaryService = await server.getPrimaryService(PRINTER_SERVICE_UUID);
      toast({ title: "Bluetooth Printing", description: `Service found! Attempting to get characteristic: ${PRINTER_CHARACTERISTIC_UUID}`});
      // This will also FAIL if PRINTER_CHARACTERISTIC_UUID is the 'yyyy' placeholder or incorrect
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
      
      // --- START ESC/POS COMMAND GENERATION (HIGHLY PRINTER-SPECIFIC) ---
      // Example: Initialize printer (ESC @)
      appendBytes(new Uint8Array([0x1B, 0x40])); 
      
      // Convert gate pass content to bytes (replace \n with printer's newline command if different, e.g., LF is 0x0A)
      const textToPrint = gatePassContent.replace(/\\n/g, '\n'); 
      appendBytes(encoder.encode(textToPrint));
      appendBytes(new Uint8Array([0x0A])); // Line feed

      // Placeholder for QR Code printing via ESC/POS
      // This is HIGHLY printer-specific. You need to find the command for your Atpos AT-402.
      // Example structure: GS ( k <pL> <pH> <cn> <fn> <m> d1...dk
      // For now, printing the QR data as text as a fallback if direct QR command is unknown.
      appendBytes(encoder.encode("\n[QR Code Data (Requires printer command)]\n"));
      appendBytes(encoder.encode(`ID: ${qrCodeData}\n`));
      appendBytes(new Uint8Array([0x0A, 0x0A])); // Some spacing

      // Example: Cut paper (GS V B 0 - full cut, or GS V m for partial cut)
      // Consult Atpos AT-402 manual for its specific cut command.
      appendBytes(new Uint8Array([0x1D, 0x56, 0x42, 0x00])); // Example: Full cut
      // --- END ESC/POS COMMAND GENERATION ---
      
      console.log("Prepared ESC/POS Commands (Hex):", Array.from(escPosCommands).map(b => b.toString(16).padStart(2, '0')).join(' '));
      console.log("Attempting to send to characteristic:", characteristic.uuid);
      
      // Actually send the data
      // Make sure you have replaced placeholders for UUIDs and ESC/POS commands
      await characteristic.writeValueWithResponse(escPosCommands); 
      
      console.log("Data sent to printer.");
      toast({ title: "Print Data Sent", description: `Data sent to "${device.name || device.id}". Check printer.` });
      
    } catch (error: any) {
      console.error("Bluetooth Print Error:", error);
      let errorMessage = `Failed: ${error.message || "Unknown error"}`;
       if (error.name === 'NotFoundError' && error.message.includes("getPrimaryService")) {
        errorMessage = `Service UUID Error: Could not find service '${PRINTER_SERVICE_UUID}' on device '${device?.name || 'Unknown'}'. This means the Service UUID placeholder ('xxxx') IS STILL INCORRECT or the printer does not expose this service via GATT. The standard SPP UUID (00001101-...) did not work previously. YOU MUST REPLACE 'xxxx' with the correct Service UUID from your Atpos AT-402 printer's technical documentation for BLE/GATT printing, if supported.`;
      } else if (error.name === 'NotFoundError' && error.message.includes("getCharacteristic")) {
        errorMessage = `Characteristic UUID Error: Could not find characteristic '${PRINTER_CHARACTERISTIC_UUID}' (the one with 'yyyy') for service '${PRINTER_SERVICE_UUID}' on device '${device?.name || 'Unknown'}'. YOU MUST REPLACE THE 'yyyy' PLACEHOLDER with the correct Characteristic UUID from your Atpos AT-402 printer's technical documentation for the specified BLE/GATT service.`;
      } else if (error.name === 'NotFoundError') {
        errorMessage = "Device Selection Error: No Bluetooth devices found/selected or operation cancelled. Ensure printer is on, discoverable, and in range.";
      } else if (error.name === 'NotAllowedError') {
         errorMessage = `Permission Error: Bluetooth access denied by user or browser policy. If you are using a specific Service UUID like '${PRINTER_SERVICE_UUID}', ensure it was included in 'optionalServices' during device request, and that it's a valid BLE service UUID (not a placeholder like 'xxxx').`;
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
      } else if (error.message && error.message.toLowerCase().includes("invalid service name") && PRINTER_SERVICE_UUID.includes("xxxx")) {
        errorMessage = `Invalid Service UUID format: The Service UUID '${PRINTER_SERVICE_UUID}' still contains the 'xxxx' placeholder and is not a valid UUID. YOU MUST REPLACE 'xxxx' with the correct Service UUID from your Atpos AT-402 printer's technical documentation for BLE/GATT printing, if supported. The standard SPP UUID (00001101-...) did not work.`;
      } else if (error.message && error.message.toLowerCase().includes("invalid service name")) {
        errorMessage = `Invalid Service UUID format: The Service UUID '${PRINTER_SERVICE_UUID}' is not in a valid format. It should be a full 128-bit UUID string (e.g., '000018f0-0000-1000-8000-00805f9b34fb') or a recognized 16-bit alias (e.g., 'heart_rate').`;
      }
      toast({ title: "Bluetooth Print Error", description: errorMessage, variant: "destructive", duration: 20000 });
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

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Gate Pass',
          text: gatePassContent.replace(/\\n/g, '\n') + `\n\nGate Pass ID (for QR): ${qrCodeData}`,
        });
        toast({ title: "Shared!", description: "Gate pass content shared."});
      } catch (error: any) {
        console.error('Error sharing:', error);
        if (error.name !== 'AbortError') { 
          toast({ title: "Share Failed", description: error.message || "Could not share content.", variant: "destructive"});
        }
      }
    } else {
      toast({ title: "Not Supported", description: "Web Share API is not supported in your browser.", variant: "default" });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Generated Gate Pass</DialogTitle>
          <DialogDescription>
            This gate pass is formatted for thermal printer output. Review and print/share.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[400px] w-full rounded-md border p-4 my-4">
          <pre className="text-sm whitespace-pre-wrap break-all" style={{fontFamily: 'Consolas, "Andale Mono WT", "Andale Mono", "Lucida Console", "Lucida Sans Typewriter", "DejaVu Sans Mono", "Bitstream Vera Sans Mono", "Liberation Mono", "Nimbus Mono L", Monaco, "Courier New", Courier, monospace', fontSize: '11pt', lineHeight: '1.2'}}>
            {gatePassContent.replace(/\\n/g, '\n')}
          </pre>
          {qrCodeData && (
            <div className="mt-4 text-center">
              <QRCodeCanvas id={qrCanvasId} value={qrCodeData} size={150} bgColor={"#ffffff"} fgColor={"#000000"} level={"L"} includeMargin={false} style={{display: 'block', margin: '0 auto'}} />
              <p className="text-xs text-muted-foreground mt-1">QR Code (Data: {qrCodeData.substring(0,30)}...)</p>
            </div>
          )}
        </ScrollArea>
        <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-2 flex-wrap"> 
            <div className="flex gap-2">
                <Button variant="outline" onClick={handleCopy} size="sm" disabled={isBluetoothPrinting}>
                    <Copy className="mr-2 h-4 w-4" /> Copy Text
                </Button>
                 {navigator.share && (
                  <Button variant="outline" onClick={handleShare} size="sm" disabled={isBluetoothPrinting}>
                      <Share2 className="mr-2 h-4 w-4" /> Share
                  </Button>
                )}
            </div>
            <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={onClose} size="sm" disabled={isBluetoothPrinting}>Close</Button>
                <Button onClick={handleBluetoothPrint} size="sm" variant="default" disabled={isBluetoothPrinting || !navigator.bluetooth}>
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

    