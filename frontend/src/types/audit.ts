export interface InventoryAudit {
  id: number;
  auditCode: string;
  title: string;
  buildingId?: number | null;
  departmentId?: number | null;
  scopeDescription?: string | null;
  totalExpected: number;
  totalScanned: number;
  totalMissing: number;
  totalExcess: number;
  status: string; // 'PLANLANDI' | 'DEVAM_EDIYOR' | 'TAMAMLANDI'
  startedAt?: string | null;
  completedAt?: string | null;
  leadAuditor: string;
  notes?: string | null;
}

export interface AuditScan {
  id: number;
  auditId: number;
  assetId?: number | null;
  assetCode: string;
  assetName: string;
  expectedLocation?: string | null;
  scannedLocation: string;
  matchStatus: string; // 'ESLESTI' | 'FARKLI_ODA' | 'TANIMSIZ'
  scannedAt: string;
  scannedBy: string;
  notes?: string | null;
}

export interface AuditScanResult {
  status: string;
  matchStatus: 'DOGRU_KONUM' | 'FARKLI_KONUMDA' | 'FAZLA_KAYITSIZ' | string;
  scanId?: number | null;
  assetCode: string;
  assetName: string;
  expectedLocation?: string | null;
  scannedLocation: string;
  message: string;
}

export interface AuditReconciliationSummary {
  auditId: number;
  auditCode: string;
  title: string;
  totalExpected: number;
  totalScanned: number;
  totalMatched: number;
  totalDifferentLocation: number;
  totalExcess: number;
  totalMissing: number;
  completionRate: number;
  missingAssets: Array<{
    id: number;
    code: string;
    name: string;
    barcode?: string;
    location: string;
    department: string;
  }>;
}

export interface SystemAuditLog {
  id: number;
  actionType: string;
  entityType?: string | null;
  entityId?: string | null;
  actorUsername: string;
  actorName: string;
  ipAddress?: string | null;
  description: string;
  createdAt: string;
  oldValueJson?: string | null;
  newValueJson?: string | null;
}

