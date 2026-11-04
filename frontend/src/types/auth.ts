export type Role = 'ADMIN' | 'DEPT_MANAGER' | 'STAFF' | 'AUDITOR' | 'VIEWER';

export interface UserSession {
  id: number;
  username: string;
  fullName: string;
  email: string | null;
  role: Role;
  departmentId: number | null;
  personnelId: number | null;
  mustChangePassword: boolean;
  sessionId: string | null;
}

export type LoginResponse = UserSession;

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ApiMessageResponse {
  status: string;
  message: string;
}
