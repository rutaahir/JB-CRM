import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Search,
  ShieldCheck,
  Users2,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertCircle,
  Laptop,
  Phone,
  Mail,
  ShieldAlert,
} from 'lucide-react';
import { apiClient } from '@/api/client';
import { User, StaffLoginRequest, PaginatedResponse } from '@/types';
import { StaffTable } from '@/components/staff/StaffTable';
import { StaffModal } from '@/components/staff/StaffModal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';

export const StaffPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'STAFF' | 'REQUESTS'>('STAFF');

  // Staff members list
  const [staffList, setStaffList] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Login approval requests
  const [approvalRequests, setApprovalRequests] = useState<StaffLoginRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<User | null>(null);
  const [staffToDelete, setStaffToDelete] = useState<User | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch Staff Members
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

  // Fetch Login Approval Requests
  const fetchApprovalRequests = useCallback(async () => {
    try {
      setRequestsLoading(true);
      const res = await apiClient.get<PaginatedResponse<StaffLoginRequest>>('/staff-login-requests/');
      const items = res.data.results || [];
      setApprovalRequests(items);
      const pending = items.filter((r) => r.status === 'PENDING').length;
      setPendingCount(pending);
    } catch (err) {
      console.error('Failed to load approval requests:', err);
    } finally {
      setRequestsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  useEffect(() => {
    fetchApprovalRequests();
    // Poll for new login approval requests every 3 seconds
    const interval = setInterval(() => {
      fetchApprovalRequests();
    }, 3000);
    return () => clearInterval(interval);
  }, [fetchApprovalRequests]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStaff();
  };

  // Toggle Login Access (Active / Inactive)
  const handleToggleAccess = async (member: User) => {
    const originalState = member.is_active;
    const newState = !originalState;

    setStaffList((prev) =>
      prev.map((s) => (s.id === member.id ? { ...s, is_active: newState } : s))
    );

    toast.info(`Login access for ${member.name} ${newState ? 'enabled' : 'disabled'}.`, {
      duration: 3000,
    });

    try {
      const res = await apiClient.patch(`/staff/${member.id}/toggle-access/`);
      const updatedUser = res.data.user;
      setStaffList((prev) =>
        prev.map((s) => (s.id === member.id ? { ...s, ...updatedUser } : s))
      );
    } catch (err: any) {
      setStaffList((prev) =>
        prev.map((s) => (s.id === member.id ? { ...s, is_active: originalState } : s))
      );
      toast.error(err.response?.data?.detail || 'Failed to update login access.');
    }
  };

  // Toggle Admin Login Approval Requirement
  const handleToggleApproval = async (member: User) => {
    const originalState = member.require_login_approval !== false;
    const newState = !originalState;

    setStaffList((prev) =>
      prev.map((s) => (s.id === member.id ? { ...s, require_login_approval: newState } : s))
    );

    toast.info(
      `Login approval for ${member.name} ${
        newState ? 'enabled (Requires Admin Approval)' : 'disabled (Direct Login Allowed)'
      }.`
    );

    try {
      const res = await apiClient.patch(`/staff/${member.id}/toggle-approval/`);
      const updatedUser = res.data.user;
      setStaffList((prev) =>
        prev.map((s) => (s.id === member.id ? { ...s, ...updatedUser } : s))
      );
    } catch (err: any) {
      setStaffList((prev) =>
        prev.map((s) =>
          s.id === member.id ? { ...s, require_login_approval: originalState } : s
        )
      );
      toast.error(err.response?.data?.detail || 'Failed to update approval requirement.');
    }
  };

  // Save Staff (Create / Update)
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

  // Delete Staff
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

  // Approve Login Request
  const handleApproveRequest = async (id: number) => {
    try {
      const res = await apiClient.post(`/staff-login-requests/${id}/approve/`);
      toast.success(res.data.message || 'Login request approved!');
      fetchApprovalRequests();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to approve request.');
    }
  };

  // Reject Login Request
  const handleRejectRequest = async (id: number) => {
    const reason = window.prompt('Enter rejection reason (optional):', 'Login rejected by Admin') || 'Rejected by Admin';
    try {
      const res = await apiClient.post(`/staff-login-requests/${id}/reject/`, { reason });
      toast.info(res.data.message || 'Login request rejected.');
      fetchApprovalRequests();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to reject request.');
    }
  };

  const pendingRequests = approvalRequests.filter((r) => r.status === 'PENDING');

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Pending Login Approval Notification Banner */}
      {pendingRequests.length > 0 && (
        <div className="bg-amber-500/15 border-2 border-amber-500 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0">
              <Clock size={22} />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-amber-950 flex items-center gap-2">
                <span>{pendingRequests.length} Staff Login Request(s) Waiting for Approval!</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-black uppercase">
                  Action Required
                </span>
              </h2>
              <p className="text-xs text-amber-900/80 mt-0.5">
                Staff: <strong className="font-semibold text-slate-900">{pendingRequests.map(r => r.user_name).join(', ')}</strong> is waiting on the login screen.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {pendingRequests.length === 1 && (
              <>
                <button
                  onClick={() => handleApproveRequest(pendingRequests[0].id)}
                  className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <CheckCircle2 size={14} />
                  <span>Approve ({pendingRequests[0].user_name})</span>
                </button>
                <button
                  onClick={() => handleRejectRequest(pendingRequests[0].id)}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-sm cursor-pointer"
                >
                  <XCircle size={14} />
                  <span>Reject</span>
                </button>
              </>
            )}
            <button
              onClick={() => setActiveTab('REQUESTS')}
              className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              View Requests ({pendingRequests.length}) →
            </button>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-forest-900/10 text-forest-900 text-xs font-bold uppercase tracking-wider">
              Admin Control Panel
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-semibold text-slate-500">Staff & Login Approvals</span>
          </div>
          <h1 className="text-2xl font-bold font-heading text-slate-900 mt-1">
            Staff & Login Management (સ્ટાફ મેનેજમેન્ટ)
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Admin can create staff, toggle login permissions, and approve live login requests.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'STAFF' && (
            <button
              onClick={() => {
                setSelectedStaff(null);
                setIsModalOpen(true);
              }}
              className="px-4 py-2.5 bg-[#0B3B24] hover:bg-[#14532D] text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 transition-all cursor-pointer"
            >
              <Plus size={16} />
              <span>+ Add Staff Member</span>
            </button>
          )}

          <button
            onClick={() => {
              fetchStaff();
              fetchApprovalRequests();
            }}
            className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition-colors cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw size={15} className={loading || requestsLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('STAFF')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'STAFF'
              ? 'bg-[#0B3B24] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Users2 size={15} />
          <span>Staff Accounts ({staffList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('REQUESTS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer relative ${
            activeTab === 'REQUESTS'
              ? 'bg-[#0B3B24] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Clock size={15} />
          <span>Login Approval Requests</span>
          {pendingCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-[#062616]">
              {pendingCount} Pending
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: Staff Accounts */}
      {activeTab === 'STAFF' && (
        <div className="space-y-4">
          {/* Search Input */}
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
            onToggleApproval={handleToggleApproval}
            onEdit={(member) => {
              setSelectedStaff(member);
              setIsModalOpen(true);
            }}
            onDelete={(member) => setStaffToDelete(member)}
            isLoading={loading}
          />
        </div>
      )}

      {/* TAB 2: Login Approval Requests */}
      {activeTab === 'REQUESTS' && (
        <div className="space-y-4">
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-slate-600">
            <div>
              <p className="font-semibold text-slate-800">
                Staff Login Approval Rules (સ્ટાફ લૉગિન મંજૂરી નિયમ):
              </p>
              <p className="text-slate-500 mt-0.5">
                When a staff member enters valid credentials, their request appears below. Click <strong className="text-emerald-700">Approve</strong> to let them into the CRM.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="flex items-center gap-1.5 font-bold text-amber-800 bg-amber-100/70 px-2.5 py-1 rounded-lg">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                {pendingCount} Pending Approvals
              </span>
            </div>
          </div>

          {/* Requests Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-subtle overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4 sm:px-6">Staff Member</th>
                    <th className="py-3.5 px-4">Contact</th>
                    <th className="py-3.5 px-4">Requested Time</th>
                    <th className="py-3.5 px-4">Device / IP</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-center">Admin Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {approvalRequests.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <ShieldCheck size={36} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-sm font-semibold text-slate-700">No login requests recorded yet</p>
                        <p className="text-xs text-slate-400 mt-1">
                          When staff members with "Admin Approval Required" log in, their requests will appear here in real-time.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    approvalRequests.map((req) => (
                      <tr
                        key={req.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          req.status === 'PENDING' ? 'bg-amber-50/40 font-medium' : ''
                        }`}
                      >
                        {/* Staff Name */}
                        <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-forest-100 text-forest-800 font-bold flex items-center justify-center text-xs">
                              {req.user_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{req.user_name}</p>
                              <span className="text-[10px] text-slate-400">Req #{req.id}</span>
                            </div>
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-xs">
                          <p className="text-slate-800 font-medium">{req.user_phone}</p>
                          <p className="text-slate-500 text-[11px]">{req.user_email}</p>
                        </td>

                        {/* Requested Time */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-600 font-mono">
                          {formatDate(req.created_at)}
                        </td>

                        {/* Device / IP */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-500">
                          <div className="flex items-center gap-1.5">
                            <Laptop size={13} className="text-slate-400" />
                            <span className="font-mono">{req.ip_address || '127.0.0.1'}</span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                              req.status === 'APPROVED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : req.status === 'REJECTED'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-900 animate-pulse'
                            }`}
                          >
                            {req.status === 'APPROVED' && <CheckCircle2 size={13} />}
                            {req.status === 'REJECTED' && <XCircle size={13} />}
                            {req.status === 'PENDING' && <Clock size={13} />}
                            <span>{req.status}</span>
                          </span>
                        </td>

                        {/* Action */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {req.status === 'PENDING' ? (
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                onClick={() => handleApproveRequest(req.id)}
                                className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                              >
                                <CheckCircle2 size={13} />
                                <span>Approve</span>
                              </button>
                              <button
                                onClick={() => handleRejectRequest(req.id)}
                                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                              >
                                <XCircle size={13} />
                                <span>Reject</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400">
                              {req.reviewed_by_name ? `Reviewed by ${req.reviewed_by_name}` : 'Completed'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

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

export default StaffPage;
