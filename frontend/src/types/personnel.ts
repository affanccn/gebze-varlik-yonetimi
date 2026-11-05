export interface Personnel {
  id: number;
  registrationNumber: string;
  firstName: string;
  lastName: string;
  fullName: string;
  title?: string;
  departmentId?: number;
  departmentName?: string;
  subUnitId?: number;
  subUnitName?: string;
  roomId?: number;
  roomNumber?: string;
  roomName?: string;
  phone?: string;
  email?: string;
  isActive: number;
}

export interface PersonnelImportError {
  rowNumber: number;
  columnName: string;
  message: string;
}

export interface PersonnelImportRow {
  rowNumber: number;
  registrationNumber: string;
  firstName: string;
  lastName: string;
  title: string;
  departmentCode: string;
  subUnitName?: string;
  roomNumber?: string;
  phone?: string;
  email?: string;
}

export interface PersonnelImportValidationResult {
  totalRows: number;
  validRows: number;
  errorRows: number;
  errors: PersonnelImportError[];
  previewRows: PersonnelImportRow[];
}

export interface PersonnelImportCommitResult {
  insertedCount: number;
  updatedCount: number;
  totalProcessed: number;
}
