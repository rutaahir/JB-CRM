import { apiClient } from './client';

export interface LeadCallHistoryItem {
  id: number;
  lead: number;
  call_date: string;
  call_result: string;
  rate_discussed: string;
  remarks: string;
  next_followup_date: string | null;
  staff_name: string;
  created_at: string;
}

export interface LeadItem {
  id: number;
  lead_id: string;
  party_name: string;
  mobile_number: string;
  city_village: string;
  interested_product: string;
  lead_source: string;
  assigned_staff_name: string;
  status: string;
  priority: 'HOT' | 'WARM' | 'COLD';
  next_followup_date: string | null;
  discussed_rate: string | number | null;
  expected_quantity: string;
  remarks: string;
  converted_contact?: number | null;
  converted_contact_name?: string;
  converted_contact_code?: string;
  duplicate_warning?: {
    source: string;
    message: string;
    contact_id?: number;
    contact_name?: string;
    contact_code?: string;
    lead_id?: number;
    lead_name?: string;
  } | null;
  call_history?: LeadCallHistoryItem[];
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface LeadStats {
  total_leads: number;
  today_due: number;
  overdue: number;
  converted: number;
  hot_leads: number;
}

export const leadsApi = {
  getLeads: async (params?: any) => {
    const res = await apiClient.get('/leads/', { params });
    return res.data.results || res.data;
  },

  getStats: async (): Promise<LeadStats> => {
    const res = await apiClient.get('/leads/stats/');
    return res.data;
  },

  getLead: async (id: number): Promise<LeadItem> => {
    const res = await apiClient.get(`/leads/${id}/`);
    return res.data;
  },

  createLead: async (data: Partial<LeadItem>): Promise<LeadItem> => {
    const res = await apiClient.post('/leads/', data);
    return res.data;
  },

  updateLead: async (id: number, data: Partial<LeadItem>): Promise<LeadItem> => {
    const res = await apiClient.patch(`/leads/${id}/`, data);
    return res.data;
  },

  deleteLead: async (id: number) => {
    const res = await apiClient.delete(`/leads/${id}/`);
    return res.data;
  },

  convertToCustomer: async (id: number) => {
    const res = await apiClient.post(`/leads/${id}/convert-to-customer/`);
    return res.data;
  },

  logCall: async (id: number, callData: {
    call_result: string;
    rate_discussed?: string;
    remarks?: string;
    next_followup_date?: string;
    staff_name?: string;
  }) => {
    const res = await apiClient.post(`/leads/${id}/log-call/`, callData);
    return res.data;
  },

  checkDuplicate: async (mobile: string, excludeId?: number) => {
    const res = await apiClient.get('/leads/check-duplicate/', {
      params: { mobile, exclude_id: excludeId },
    });
    return res.data;
  },

  exportExcel: (params?: any) => {
    const token = localStorage.getItem('token');
    const query = new URLSearchParams(params || {}).toString();
    const url = `/api/leads/export_excel/?${query}`;
    
    // Trigger download
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Leads_Report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },
};
