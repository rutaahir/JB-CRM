import { apiClient } from './client';
import { Deal, PaginatedResponse, BrokeragePayment } from '../types';

export interface BrokerageLedgerResponse {
  total_earned: number;
  total_received: number;
  total_pending: number;
  mill_summary: Array<{
    seller_id: number;
    company_name: string;
    phone: string;
    gstin?: string;
    deals_count: number;
    brokerage_earned: number;
    brokerage_received: number;
    brokerage_pending: number;
  }>;
  recent_payments: Array<{
    id: number;
    deal_number: string;
    amount: number;
    paid_by: string;
    payment_date: string;
    payment_mode: string;
    reference_number: string;
  }>;
}

export const dealsApi = {
  getDeals: async (params?: Record<string, any>) => {
    const response = await apiClient.get<PaginatedResponse<Deal> | Deal[]>('/deals/', { params });
    if (Array.isArray(response.data)) {
      return { count: response.data.length, results: response.data };
    }
    return response.data;
  },

  getStats: async () => {
    const response = await apiClient.get<{
      total_deals: number;
      total_volume: number;
      total_brokerage: number;
      total_brokerage_received: number;
      pending_brokerage: number;
      total_bags: number;
    }>('/deals/stats/');
    return response.data;
  },

  getBrokerageLedger: async () => {
    const response = await apiClient.get<BrokerageLedgerResponse>('/deals/brokerage_ledger/');
    return response.data;
  },

  recordBrokeragePayment: async (dealId: number, data: {
    amount: number;
    paid_by: 'SELLER' | 'BUYER';
    payment_date?: string;
    payment_mode?: string;
    reference_number?: string;
    collected_by?: string;
    notes?: string;
  }) => {
    const response = await apiClient.post<{
      success: boolean;
      message: string;
      brokerage_received: number;
      brokerage_status: string;
      payment: BrokeragePayment;
    }>(`/deals/${dealId}/record_brokerage_payment/`, data);
    return response.data;
  },

  createDeal: async (data: Partial<Deal>) => {
    const response = await apiClient.post<Deal>('/deals/', data);
    return response.data;
  },

  updateDeal: async (id: number, data: Partial<Deal>) => {
    const response = await apiClient.patch<Deal>(`/deals/${id}/`, data);
    return response.data;
  },

  deleteDeal: async (id: number) => {
    await apiClient.delete(`/deals/${id}/`);
  },

  exportExcel: (params?: Record<string, any>) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '' && v !== 'ALL') {
          query.append(k, String(v));
        }
      });
    }
    const token = localStorage.getItem('access_token');
    // Direct link trigger or fetch with auth header
    const url = `/api/deals/export_excel/?${query.toString()}`;
    window.open(url, '_blank');
  },
};
