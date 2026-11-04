export interface UserResponse {
  id: number;
  username: string;
  fullName: string;
  email: string;
  role: string;
  roleLabel: string;
  departmentId?: number | null;
  departmentName?: string | null;
  personnelId?: number | null;
  personnelName?: string | null;
  mustChangePassword: boolean;
  isActive: boolean;
  failedAttempts: number;
  isLocked: boolean;
  lockedUntil?: string | null;
  createdAt: string;
  temporaryPassword?: string | null;
}

export interface UserCreateRequest {
  username: string;
  fullName: string;
  email: string;
  role: string;
  departmentId?: number | null;
  personnelId?: number | null;
  password?: string;
}

export interface UserUpdateRequest {
  fullName: string;
  email: string;
  role: string;
  departmentId?: number | null;
  personnelId?: number | null;
  isActive: boolean;
}

export interface UserResetPasswordResponse {
  username: string;
  temporaryPassword: string;
  message: string;
}

