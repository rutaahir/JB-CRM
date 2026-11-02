import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { apiClient } from '@/api/client';
import { Seller, PaginatedResponse } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { CompanyTable } from '@/components/company/CompanyTable';
import { CompanyModal } from '@/components/company/CompanyModal';
import { CompanyViewModal } from '@/components/company/CompanyViewModal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/utils';

export const SellersPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [sellers, setSellers] = useState<Seller[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
  const [viewSeller, setViewSeller] = useState<Seller | null>(null);
  const [sellerToDelete, setSellerToDelete] = useState<Seller | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchSellers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', String(currentPage));
      params.append('page_size', String(pageSize));
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }

      const res = await apiClient.get<PaginatedResponse<Seller>>(`/sellers/?${params.toString()}`);
      setSellers(res.data.results);
      setTotalCount(res.data.count);
    } catch (err) {
      console.error('Failed to load sellers:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchQuery]);

  useEffect(() => {
    fetchSellers();
  }, [fetchSellers]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    setSearchParams(searchQuery ? { search: searchQuery } : {});
    fetchSellers();
  };

  const handleSaveSeller = async (formData: any) => {
    try {
      setActionLoading(true);
      if (selectedSeller) {
        await apiClient.put(`/sellers/${selectedSeller.id}/`, formData);
        toast.success(`Seller "${formData.company_name}" updated!`);
      } else {
        await apiClient.post('/sellers/', formData);
        toast.success(`Seller "${formData.company_name}" added!`);
      }
      setIsModalOpen(false);
      setSelectedSeller(null);
      fetchSellers();
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Failed to save seller company'), { id: 'seller-save-error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!sellerToDelete) return;
    try {
      setActionLoading(true);
      await apiClient.delete(`/sellers/${sellerToDelete.id}/`);
      toast.success(`Seller "${sellerToDelete.company_name}" deleted.`);
      setSellerToDelete(null);
      fetchSellers();
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Failed to delete seller.'), { id: 'seller-delete-error' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Page Header matching screenshot */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-slate-900">Sellers</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage all supplier companies</p>
        </div>

        {isAdmin && (
          <button
            onClick={() => {
              setSelectedSeller(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2.5 bg-[#0B3B24] hover:bg-[#14532D] text-white rounded-xl text-xs font-semibold shadow-sm flex items-center justify-center gap-2 transition-all self-start sm:self-auto"
          >
            <Plus size={16} />
            <span>Add Company</span>
          </button>
        )}
      </div>

      {/* Search Bar matching screenshot */}
      <form onSubmit={handleSearchSubmit} className="relative max-w-md">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by company name, phone, email..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-forest-800/20 focus:border-forest-700 shadow-subtle transition-all"
        />
      </form>

      {/* Reusable Company Table */}
      <CompanyTable
        data={sellers}
        totalCount={totalCount}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={(page) => setCurrentPage(page)}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setCurrentPage(1);
        }}
        onView={(item) => setViewSeller(item as Seller)}
        onEdit={(item) => {
          setSelectedSeller(item as Seller);
          setIsModalOpen(true);
        }}
        onDelete={(item) => setSellerToDelete(item as Seller)}
        isLoading={loading}
      />

      {/* Add / Edit Modal */}
      <CompanyModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedSeller(null);
        }}
        onSubmit={handleSaveSeller}
        type="seller"
        initialData={selectedSeller}
        isLoading={actionLoading}
      />

      {/* View Modal */}
      <CompanyViewModal
        isOpen={!!viewSeller}
        onClose={() => setViewSeller(null)}
        company={viewSeller}
        type="seller"
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!sellerToDelete}
        onClose={() => setSellerToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Seller Company"
        message={`Are you sure you want to delete "${sellerToDelete?.company_name}"? This action cannot be undone.`}
        isLoading={actionLoading}
      />
    </div>
  );
};

