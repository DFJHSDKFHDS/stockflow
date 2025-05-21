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
  imageUrl?: string; // Added for product image
  createdAt: string; // Changed to string for RTDB compatibility
  updatedAt: string; // Changed to string for RTDB compatibility
  userId: string; // To associate with the user who created it
}

export interface StockLog {
  id:string;
  productId: string;
  productName: string; // Denormalized for easier display
  quantity: number;
  timestamp: string; // Changed to string
  userId: string;
  type: 'incoming' | 'outgoing';
}

export interface IncomingLog extends StockLog {
  type: 'incoming';
  purchaseOrder?: string;
  supplier?: string;
}

// This OutgoingLog might be for individual item logs, 
// while GatePass handles grouped items for a formal pass.
export interface OutgoingLog extends StockLog {
  type: 'outgoing';
  destination: string; // Kept for generic log, GatePass uses customerName
  reason: string; // Kept for generic log
  gatePassId?: string; // Optional: if this log entry is part of a formal gate pass
}

// For AI Flow - single product context
export interface GatePassGenerationData {
  productName: string;
  quantity: number;
  customerName: string; 
  date: string; // Formatted date string, now includes time
  qrCodeData: string; // Data to be embedded in QR code
}

// --- New types for multi-item Gate Pass ---
export interface GatePassItem {
  productId: string;
  name: string; // Denormalized product name
  sku: string; // Denormalized SKU
  quantity: number;
  imageUrl: string; 
}

export interface GatePass {
  id: string; // Unique ID for the gate pass
  userId: string; // UID of the user who created the pass
  userName: string; // Display name/email of the user
  items: GatePassItem[];
  customerName: string; 
  date: string; // Date & Time of dispatch, stored as ISO string
  totalQuantity: number;
  createdAt: string; // ISO string timestamp of when the pass was created
  qrCodeData: string; // Usually the GatePass ID itself, to look up details
  generatedPassContent?: string; // The AI generated textual content for printing
}
// --- End new types ---


// For dashboard summary (if dashboard is reinstated later)
export interface InventorySummary {
  totalProducts: number;
  totalStockUnits: number; // Sum of currentStock for all products
  incomingToday: number; // Count of units received today
  outgoingToday: number; // Count of units shipped today
}
