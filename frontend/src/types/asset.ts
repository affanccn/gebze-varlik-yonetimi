import { AssetMovement } from './movement';

export interface Asset {
  id: number;
  code: string;
  name: string;
  barcode?: string;
  tifCode?: string;
  category?: string;
  categoryId?: number;
  brandModel?: string;
  serialNumber?: string;
  unit?: string;
  location?: string;
  assignee?: string;
  status: string;
  condition?: string;
  acquisitionDate?: string;
  warrantyEndDate?: string;
  estimatedValue?: number;
  supplier?: string;
  notes?: string;
  updatedAt?: string;
  departmentId?: number;
  departmentName?: string;
  subUnitId?: number;
  subUnitName?: string;
  buildingId?: number;
  buildingName?: string;
  floorId?: number;
  floorName?: string;
  roomId?: number;
  roomNumber?: string;
  roomName?: string;
  roomQrCode?: string;
  categoryName?: string;
  lifecycleStatus?: string;
  isActive?: number;
  specifications?: string;
}

export interface AssetRequest {
  code?: string;
  tifCode?: string;
  barcode?: string;
  name: string;
  category: string;
  brandModel?: string;
  serialNumber?: string;
  unit?: string;
  location?: string;
  assignee?: string;
  status?: string;
  condition?: string;
  acquisitionDate?: string;
  warrantyEndDate?: string;
  estimatedValue?: number;
  supplier?: string;
  notes?: string;
  departmentId?: number;
  subUnitId?: number;
  buildingId?: number;
  floorId?: number;
  roomId?: number;
  categoryId?: number;
}

export interface TransferRequest {
  buildingId?: number;
  floorId?: number;
  roomId?: number;
  departmentId?: number;
  subUnitId?: number;
  note?: string;
}

export interface TransitionRequest {
  targetStatus: string;
  reason: string;
}

export interface AssetDetailResponse {
  asset: Asset;
  movements?: AssetMovement[];
  assignments?: unknown[];
  maintenances?: unknown[];
  availableTransitions?: string[];
}

export const LIFECYCLE_STATUS_LABELS: Record<string, string> = {
  SATIN_ALINDI: 'Satın Alındı',
  KAYDEDILDI: 'Kaydedildi (Ambar)',
  ZIMMETLENDI: 'Zimmetlendi',
  KULLANIMDA: 'Kullanımda (Ortak)',
  BAKIMDA: 'Bakımda',
  PASIF_ASKIDA: 'Pasif / Askıda',
  HURDAYA_AYRILDI: 'Hurdaya Ayrıldı (HEK)',
  DEVREDILDI: 'Devredildi',
  BAGISLANDI: 'Bağışlandı',
  SATILDI: 'Satıldı',
  ZAYIAT_CALINMA: 'Zayiat / Çalınma',
};
