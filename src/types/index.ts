// src/types/index.ts

export interface Product {
  id: string;
  name: string;
  description: string;
  sku: string; // Stock Keeping Unit
  category?: string;
  currentStock: number;
  unitPrice?: number; // Optional: if tracking value
  supplier?: string; // Optional
  createdAt: Date;
  updatedAt: Date;
  userId: string; // To associate with the user who created it
}

export interface StockLog {
  id: string;
  productId: string;
  productName: string; // Denormalized for easier display
  quantity: number;
  timestamp: Date;
  userId: string;
  type: 'incoming' | 'outgoing';
}

export interface IncomingLog extends StockLog {
  type: 'incoming';
  purchaseOrder?: string;
  supplier?: string;
}

export interface OutgoingLog extends StockLog {
  type: 'outgoing';
  destination: string;
  reason: string; // e.g., Sale, Internal Use, Damaged
  gatePassData?: GatePassGenerationData; // Data used for generating gate pass
  generatedGatePass?: string; // The AI generated pass content
}

export interface GatePassGenerationData {
  productName: string;
  quantity: number;
  destination: string;
  reason: string;
  date: string; // Formatted date string
  qrCodeData: string; // Data to be embedded in QR code
}

// For dashboard summary
export interface InventorySummary {
  totalProducts: number;
  totalStockUnits: number; // Sum of currentStock for all products
  incomingToday: number; // Count of units received today
  outgoingToday: number; // Count of units shipped today
}
