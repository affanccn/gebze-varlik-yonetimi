export interface StockItem {
  id: number;
  itemCode: string;
  itemName: string;
  category: string;
  warehouseName: string;
  buildingId?: number | null;
  departmentId?: number | null;
  currentQuantity: number;
  minThreshold: number;
  unit: string;
  unitPrice: number;
  status: string; // 'NORMAL' | 'KRITIK' | 'TUKENDI'
  lastRestockedAt?: string | null;
}

export interface StockTransaction {
  id: number;
  transactionCode: string;
  stockItemId: number;
  itemName: string;
  txType: string; // 'GIRIS' | 'CIKIS'
  quantity: number;
  unit: string;
  departmentId?: number | null;
  departmentName?: string | null;
  recipientName?: string | null;
  performedBy: string;
  notes?: string | null;
  txDate: string;
}

export interface StockTransactionRequest {
  stockItemId: number;
  txType: 'GIRIS' | 'CIKIS';
  quantity: number;
  departmentId?: number | null;
  departmentName?: string;
  recipientName?: string;
  notes?: string;
}

