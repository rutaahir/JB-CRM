import { apiClient } from './client';
import { Contact, PartyType } from '@/types';

export interface ContactsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Contact[];
}

export const contactsApi = {
  getContacts: async (params?: {
    search?: string;
    party_type?: PartyType | string;
    city?: string;
    is_active?: boolean;
    page?: number;
    page_size?: number;
  }): Promise<ContactsResponse> => {
    const res = await apiClient.get<ContactsResponse>('/contacts/', { params });
    // Normalize response if direct array or paginated
    if (Array.isArray(res.data)) {
      return {
        count: res.data.length,
        next: null,
        previous: null,
        results: res.data,
      };
    }
    return res.data;
  },

  getAllContactsList: async (): Promise<Contact[]> => {
    const res = await apiClient.get<any>('/contacts/?page_size=1000');
    return Array.isArray(res.data) ? res.data : (res.data.results || []);
  },

  getContact: async (id: number): Promise<Contact> => {
    const res = await apiClient.get<Contact>(`/contacts/${id}/`);
    return res.data;
  },

  createContact: async (data: Partial<Contact>): Promise<Contact> => {
    const res = await apiClient.post<Contact>('/contacts/', data);
    return res.data;
  },

  updateContact: async (id: number, data: Partial<Contact>): Promise<Contact> => {
    const res = await apiClient.put<Contact>(`/contacts/${id}/`, data);
    return res.data;
  },

  deleteContact: async (id: number): Promise<void> => {
    await apiClient.delete(`/contacts/${id}/`);
  },

  getNextCode: async (party_type: PartyType = 'BUYER'): Promise<string> => {
    const res = await apiClient.get<{ next_code: string }>('/contacts/next-code/', {
      params: { party_type },
    });
    return res.data.next_code;
  },

  checkMobile: async (
    mobile: string,
    excludeId?: number
  ): Promise<{ is_duplicate: boolean; message?: string; existing_id?: number; existing_name?: string; existing_code?: string }> => {
    const res = await apiClient.get<any>('/contacts/check-mobile/', {
      params: { mobile, exclude_id: excludeId },
    });
    return res.data;
  },

  getNavRecords: async (
    code?: string
  ): Promise<{ first_id: number | null; prev_id: number | null; next_id: number | null; last_id: number | null }> => {
    const res = await apiClient.get<any>('/contacts/nav-records/', {
      params: { code },
    });
    return res.data;
  },
};
