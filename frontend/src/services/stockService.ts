import { apiRequest } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import { PageResponse, CursorResponse, PageParams } from '../types/api';
import {
  StockItem,
  StockTransaction,
  StockTransactionRequest,
} from '../types/stock';

export const stockService = {
  getAll: (params?: PageParams & {
    departmentId?: number;
    warehouse?: string;
    status?: string;
  }): Promise<PageResponse<StockItem>> => {
    const searchParams = new URLSearchParams();
    if (params?.page !== undefined) searchParams.set('page', String(params.page));
    if (params?.size !== undefined) searchParams.set('size', String(params.size));
    if (params?.sort) searchParams.set('sort', params.sort);
    if (params?.q) searchParams.set('q', params.q);
    if (params?.departmentId) searchParams.set('departmentId', String(params.departmentId));
    if (params?.warehouse) searchParams.set('warehouse', params.warehouse);
    if (params?.status) searchParams.set('status', params.status);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return apiRequest<PageResponse<StockItem>>(`${API_ENDPOINTS.STOCK}${query}`);
  },

  getTransactions: (params?: {
    cursor?: string;
    size?: number;
    stockItemId?: number;
    txType?: string;
  }): Promise<CursorResponse<StockTransaction>> => {
    const searchParams = new URLSearchParams();
    if (params?.cursor) searchParams.set('cursor', params.cursor);
    if (params?.size) searchParams.set('size', String(params.size));
    if (params?.stockItemId) searchParams.set('stockItemId', String(params.stockItemId));
    if (params?.txType) searchParams.set('txType', params.txType);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return apiRequest<CursorResponse<StockTransaction>>(`${API_ENDPOINTS.STOCK_TRANSACTIONS}${query}`);
  },

  createTransaction: (data: StockTransactionRequest): Promise<{ status: string; message: string }> => {
    return apiRequest<{ status: string; message: string }>(API_ENDPOINTS.STOCK_TRANSACTIONS, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

