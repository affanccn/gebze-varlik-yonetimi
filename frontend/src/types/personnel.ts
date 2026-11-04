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

