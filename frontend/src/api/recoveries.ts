import { apiClient } from './client';
import { RecoveryRecord, PaymentReceipt, PaginatedResponse } from '../types';

export interface AgingBucket {
  count: number;
  amount: number;
}

export interface RecoveryStatsResponse {
  total_bills: number;
  total_billed: number;
  total_balance: number;
  total_collected: number;
  pending_count: number;
  partial_count: number;
  paid_count: number;
  overdue_count: number;
  overdue_amount: number;
  aging?: {
    bucket_0_15: AgingBucket;
    bucket_16_30: AgingBucket;
    bucket_31_45: AgingBucket;
    bucket_45_plus: AgingBucket;
  };
}

export interface PartyBalanceSummary {
  party_key: string;
  buyer_contact_id: number | null;
  buyer_id: number | null;
  company_name: string;
  city: string;
  phone: string;
  total_billed: number;
  total_paid: number;
  total_balance: number;
  pending_bills_count: number;
  total_bills_count: number;
  oldest_bill_date: string | null;
  max_overdue_days: number;
  last_reminder_sent_at: string | null;
  reminder_count: number;
  bills: Array<{
    id: number;
    bill_number: string;
    bill_date: string;
    seller_name: string;
    billed_amount: number;
    balance_amount: number;
    paid_amount: number;
    status: string;
    overdue_days: number;
    is_overdue: boolean;
  }>;
}

export const recoveriesApi = {
  getRecoveries: async (params?: Record<string, any>) => {
    const response = await apiClient.get<PaginatedResponse<RecoveryRecord> | RecoveryRecord[]>('/recoveries/', { params });
    if (Array.isArray(response.data)) {
      return { count: response.data.length, results: response.data };
    }
    return response.data;
  },

  getPartySummary: async () => {
    const response = await apiClient.get<PartyBalanceSummary[]>('/recoveries/party_summary/');
    return response.data;
  },

  getStats: async () => {
    const response = await apiClient.get<RecoveryStatsResponse>('/recoveries/stats/');
    return response.data;
  },

  recordPayment: async (recoveryId: number, data: {
    amount: number;
    deductions_amount?: number;
    deduction_reason?: string;
    payment_date?: string;
    payment_mode: string;
    reference_number?: string;
    collected_by?: string;
    notes?: string;
  }) => {
    const response = await apiClient.post<{
      success: boolean;
      message: string;
      new_balance: number;
      status: string;
      payment: PaymentReceipt;
    }>(`/recoveries/${recoveryId}/record_payment/`, data);
    return response.data;
  },

  allocatePayment: async (data: {
    buyer_id?: number | string;
    buyer_contact_id?: number | string;
    buyer_name?: string;
    bill_ids?: number[];
    amount: number;
    deductions_amount?: number;
    deduction_reason?: string;
    payment_date?: string;
    payment_mode: string;
    reference_number?: string;
    collected_by?: string;
    notes?: string;
  }) => {
    const response = await apiClient.post<{
      success: boolean;
      message: string;
      unallocated_remaining: number;
      allocated_receipts: Array<{
        bill_id: number;
        bill_number: string;
        allocated_amount: number;
        allocated_deduction: number;
        remaining_balance: number;
        new_status: string;
      }>;
    }>('/recoveries/allocate_payment/', data);
    return response.data;
  },

  logReminder: async (data: { buyer_id?: number | string; bill_ids?: number[] }) => {
    const response = await apiClient.post<{
      success: boolean;
      message: string;
      timestamp: string;
    }>('/recoveries/log_reminder/', data);
    return response.data;
  },

  createRecovery: async (data: Partial<RecoveryRecord>) => {
    const response = await apiClient.post<RecoveryRecord>('/recoveries/', data);
    return response.data;
  },

  updateRecovery: async (id: number, data: Partial<RecoveryRecord>) => {
    const response = await apiClient.patch<RecoveryRecord>(`/recoveries/${id}/`, data);
    return response.data;
  },

  uploadStatement: async (formData: FormData) => {
    const response = await apiClient.post<any>('/statements/upload/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  saveVerifiedRecords: async (statementId: number, data: { records: any[]; target?: string; seller_id?: any }) => {
    const response = await apiClient.post<any>(`/statements/save-verified/${statementId}/`, data);
    return response.data;
  },
};
