import { apiRequest } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import {
  StockItem,
  StockTransaction,
  StockTransactionRequest,
} from '../types/stock';

export const stockService = {
  getAll: (params?: {
    departmentId?: number;
    warehouse?: string;
    status?: string;
  }): Promise<StockItem[]> => {
    const searchParams = new URLSearchParams();
    if (params?.departmentId) searchParams.set('departmentId', String(params.departmentId));
    if (params?.warehouse) searchParams.set('warehouse', params.warehouse);
    if (params?.status) searchParams.set('status', params.status);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return apiRequest<StockItem[]>(`${API_ENDPOINTS.STOCK}${query}`);
  },

  getTransactions: (stockItemId?: number): Promise<StockTransaction[]> => {
    const params = new URLSearchParams();
    if (stockItemId) params.set('stockItemId', String(stockItemId));
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest<StockTransaction[]>(`${API_ENDPOINTS.STOCK_TRANSACTIONS}${query}`);
  },

  createTransaction: (data: StockTransactionRequest): Promise<{ status: string; message: string }> => {
    return apiRequest<{ status: string; message: string }>(API_ENDPOINTS.STOCK_TRANSACTIONS, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

