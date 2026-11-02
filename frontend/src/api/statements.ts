import { apiClient } from './client';
import { StatementUploadResponse, UploadedStatementHistory, PartyAlias } from '../types';

export const statementsApi = {
  uploadPdf: async (file: File, sellerId?: number | null) => {
    const formData = new FormData();
    formData.append('file', file);
    if (sellerId) {
      formData.append('seller_id', sellerId.toString());
    }

    const response = await apiClient.post<StatementUploadResponse>('/statements/upload/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  saveVerified: async (statementId: number, payload: {
    records: any[];
    seller_id?: number | null;
    target?: 'AUTO' | 'DEALS' | 'RECOVERIES';
  }) => {
    const response = await apiClient.post<{
      success: boolean;
      saved_deals: number;
      saved_recoveries: number;
      skipped: number;
      message: string;
    }>(`/statements/save-verified/${statementId}/`, payload);
    return response.data;
  },

  rollbackStatement: async (statementId: number) => {
    const response = await apiClient.post<{
      success: boolean;
      message: string;
      deals_deleted: number;
      recoveries_deleted: number;
    }>(`/statements/${statementId}/rollback/`);
    return response.data;
  },

  getAliases: async () => {
    const response = await apiClient.get<PartyAlias[]>('/statements/aliases/');
    return response.data;
  },

  createAlias: async (raw_name: string, buyer_id: number) => {
    const response = await apiClient.post<PartyAlias>('/statements/aliases/', {
      raw_name,
      buyer_id,
    });
    return response.data;
  },

  getHistory: async () => {
    const response = await apiClient.get<UploadedStatementHistory[]>('/statements/');
    return response.data;
  },
};
