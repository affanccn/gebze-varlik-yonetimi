export interface ApiErrorResponse {
  error?: string;
  message?: string;
  status?: number;
  code?: string;
  timestamp?: string;
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

