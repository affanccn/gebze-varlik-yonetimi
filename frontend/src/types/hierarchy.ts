export interface Building {
  id: number;
  code: string;
  name: string;
  buildingType: string;
  address?: string;
  phone?: string;
  totalFloors: number;
  description?: string;
  isActive: number;
  assetCount: number;
  roomCount: number;
}

export interface Floor {
  id: number;
  buildingId: number;
  buildingName?: string;
  name: string;
  floorNumber: number;
  description?: string;
  isActive: number;
  roomCount?: number;
  assetCount?: number;
}

export interface Room {
  id: number;
  buildingId: number;
  buildingName?: string;
  floorId: number;
  floorName?: string;
  roomNumber: string;
  name: string;
  roomType: string;
  departmentId?: number;
  departmentName?: string;
  subUnitId?: number;
  subUnitName?: string;
  responsiblePerson?: string;
  capacity?: number;
  qrCode?: string;
  description?: string;
  isActive: number;
  assetCount: number;
}

export interface Department {
  id: number;
  code: string;
  name: string;
  managerName?: string;
  phone?: string;
  email?: string;
  displayOrder?: number;
  isActive: number;
  assetCount: number;
}

export interface SubUnit {
  id: number;
  departmentId: number;
  departmentName?: string;
  parentUnitId?: number;
  code: string;
  name: string;
  unitType?: string;
  managerName?: string;
  phone?: string;
  description?: string;
  isActive: number;
  assetCount: number;
}

export interface AssetCategory {
  id: number;
  parentId?: number;
  code: string;
  name: string;
  icon?: string;
  description?: string;
  isActive: number;
  assetCount: number;
}

export interface HierarchyTreeNode {
  id: string;
  label: string;
  type: 'MUNICIPALITY' | 'BUILDING' | 'FLOOR' | 'DEPARTMENT' | 'SUB_UNIT' | 'ROOM' | 'ASSET' | string;
  code?: string;
  description?: string;
  icon?: string;
  count?: number;
  metadata?: Record<string, unknown>;
  children?: HierarchyTreeNode[];
}
