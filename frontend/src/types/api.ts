export interface ApiErrorResponse {
  error?: string;
  message?: string;
  status?: number;
  code?: string;
  timestamp?: string;
}

export interface PageResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface PageParams {
  page?: number;
  size?: number;
  sort?: string;
  sortBy?: string;
  query?: string;
  q?: string;
}

export class ApiException extends Error {
  status: number;
  code?: string;
  data?: ApiErrorResponse;

  constructor(status: number, message: string, code?: string, data?: ApiErrorResponse) {
    super(message);
    this.name = 'ApiException';
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

