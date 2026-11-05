export interface MaintenanceRecord {
  id: number;
  orderNo: string;
  assetId: number;
  assetCode: string;
  assetName: string;
  maintenanceType: string;
  priority: string; // 'ACIL' | 'YUKSEK' | 'NORMAL' | 'DUSUK'
  vendorOrTechnician?: string;
  issueDescription: string;
  resolutionNote?: string;
  cost?: number | null;
  status: string; // 'ACIK' | 'DEVAM_EDIYOR' | 'TAMAMLANDI' | 'IPTAL'
  startedAt: string;
  completedAt?: string | null;
  createdBy: string;
  previousLifecycleStatus?: string | null;
}

export interface MaintenanceRequest {
  assetId: number;
  maintenanceType: string;
  priority: string;
  vendorOrTechnician?: string;
  issueDescription: string;
  estimatedCost?: number | null;
}

export interface MaintenanceCompleteRequest {
  targetStatus?: string;
  targetCondition?: string;
  returnLocation?: string;
  finalCost?: number | null;
  resolutionNote?: string;
}

export interface MaintenanceWorkOrder {
  id: number;
  orderNo: string;
  assetId: number;
  assetCode: string;
  assetName: string;
  barcode?: string | null;
  serialNumber?: string | null;
  categoryName?: string | null;
  departmentName?: string | null;
  location?: string | null;
  roomNumber?: string | null;
  maintenanceType: string;
  priority: string;
  technicianName: string;
  issueDescription: string;
  resolutionNote?: string | null;
  estimatedCost?: number | null;
  finalCost?: number | null;
  status: string;
  startedAt: string;
  completedAt?: string | null;
  createdBy: string;
  municipalHeader: string;
  workUnit: string;
  printedAt: string;
}

