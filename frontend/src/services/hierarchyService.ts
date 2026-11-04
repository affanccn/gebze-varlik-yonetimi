import { apiRequest } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import {
  Building,
  Floor,
  Room,
  Department,
  SubUnit,
  AssetCategory,
  HierarchyTreeNode,
} from '../types/hierarchy';
import { Asset } from '../types/asset';

export const hierarchyService = {
  getTree: (mode: 'physical' | 'corporate' = 'physical'): Promise<HierarchyTreeNode> => {
    return apiRequest<HierarchyTreeNode>(`${API_ENDPOINTS.TREE}?mode=${mode}`);
  },

  getBuildings: (): Promise<Building[]> => {
    return apiRequest<Building[]>(API_ENDPOINTS.BUILDINGS);
  },

  getBuildingById: (id: number): Promise<Building> => {
    return apiRequest<Building>(`${API_ENDPOINTS.BUILDINGS}/${id}`);
  },

  getFloors: (buildingId?: number): Promise<Floor[]> => {
    const query = buildingId ? `?buildingId=${buildingId}` : '';
    return apiRequest<Floor[]>(`${API_ENDPOINTS.FLOORS}${query}`);
  },

  getRooms: (params?: {
    buildingId?: number;
    floorId?: number;
    departmentId?: number;
    roomType?: string;
  }): Promise<Room[]> => {
    const searchParams = new URLSearchParams();
    if (params?.buildingId) searchParams.set('buildingId', String(params.buildingId));
    if (params?.floorId) searchParams.set('floorId', String(params.floorId));
    if (params?.departmentId) searchParams.set('departmentId', String(params.departmentId));
    if (params?.roomType) searchParams.set('roomType', params.roomType);

    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return apiRequest<Room[]>(`${API_ENDPOINTS.ROOMS}${query}`);
  },

  getRoomById: (id: number): Promise<Room> => {
    return apiRequest<Room>(`${API_ENDPOINTS.ROOMS}/${id}`);
  },

  getAssetsInRoom: (roomId: number): Promise<Asset[]> => {
    return apiRequest<Asset[]>(`${API_ENDPOINTS.ROOMS}/${roomId}/assets`);
  },

  getDepartments: (): Promise<Department[]> => {
    return apiRequest<Department[]>(API_ENDPOINTS.DEPARTMENTS);
  },

  getSubUnits: (departmentId?: number): Promise<SubUnit[]> => {
    const query = departmentId ? `?departmentId=${departmentId}` : '';
    return apiRequest<SubUnit[]>(`${API_ENDPOINTS.SUB_UNITS}${query}`);
  },

  getCategories: (): Promise<AssetCategory[]> => {
    return apiRequest<AssetCategory[]>(API_ENDPOINTS.CATEGORIES);
  },
};
