import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search } from 'lucide-react';
import { apiClient } from '@/api/client';
import { User, PaginatedResponse } from '@/types';
import { StaffTable } from '@/components/staff/StaffTable';
import { StaffModal } from '@/components/staff/StaffModal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { toast } from 'sonner';

export const StaffPage: React.FC = () => {
  const [staffList, setStaffList] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<User | null>(null);
  const [staffToDelete, setStaffToDelete] = useState<User | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchStaff = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }
      const res = await apiClient.get<PaginatedResponse<User>>(`/staff/?${params.toString()}`);
      setStaffList(res.data.results || []);
    } catch (err) {
      console.error('Failed to load staff list:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStaff();
  };

  // Instant optimistic UI toggle for Login Access
  const handleToggleAccess = async (member: User) => {
    const originalState = member.is_active;
    const newState = !originalState;

    // 1. Optimistic update in UI immediately
    setStaffList((prev) =>
      prev.map((s) => (s.id === member.id ? { ...s, is_active: newState } : s))
    );

    toast.info(`Login access for ${member.name} ${newState ? 'enabled' : 'disabled'}.`, {
      duration: 3000,
    });

    // 2. Call backend PATCH /staff/{id}/toggle-access/
    try {
      const res = await apiClient.patch(`/staff/${member.id}/toggle-access/`);
      const updatedUser = res.data.user;
      setStaffList((prev) =>
        prev.map((s) => (s.id === member.id ? { ...s, ...updatedUser } : s))
      );
    } catch (err: any) {
      // Revert optimistic update on failure
      setStaffList((prev) =>
        prev.map((s) => (s.id === member.id ? { ...s, is_active: originalState } : s))
      );
      toast.error(err.response?.data?.detail || 'Failed to update login access.');
    }
  };

  const handleSaveStaff = async (formData: any) => {
    try {
      setActionLoading(true);
      if (selectedStaff) {
        await apiClient.put(`/staff/${selectedStaff.id}/`, formData);
        toast.success(`Staff member "${formData.name}" updated!`);
      } else {
        await apiClient.post('/staff/', formData);
        toast.success(`Staff member "${formData.name}" created!`);
      }
      setIsModalOpen(false);
      setSelectedStaff(null);
      fetchStaff();
    } catch (err: any) {
      const msg =
        err.response?.data?.email?.[0] ||
        err.response?.data?.phone?.[0] ||
        err.response?.data?.detail ||
        'Failed to save staff member.';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!staffToDelete) return;
    try {
      setActionLoading(true);
      await apiClient.delete(`/staff/${staffToDelete.id}/`);
      toast.success(`Staff member "${staffToDelete.name}" removed.`);
      setStaffToDelete(null);
      fetchStaff();
    } catch (err) {
      toast.error('Failed to remove staff member.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Page Header matching screenshot */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-slate-900">Staff</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage staff members and their login access</p>
        </div>

        <button
          onClick={() => {
            setSelectedStaff(null);
            setIsModalOpen(true);
          }}
          className="px-4 py-2.5 bg-[#0B3B24] hover:bg-[#14532D] text-white rounded-xl text-xs font-semibold shadow-sm flex items-center justify-center gap-2 transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus size={16} />
          <span>Add Staff</span>
        </button>
      </div>

      {/* Search Input matching screenshot */}
      <form onSubmit={handleSearchSubmit} className="relative max-w-md">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search staff by name, phone or email..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-forest-800/20 focus:border-forest-700 shadow-subtle transition-all"
        />
      </form>

      {/* Staff Table */}
      <StaffTable
        staff={staffList}
        onToggleAccess={handleToggleAccess}
        onEdit={(member) => {
          setSelectedStaff(member);
          setIsModalOpen(true);
        }}
        onDelete={(member) => setStaffToDelete(member)}
        isLoading={loading}
      />

      {/* Add / Edit Staff Modal */}
      <StaffModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedStaff(null);
        }}
        onSubmit={handleSaveStaff}
        initialData={selectedStaff}
        isLoading={actionLoading}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!staffToDelete}
        onClose={() => setStaffToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Remove Staff Access"
        message={`Are you sure you want to delete "${staffToDelete?.name}"? They will permanently lose access to the portal.`}
        isLoading={actionLoading}
      />
    </div>
  );
};

