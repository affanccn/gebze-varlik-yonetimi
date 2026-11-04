export interface AssetDocument {
  id: number;
  docCode: string;
  assetId?: number;
  assetName?: string;
  documentType: string;
  title: string;
  documentNo?: string;
  fileName: string;
  fileSizeKb: number;
  issuedBy?: string;
  validUntil?: string;
  notes?: string;
  createdAt: string;
}

