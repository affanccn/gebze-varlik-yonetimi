import { AssetMovement } from './movement';

export interface DepartmentSummaryRow {
  id: number;
  code: string;
  name: string;
  managerName?: string;
  totalCount: number;
  activeCount: number;
  storageCount: number;
  maintenanceCount: number;
  totalValue: number;
}

export interface BuildingDistributionRow {
  id: number;
  code: string;
  name: string;
  type: string;
  roomCount: number;
  assetCount: number;
}

export interface CategoryDistributionRow {
  name: string;
  count: number;
  totalValue?: number;
}

export interface TopRoomRow {
  roomId: number;
  roomNumber: string;
  roomName: string;
  roomType: string;
  buildingName: string;
  assetCount: number;
}

export interface WarrantyAlertRow {
  id: number;
  code: string;
  name: string;
  unit: string;
  location: string;
  warrantyEndDate: string;
}

export interface ConditionAlertRow {
  id: number;
  code: string;
  name: string;
  unit: string;
  location: string;
  condition: string;
}

export interface LifecycleDistributionRow {
  status: string;
  count: number;
  totalValue: number;
}

export interface AcquisitionTrendRow {
  year: string;
  count: number;
  totalValue: number;
}

export interface DashboardSummary {
  totalAssets: number;
  totalBuildings: number;
  totalDepartments: number;
  totalSubUnits: number;
  totalFloors: number;
  totalRooms: number;
  activeCount: number;
  inStorageCount: number;
  maintenanceCount: number;
  inactiveCount: number;
  totalEstimatedValue: number;

  byCategory: CategoryDistributionRow[];
  byStatus: Record<string, number>;
  byCondition: Record<string, number>;
  lifecycleDistribution?: LifecycleDistributionRow[];
  acquisitionTrends?: AcquisitionTrendRow[];
  unitSummaries: DepartmentSummaryRow[];
  buildingsDistribution: BuildingDistributionRow[];
  topRooms: TopRoomRow[];
  warrantyAlerts: WarrantyAlertRow[];
  conditionAlerts: ConditionAlertRow[];
  recentMovements: AssetMovement[];
}
