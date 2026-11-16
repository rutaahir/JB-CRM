import { apiClient } from './client';
import { Product } from '@/types';

export interface ProductsResponse {
  count: number;
  results: Product[];
}

export const productsApi = {
  getProducts: async (params?: {
    search?: string;
    is_active?: boolean;
    ordering?: string;
  }): Promise<Product[]> => {
    const res = await apiClient.get<any>('/products/', { params });
    if (Array.isArray(res.data)) {
      return res.data;
    }
    return res.data?.results || [];
  },

  getProduct: async (id: number): Promise<Product> => {
    const res = await apiClient.get<Product>(`/products/${id}/`);
    return res.data;
  },

  createProduct: async (data: { name: string; is_active?: boolean }): Promise<Product> => {
    const res = await apiClient.post<Product>('/products/', data);
    return res.data;
  },

  updateProduct: async (id: number, data: Partial<Product>): Promise<Product> => {
    const res = await apiClient.patch<Product>(`/products/${id}/`, data);
    return res.data;
  },

  toggleProductActive: async (id: number, is_active: boolean): Promise<Product> => {
    const res = await apiClient.patch<Product>(`/products/${id}/`, { is_active });
    return res.data;
  },

  deleteProduct: async (id: number): Promise<void> => {
    await apiClient.delete(`/products/${id}/`);
  },
};
