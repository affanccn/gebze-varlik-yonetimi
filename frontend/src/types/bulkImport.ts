export interface BulkImportError {
  rowNumber: number;
  field: string;
  value: string;
  message: string;
}

export interface BulkImportRow {
  rowNumber: number;
  code: string;
  name: string;
  categoryCode: string;
  departmentCode: string;
  roomQrCode?: string;
  barcode?: string;
  tifCode?: string;
  brandModel?: string;
  serialNumber?: string;
  acquisitionDate?: string;
  warrantyEndDate?: string;
  estimatedValue?: number;
  supplier?: string;
  notes?: string;
}

export interface BulkImportValidationResult {
  fileName: string;
  totalRows: number;
  validRowsCount: number;
  invalidRowsCount: number;
  errors: BulkImportError[];
  validRows: BulkImportRow[];
}

export interface BulkImportCommitResult {
  batchId: string;
  fileName: string;
  totalRows: number;
  importedCount: number;
  skippedCount: number;
  errors: BulkImportError[];
  success: boolean;
  message: string;
}

