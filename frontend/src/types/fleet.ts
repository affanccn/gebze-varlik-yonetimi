export interface FleetVehicle {
  id: number;
  plateNumber: string;
  vehicleCode: string;
  vehicleType: string;
  brandModel: string;
  modelYear: number;
  departmentId?: number | null;
  departmentName?: string | null;
  assignedDriver?: string | null;
  currentKm: number;
  fuelType?: string | null;
  inspectionDate?: string | null;
  insuranceDate?: string | null;
  kaskoDate?: string | null;
  status: string; // 'GOREVDE' | 'GARAJDA' | 'BAKIMDA' | 'ARIZALI'
  notes?: string | null;
  updatedAt?: string | null;
}

export interface FleetStatusUpdateRequest {
  status: string;
  currentKm?: number;
  assignedDriver?: string;
}

