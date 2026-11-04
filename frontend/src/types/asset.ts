import { AssetMovement } from './movement';

export interface Asset {
  id: number;
  code: string;
  name: string;
  barcode?: string;
  rfidTag?: string;
  category?: string;
  categoryId?: number;
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
  assignee?: string;
  assignedPersonnelId?: number;
  status: string;
  lifecycleStatus?: string;
  condition?: string;
  conditionStatus?: string;
  estimatedValue?: number;
  acquisitionDate?: string;
  warrantyEndDate?: string;
  serialNumber?: string;
  model?: string;
  brand?: string;
  tifCode?: string;
  unit?: string;
  location?: string;
  locationInfo?: string;
  isActive?: number;
  specifications?: string;
}

export interface AssetDetailResponse {
  asset: Asset;
  movements?: AssetMovement[];
  assignments?: unknown[];
  maintenances?: unknown[];
  documents?: unknown[];
}
