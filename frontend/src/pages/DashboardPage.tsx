import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Users2,
  Package,
  ShieldCheck,
  UserCheck,
  Plus,
  TrendingUp,
  Handshake,
  IndianRupee,
  FileSpreadsheet,
  ArrowRight,
} from 'lucide-react';
import { apiClient } from '@/api/client';
import { DashboardStats, Category, Seller } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { formatRelativeTime } from '@/lib/utils';
import { toast } from 'sonner';

import { CompanyModal } from '@/components/company/CompanyModal';
import { ProductModal } from '@/components/product/ProductModal';
import { StaffModal } from '@/components/staff/StaffModal';

export const DashboardPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Quick Action Modal states
  const [isSellerModalOpen, setIsSellerModalOpen] = useState(false);
  const [isBuyerModalOpen, setIsBuyerModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);

  // Dropdown data for product modal
  const [categories, setCategories] = useState<Category[]>([]);
  const [sellersList, setSellersList] = useState<Seller[]>([]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<DashboardStats>('/dashboard/stats/');
      setData(res.data);
    } catch (err) {
      console.error('Failed to load dashboard statistics:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuxData = async () => {
    try {
      const [catRes, selRes] = await Promise.all([
        apiClient.get<Category[]>('/categories/'),
        apiClient.get<{ results: Seller[] }>('/sellers/?page_size=100'),
      ]);
      setCategories(catRes.data);
      setSellersList(selRes.data.results || []);
    } catch (err) {
      console.error('Failed to load auxiliary data:', err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchAuxData();
  }, []);

  const handleCreateSeller = async (formData: any) => {
    try {
      await apiClient.post('/sellers/', formData);
      toast.success('Seller added successfully!');
      setIsSellerModalOpen(false);
      fetchDashboardData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to create seller');
    }
  };

  const handleCreateBuyer = async (formData: any) => {
    try {
      await apiClient.post('/buyers/', formData);
      toast.success('Buyer added successfully!');
      setIsBuyerModalOpen(false);
      fetchDashboardData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to create buyer');
    }
  };

  const handleCreateProduct = async (formData: FormData) => {
    try {
      await apiClient.post('/products/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Product added successfully!');
      setIsProductModalOpen(false);
      fetchDashboardData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to create product');
    }
  };

  const handleCreateStaff = async (formData: any) => {
    try {
      await apiClient.post('/staff/', formData);
      toast.success('Staff member added successfully!');
      setIsStaffModalOpen(false);
      fetchDashboardData();
    } catch (err: any) {
      toast.error(err.response?.data?.email?.[0] || 'Failed to add staff member');
    }
  };

  const stats = data?.stats;

  return (
    <div className="space-y-6">
      {/* Top Header Row matching screenshot */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[26px] font-bold font-heading text-slate-900 tracking-tight">
            Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Welcome back! Here's an overview of your business.
          </p>
        </div>

        {/* Quick Action Buttons matching screenshot */}
        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <button
              onClick={() => setIsSellerModalOpen(true)}
              className="px-3.5 py-2 bg-[#0B3B24] hover:bg-[#14532D] text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus size={14} />
              <span>Add Seller</span>
            </button>

            <button
              onClick={() => setIsBuyerModalOpen(true)}
              className="px-3.5 py-2 bg-[#CA8A04] hover:bg-[#B47804] text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus size={14} />
              <span>Add Buyer</span>
            </button>

            <button
              onClick={() => setIsProductModalOpen(true)}
              className="px-3.5 py-2 bg-white hover:bg-amber-50/40 text-[#CA8A04] border border-[#CA8A04] rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus size={14} />
              <span>Add Product</span>
            </button>

            <button
              onClick={() => setIsStaffModalOpen(true)}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus size={14} />
              <span>Add Staff</span>
            </button>
          </div>
        )}
      </div>

      {/* Row 1: 5 KPI Stat Cards matching screenshot */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Total Sellers */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-subtle hover:shadow-card transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Sellers</span>
            <div className="w-8.5 h-8.5 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Building2 size={17} />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-3xl font-heading font-extrabold text-slate-900 tracking-tight">
              {stats?.total_sellers ?? 0}
            </span>
          </div>
          <p className="mt-2 text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
            <TrendingUp size={12} />
            <span>{stats?.sellers_growth || '+12% from last month'}</span>
          </p>
        </div>

        {/* Total Buyers */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-subtle hover:shadow-card transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Buyers</span>
            <div className="w-8.5 h-8.5 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Users2 size={17} />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-3xl font-heading font-extrabold text-slate-900 tracking-tight">
              {stats?.total_buyers ?? 0}
            </span>
          </div>
          <p className="mt-2 text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
            <TrendingUp size={12} />
            <span>{stats?.buyers_growth || '+8% from last month'}</span>
          </p>
        </div>

        {/* Total Products */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-subtle hover:shadow-card transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Products</span>
            <div className="w-8.5 h-8.5 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Package size={17} />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-3xl font-heading font-extrabold text-slate-900 tracking-tight">
              {stats?.total_products ?? 0}
            </span>
          </div>
          <p className="mt-2 text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
            <TrendingUp size={12} />
            <span>{stats?.products_growth || '+15% from last month'}</span>
          </p>
        </div>

        {/* Total Staff */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-subtle hover:shadow-card transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Staff</span>
            <div className="w-8.5 h-8.5 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShieldCheck size={17} />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-3xl font-heading font-extrabold text-slate-900 tracking-tight">
              {stats?.total_staff ?? 0}
            </span>
          </div>
          <p className="mt-2 text-[11px] font-semibold text-blue-600 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span>{stats?.active_staff ?? 0} Active</span>
          </p>
        </div>

        {/* Active Staff */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-subtle hover:shadow-card transition-shadow col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Active Staff</span>
            <div className="w-8.5 h-8.5 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <UserCheck size={17} />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-3xl font-heading font-extrabold text-slate-900 tracking-tight">
              {stats?.active_staff ?? 0}
            </span>
          </div>
          <p className="mt-2 text-[11px] font-semibold text-emerald-600 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>{stats?.staff_active_percentage || '83% active'}</span>
          </p>
        </div>
      </div>


      {/* Brokerage & Sauda Operations Performance Row */}
      <div className="bg-gradient-to-r from-[#062616] via-[#0d3f25] to-[#125833] rounded-2xl p-4 sm:p-5 text-white shadow-md border border-emerald-800/40 my-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 mb-3.5 border-b border-emerald-700/50 gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-400 text-slate-900 flex items-center justify-center font-bold">
              <Handshake size={18} />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base text-white tracking-tight">
                Brokerage Mediation & Deal Operations
              </h3>
              <p className="text-xs text-emerald-200/90">
                Live cattlefeed sauda contracts, trade volumes, and recovery tracking
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/deals"
              className="px-3 py-1.5 bg-emerald-800/80 hover:bg-emerald-700 text-xs font-semibold rounded-lg text-emerald-100 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <span>Book Sauda</span>
              <ArrowRight size={13} />
            </Link>
            <Link
              to="/statements"
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-xs font-bold rounded-lg text-slate-950 transition-colors flex items-center gap-1.5"
            >
              <span>Upload Statement</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/10">
            <p className="text-[11px] font-medium text-emerald-200">Deals Booked</p>
            <p className="text-2xl font-bold font-heading text-white mt-0.5">
              {stats?.total_deals ?? 0}
            </p>
            <p className="text-[10px] text-emerald-300 mt-0.5">
              {stats?.total_bags?.toLocaleString('en-IN') ?? 0} Bags Traded
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/10">
            <p className="text-[11px] font-medium text-emerald-200">Trade Volume</p>
            <p className="text-2xl font-bold font-heading text-white mt-0.5">
              ₹{(stats?.total_volume ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-[10px] text-emerald-300 mt-0.5">Total Deal Value</p>
          </div>

          <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/10">
            <p className="text-[11px] font-medium text-emerald-200">Brokerage Earned</p>
            <p className="text-2xl font-bold font-heading text-amber-300 mt-0.5">
              ₹{(stats?.total_brokerage ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-[10px] text-emerald-300 mt-0.5">Jalaram Commission</p>
          </div>

          <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/10">
            <p className="text-[11px] font-medium text-emerald-200">Outstanding Recovery</p>
            <p className="text-2xl font-bold font-heading text-rose-300 mt-0.5">
              ₹{(stats?.total_balance ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
            <Link to="/recoveries" className="text-[10px] text-amber-200 hover:underline mt-0.5 block">
              View Recovery Ledger →
            </Link>
          </div>
        </div>
      </div>

      {/* Row 2: 3-Column Recent Data Tables (Recent Sellers, Recent Buyers, Recent Products) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4.5 items-stretch">
        {/* 1. Recent Sellers Box */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-subtle flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5">
              <h3 className="font-heading font-bold text-base text-slate-900 tracking-tight">
                Recent Sellers
              </h3>
              <Link
                to="/sellers"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
              >
                View All
              </Link>
            </div>

            {/* Table Header Bar */}
            <div className="grid grid-cols-12 gap-2 bg-slate-50/90 rounded-xl px-3 py-2 text-[11px] font-semibold text-slate-500 mb-1.5 border border-slate-100">
              <span className="col-span-6 truncate">Company Name</span>
              <span className="col-span-3 text-slate-600 truncate">Phone</span>
              <span className="col-span-3 text-right truncate">Added On</span>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-slate-100">
              {(data?.recent_sellers || []).slice(0, 5).map((seller, idx) => {
                const avatarBg =
                  idx % 3 === 0
                    ? 'bg-emerald-50 text-emerald-700'
                    : idx % 3 === 1
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-blue-50 text-blue-700';

                return (
                  <div
                    key={seller.id}
                    className="grid grid-cols-12 gap-2 items-center py-2.5 px-1 hover:bg-slate-50/50 rounded-lg transition-colors text-xs"
                  >
                    {/* Company Name + Avatar */}
                    <div className="col-span-6 flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${avatarBg}`}
                      >
                        {seller.company_name.charAt(0)}
                      </div>
                      <span
                        className="font-semibold text-slate-800 truncate"
                        title={seller.company_name}
                      >
                        {seller.company_name}
                      </span>
                    </div>

                    {/* Phone */}
                    <span className="col-span-3 font-bold text-slate-900 truncate tracking-tight text-[11.5px]">
                      {seller.phone || '—'}
                    </span>

                    {/* Added On */}
                    <span className="col-span-3 text-right text-[11px] text-slate-400 font-medium truncate">
                      {formatRelativeTime(seller.created_at)}
                    </span>
                  </div>
                );
              })}

              {(!data?.recent_sellers || data.recent_sellers.length === 0) && (
                <div className="py-8 text-center text-xs text-slate-400">
                  No sellers registered yet.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 2. Recent Buyers Box */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-subtle flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5">
              <h3 className="font-heading font-bold text-base text-slate-900 tracking-tight">
                Recent Buyers
              </h3>
              <Link
                to="/buyers"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
              >
                View All
              </Link>
            </div>

            {/* Table Header Bar */}
            <div className="grid grid-cols-12 gap-2 bg-slate-50/90 rounded-xl px-3 py-2 text-[11px] font-semibold text-slate-500 mb-1.5 border border-slate-100">
              <span className="col-span-6 truncate">Company Name</span>
              <span className="col-span-3 text-slate-600 truncate">Phone</span>
              <span className="col-span-3 text-right truncate">Added On</span>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-slate-100">
              {(data?.recent_buyers || []).slice(0, 5).map((buyer, idx) => {
                const avatarBg =
                  idx % 4 === 0
                    ? 'bg-rose-50 text-rose-600'
                    : idx % 4 === 1
                    ? 'bg-amber-50 text-amber-700'
                    : idx % 4 === 2
                    ? 'bg-blue-50 text-blue-600'
                    : 'bg-emerald-50 text-emerald-700';

                return (
                  <div
                    key={buyer.id}
                    className="grid grid-cols-12 gap-2 items-center py-2.5 px-1 hover:bg-slate-50/50 rounded-lg transition-colors text-xs"
                  >
                    {/* Company Name + Avatar */}
                    <div className="col-span-6 flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${avatarBg}`}
                      >
                        {buyer.company_name.charAt(0)}
                      </div>
                      <span
                        className="font-semibold text-slate-800 truncate"
                        title={buyer.company_name}
                      >
                        {buyer.company_name}
                      </span>
                    </div>

                    {/* Phone */}
                    <span className="col-span-3 font-bold text-slate-900 truncate tracking-tight text-[11.5px]">
                      {buyer.phone || '—'}
                    </span>

                    {/* Added On */}
                    <span className="col-span-3 text-right text-[11px] text-slate-400 font-medium truncate">
                      {formatRelativeTime(buyer.created_at)}
                    </span>
                  </div>
                );
              })}

              {(!data?.recent_buyers || data.recent_buyers.length === 0) && (
                <div className="py-8 text-center text-xs text-slate-400">
                  No buyers registered yet.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3. Recent Products Box */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-subtle flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5">
              <h3 className="font-heading font-bold text-base text-slate-900 tracking-tight">
                Recent Products
              </h3>
              <Link
                to="/products"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
              >
                View All
              </Link>
            </div>

            {/* Table Header Bar */}
            <div className="grid grid-cols-12 gap-2 bg-slate-50/90 rounded-xl px-3 py-2 text-[11px] font-semibold text-slate-500 mb-1.5 border border-slate-100">
              <span className="col-span-6 truncate">Product Name</span>
              <span className="col-span-3 text-slate-600 truncate">Category</span>
              <span className="col-span-3 text-right truncate">Added On</span>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-slate-100">
              {(data?.recent_products || []).slice(0, 5).map((product: any) => (
                <div
                  key={product.id}
                  className="grid grid-cols-12 gap-2 items-center py-2.5 px-1 hover:bg-slate-50/50 rounded-lg transition-colors text-xs"
                >
                  {/* Product Image / Icon + Name */}
                  <div className="col-span-6 flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200/70">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 bg-amber-50/60 text-amber-700">
                          <Package size={13} />
                        </div>
                      )}
                    </div>
                    <span
                      className="font-semibold text-slate-800 truncate"
                      title={product.name}
                    >
                      {product.name}
                    </span>
                  </div>

                  {/* Category */}
                  <span className="col-span-3 text-slate-600 truncate text-[11.5px] font-medium">
                    {product.category__name || 'Cattle Feed'}
                  </span>

                  {/* Added On */}
                  <span className="col-span-3 text-right text-[11px] text-slate-400 font-medium truncate">
                    {formatRelativeTime(product.created_at)}
                  </span>
                </div>
              ))}

              {(!data?.recent_products || data.recent_products.length === 0) && (
                <div className="py-8 text-center text-xs text-slate-400">
                  No products registered yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Modals */}
      <CompanyModal
        isOpen={isSellerModalOpen}
        onClose={() => setIsSellerModalOpen(false)}
        onSubmit={handleCreateSeller}
        type="seller"
      />

      <CompanyModal
        isOpen={isBuyerModalOpen}
        onClose={() => setIsBuyerModalOpen(false)}
        onSubmit={handleCreateBuyer}
        type="buyer"
      />

      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        onSubmit={handleCreateProduct}
        categories={categories}
        sellers={sellersList}
        onCategoryCreated={(cat) => setCategories([...categories, cat])}
      />

      <StaffModal
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
        onSubmit={handleCreateStaff}
      />
    </div>
  );
};
