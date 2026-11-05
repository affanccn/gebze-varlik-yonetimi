export interface AssetAssignment {
  id: number;
  documentNo: string;
  assetId: number;
  assetCode: string;
  assetName: string;
  personnelId?: number | null;
  assigneeName: string;
  assigneeTitle?: string;
  unit?: string;
  location?: string;
  status: string; // 'AKTIF' | 'IADE_EDILDI'
  assignedBy: string;
  assignedAt: string;
  returnedAt?: string | null;
  returnNote?: string | null;
  note?: string | null;
}

export interface AssignmentRequest {
  assetId: number;
  personnelId?: number;
  assigneeName: string;
  assigneeTitle?: string;
  unit?: string;
  location?: string;
  note?: string;
}

export interface AssignmentReturnRequest {
  targetStatus?: string;
  returnLocation?: string;
  returnNote?: string;
}

