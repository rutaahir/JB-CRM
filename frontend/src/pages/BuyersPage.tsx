import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { apiClient } from '@/api/client';
import { Buyer, PaginatedResponse } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { CompanyTable } from '@/components/company/CompanyTable';
import { CompanyModal } from '@/components/company/CompanyModal';
import { CompanyViewModal } from '@/components/company/CompanyViewModal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/utils';

export const BuyersPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBuyer, setSelectedBuyer] = useState<Buyer | null>(null);
  const [viewBuyer, setViewBuyer] = useState<Buyer | null>(null);
  const [buyerToDelete, setBuyerToDelete] = useState<Buyer | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchBuyers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', String(currentPage));
      params.append('page_size', String(pageSize));
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }

      const res = await apiClient.get<PaginatedResponse<Buyer>>(`/buyers/?${params.toString()}`);
      setBuyers(res.data.results);
      setTotalCount(res.data.count);
    } catch (err) {
      console.error('Failed to load buyers:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchQuery]);

  useEffect(() => {
    fetchBuyers();
  }, [fetchBuyers]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    setSearchParams(searchQuery ? { search: searchQuery } : {});
    fetchBuyers();
  };

  const handleSaveBuyer = async (formData: any) => {
    try {
      setActionLoading(true);
      if (selectedBuyer) {
        await apiClient.put(`/buyers/${selectedBuyer.id}/`, formData);
        toast.success(`Buyer "${formData.company_name}" updated!`);
      } else {
        await apiClient.post('/buyers/', formData);
        toast.success(`Buyer "${formData.company_name}" added!`);
      }
      setIsModalOpen(false);
      setSelectedBuyer(null);
      fetchBuyers();
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Failed to save buyer company'), { id: 'buyer-save-error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!buyerToDelete) return;
    try {
      setActionLoading(true);
      await apiClient.delete(`/buyers/${buyerToDelete.id}/`);
      toast.success(`Buyer "${buyerToDelete.company_name}" deleted.`);
      setBuyerToDelete(null);
      fetchBuyers();
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Failed to delete buyer.'), { id: 'buyer-delete-error' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-slate-900">Buyers</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage all buyer companies</p>
        </div>

        {isAdmin && (
          <button
            onClick={() => {
              setSelectedBuyer(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2.5 bg-[#0B3B24] hover:bg-[#14532D] text-white rounded-xl text-xs font-semibold shadow-sm flex items-center justify-center gap-2 transition-all self-start sm:self-auto"
          >
            <Plus size={16} />
            <span>Add Company</span>
          </button>
        )}
      </div>

      {/* Search Bar */}
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
        data={buyers}
        totalCount={totalCount}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={(page) => setCurrentPage(page)}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setCurrentPage(1);
        }}
        onView={(item) => setViewBuyer(item as Buyer)}
        onEdit={(item) => {
          setSelectedBuyer(item as Buyer);
          setIsModalOpen(true);
        }}
        onDelete={(item) => setBuyerToDelete(item as Buyer)}
        isLoading={loading}
      />

      {/* Add / Edit Modal */}
      <CompanyModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedBuyer(null);
        }}
        onSubmit={handleSaveBuyer}
        type="buyer"
        initialData={selectedBuyer}
        isLoading={actionLoading}
      />

      {/* View Modal */}
      <CompanyViewModal
        isOpen={!!viewBuyer}
        onClose={() => setViewBuyer(null)}
        company={viewBuyer}
        type="buyer"
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!buyerToDelete}
        onClose={() => setBuyerToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Buyer Company"
        message={`Are you sure you want to delete "${buyerToDelete?.company_name}"? This action cannot be undone.`}
        isLoading={actionLoading}
      />
    </div>
  );
};

