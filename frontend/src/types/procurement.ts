export interface ProcurementOrder {
  id: number;
  orderNo: string;
  title: string;
  departmentId?: number | null;
  departmentName?: string | null;
  procurementType: string;
  supplierName?: string | null;
  estimatedBudget: number;
  finalAmount?: number | null;
  status: string; // 'TALEP_EDILDI' | 'ONAYLANDI' | 'SIPARIS_VERILDI' | 'TESLIM_ALINDI' | 'IPTAL'
  requestedBy: string;
  orderDate: string;
  deliveryDate?: string | null;
  description?: string | null;
}

