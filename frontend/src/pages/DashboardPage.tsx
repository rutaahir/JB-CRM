import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Handshake,
  FileSpreadsheet,
  Building2,
  Users2,
  Clock,
  TrendingUp,
  Package,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  UploadCloud,
  Layers,
  Percent,
} from 'lucide-react';
import { apiClient } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

interface DashboardStatsData {
  stats: {
    total_mills: number;
    total_buyers: number;
    total_contacts: number;
    total_products: number;
    total_staff: number;
    active_staff: number;
    total_deals: number;
    today_deals_count: number;
    total_bags: number;
    total_brokerage: number;
    total_pending_orders: number;
    total_pending_bags: number;
    total_dispatched_bags: number;
    total_mill_orders: number;
    pending_mill_orders: number;
    target_goal_sum: number;
    target_actual_sum: number;
    target_percentage: number;
    total_balance: number;
    total_recovered: number;
  };
  recent_deals: Array<{
    id: number;
    deal_number: string;
    date: string;
    seller_name: string;
    buyer_name: string;
    product_name: string;
    quantity: number;
    quantity_unit: string;
    rate: string;
    rate_unit: string;
    delivery_payment_status: string;
  }>;
  recent_pending_orders: Array<{
    id: number;
    order_date: string;
    company_name: string;
    buyer_name: string;
    city: string;
    product_name: string;
    pending_quantity: number;
    status: string;
    days_pending: number;
  }>;
  recent_products: Array<{
    id: number;
    name: string;
    is_active: boolean;
    created_at: string;
  }>;
}

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardStatsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<DashboardStatsData>('/dashboard/stats/');
      setData(res.data);
    } catch (err) {
      console.error('Failed to load dashboard statistics:', err);
      toast.error('Could not load dashboard statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const stats = data?.stats;

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Welcome Header */}
      <div className="bg-[#062616] border border-[#0d3f25] rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-amber-500/10 to-transparent pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-1 rounded-lg bg-amber-400/20 text-amber-300 font-mono text-xs font-bold uppercase tracking-wider">
                Daily Business Autopilot
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white mt-1.5">
              Welcome back, {user?.name || 'Broker Office'}
            </h1>
            <p className="mt-1 text-xs md:text-sm text-slate-300">
              આજના Rates, Deals, Mill Orders, Pending Orders અને Target Progress એક જ સ્ક્રીન પર.
            </p>
          </div>

          {/* Quick Action Shortcuts */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => navigate('/deals?mode=entry')}
              className="px-3.5 py-2 bg-amber-400 text-[#062616] rounded-xl text-xs font-bold hover:bg-amber-300 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Handshake size={15} />
              <span>+ Sauda Entry [F6]</span>
            </button>
            <button
              onClick={() => navigate('/pending-orders')}
              className="px-3.5 py-2 bg-[#0c4026] text-white border border-[#0d3f25] hover:bg-[#104e2d] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <UploadCloud size={15} className="text-amber-400" />
              <span>Upload Mill PDF</span>
            </button>
            <button
              onClick={fetchDashboardData}
              className="p-2 bg-[#041d10] text-slate-300 hover:text-white rounded-xl border border-[#0d3f25] transition-colors"
              title="Refresh Stats"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* Main KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 md:gap-4">
        {/* Card 1: Today's Deals */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4.5 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1.5 font-semibold">
            <span>Today's Sauda Deals</span>
            <div className="p-1.5 bg-forest-900/10 text-forest-900 rounded-lg">
              <Handshake size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-black text-slate-900">
              {stats?.today_deals_count || 0}
            </p>
            <span className="text-xs text-slate-400 font-medium">deals today</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 flex items-center justify-between">
            <span>Total Sauda: {stats?.total_deals || 0}</span>
            <Link to="/deals?mode=register" className="text-forest-800 font-bold hover:underline">
              View Register →
            </Link>
          </p>
        </div>

        {/* Card 2: Pending Orders */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4.5 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between text-amber-800 text-xs mb-1.5 font-semibold">
            <span>Pending Orders (Mill)</span>
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <Clock size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <p className="text-2xl font-black text-amber-900">
              {stats?.total_pending_bags.toLocaleString() || '0'}
            </p>
            <span className="text-xs font-bold text-amber-700">BAG</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 flex items-center justify-between">
            <span>{stats?.total_pending_orders || 0} active orders</span>
            <Link to="/pending-orders" className="text-amber-800 font-bold hover:underline">
              PDF Register →
            </Link>
          </p>
        </div>

        {/* Card 3: Target Achievement */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4.5 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between text-emerald-800 text-xs mb-1.5 font-semibold">
            <span>Monthly Target Progress</span>
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <Percent size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-black text-emerald-900">
              {stats?.target_percentage || 0}%
            </p>
            <span className="text-xs text-slate-400 font-medium">achieved</span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2.5">
            <div
              className="bg-emerald-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(stats?.target_percentage || 0, 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5">
            Actual: {stats?.target_actual_sum.toLocaleString()} / Goal: {stats?.target_goal_sum.toLocaleString()} BAG
          </p>
        </div>

        {/* Card 4: Contact Master Count */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4.5 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between text-slate-600 text-xs mb-1.5 font-semibold">
            <span>Party Contacts</span>
            <div className="p-1.5 bg-slate-100 text-slate-700 rounded-lg">
              <Users2 size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-black text-slate-900">
              {stats?.total_contacts || 0}
            </p>
            <span className="text-xs text-slate-400 font-medium">parties</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 flex items-center justify-between">
            <span>{stats?.total_mills || 0} Mills • {stats?.total_buyers || 0} Buyers</span>
            <Link to="/contacts/view" className="text-forest-800 font-bold hover:underline">
              View List →
            </Link>
          </p>
        </div>
      </div>

      {/* 2-Column Split: Recent Deals & Active Pending Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Recent Sauda Deals */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3.5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-forest-900/10 text-forest-900 rounded-lg">
                <Handshake size={17} />
              </div>
              <h2 className="text-sm font-bold text-slate-800">Recent Sauda Deals (તાજેતરના સોદા)</h2>
            </div>
            <Link
              to="/deals?mode=register"
              className="text-xs font-bold text-forest-800 hover:text-forest-900 flex items-center gap-1"
            >
              <span>Sauda Register [F7]</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="py-2 px-2.5">Date & Deal No</th>
                  <th className="py-2 px-2.5">Buyer</th>
                  <th className="py-2 px-2.5">Mill / Supplier</th>
                  <th className="py-2 px-2.5 text-right">Quantity</th>
                  <th className="py-2 px-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!data?.recent_deals?.length ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      No deals booked yet. Click "+ Sauda Entry" to record your first deal.
                    </td>
                  </tr>
                ) : (
                  data.recent_deals.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-2.5">
                        <p className="font-bold text-slate-800">{d.deal_number}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{d.date}</p>
                      </td>
                      <td className="py-2.5 px-2.5 font-semibold text-slate-700">{d.buyer_name}</td>
                      <td className="py-2.5 px-2.5 text-slate-600">{d.seller_name}</td>
                      <td className="py-2.5 px-2.5 text-right font-mono font-bold text-slate-800">
                        {d.quantity} {d.quantity_unit}
                      </td>
                      <td className="py-2.5 px-2.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            d.delivery_payment_status === 'Done'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {d.delivery_payment_status || 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Mill-wise Pending Commitments */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3.5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
                <Clock size={17} />
              </div>
              <h2 className="text-sm font-bold text-slate-800">
                Active Pending Orders (પેન્ડિંગ ઓર્ડર સ્થિતિ)
              </h2>
            </div>
            <Link
              to="/pending-orders"
              className="text-xs font-bold text-amber-800 hover:text-amber-900 flex items-center gap-1"
            >
              <span>PDF Extractor</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="py-2 px-2.5">Date</th>
                  <th className="py-2 px-2.5">Company / Mill</th>
                  <th className="py-2 px-2.5">Buyer</th>
                  <th className="py-2 px-2.5 text-right">Pending</th>
                  <th className="py-2 px-2.5 text-center">Aging</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!data?.recent_pending_orders?.length ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      No pending orders. Upload a Mill PDF report to start tracking.
                    </td>
                  </tr>
                ) : (
                  data.recent_pending_orders.map((po) => (
                    <tr key={po.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-2.5 font-mono text-slate-500 whitespace-nowrap">
                        {po.order_date}
                      </td>
                      <td className="py-2.5 px-2.5 font-bold text-slate-800">
                        {po.company_name}
                      </td>
                      <td className="py-2.5 px-2.5">
                        <p className="font-semibold text-slate-700">{po.buyer_name}</p>
                        {po.city && <p className="text-[10px] text-slate-400">{po.city}</p>}
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono font-bold text-amber-800">
                        {po.pending_quantity.toLocaleString()} BAG
                      </td>
                      <td className="py-2.5 px-2.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            po.days_pending > 30
                              ? 'bg-rose-100 text-rose-800'
                              : po.days_pending > 15
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {po.days_pending}d
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
