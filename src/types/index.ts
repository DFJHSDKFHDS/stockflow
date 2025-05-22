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
  imageUrl: string; 
  createdAt: string; 
  updatedAt: string; 
  userId: string; 
}

export interface StockLog {
  id: string;
  productId: string;
  productName: string; // Denormalized for easier display
  quantity: number;
  timestamp: string; // ISO string, represents creation time of the log
  userId: string;
  type: 'incoming' | 'outgoing';
}

export interface IncomingLog extends StockLog {
  type: 'incoming';
  receivedAt: string; // ISO string, represents actual date of stock arrival (can be different from log creation)
  purchaseOrder?: string;
  supplier?: string;
}

export interface OutgoingLog extends StockLog {
  type: 'outgoing';
  customerName: string; 
  gatePassId?: string; // Corresponds to GatePass.id
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
  gatePassNumber: number; 
  userId: string; 
  userName: string; 
  items: GatePassItem[];
  customerName: string; 
  date: string; // ISO string for dispatch date & time
  totalQuantity: number;
  createdAt: string; // ISO string for gate pass creation time
  qrCodeData: string; 
  generatedPassContent?: string; 
}

export interface InventorySummary {
  totalProducts: number;
  totalStockUnits: number; 
  incomingToday: number; 
  outgoingToday: number; 
}

export interface UserProfileData {
  shopName: string;
  contactNo: string;
  address: string;
  employees?: string[]; // Added for employee names
}

