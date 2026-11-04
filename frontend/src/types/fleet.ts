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

export type FleetStatusCode = 'GOREVDE' | 'GARAJDA' | 'BAKIMDA' | 'ARIZALI';

export const normalizeFleetStatus = (status?: string): FleetStatusCode => {
  if (!status) return 'GARAJDA';
  const s = status.toUpperCase();
  if (s.includes('GÖREV') || s.includes('GOREV')) return 'GOREVDE';
  if (s.includes('BAKIM') || s.includes('SERVIS')) return 'BAKIMDA';
  if (s.includes('ARIZA') || s.includes('KULLANIM DISI')) return 'ARIZALI';
  return 'GARAJDA';
};

export const FLEET_STATUS_LABELS: Record<FleetStatusCode, string> = {
  GOREVDE: 'Görevde (Sahada)',
  GARAJDA: 'Garajda (Hazır)',
  BAKIMDA: 'Bakımda / Serviste',
  ARIZALI: 'Arızalı / Hizmet Dışı',
};

