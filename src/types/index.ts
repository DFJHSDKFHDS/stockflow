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
  imageUrl?: string; 
  createdAt: string; 
  updatedAt: string; 
  userId: string; 
}

export interface StockLog {
  id:string;
  productId: string;
  productName: string; 
  quantity: number;
  timestamp: string; 
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
  customerName: string; 
  gatePassId?: string; 
}

export interface GatePassItem {
  productId: string;
  name: string; 
  sku: string; 
  quantity: number;
  imageUrl: string; 
}

export interface GatePass {
  id: string; 
  gatePassNumber: number; // New auto-incrementing number
  userId: string; 
  userName: string; 
  items: GatePassItem[];
  customerName: string; 
  date: string; 
  totalQuantity: number;
  createdAt: string; 
  qrCodeData: string; 
  generatedPassContent?: string; 
}

export interface InventorySummary {
  totalProducts: number;
  totalStockUnits: number; 
  incomingToday: number; 
  outgoingToday: number; 
}

