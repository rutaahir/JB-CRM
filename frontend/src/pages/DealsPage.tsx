import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Handshake,
  Plus,
  Search,
  Filter,
  Trash2,
  Printer,
  TrendingUp,
  FileText,
  IndianRupee,
  Calendar,
  Building2,
  Clock,
  X,
  CreditCard,
  CheckCircle2,
  BookOpen,
  Receipt,
} from 'lucide-react';
import { toast } from 'sonner';
import { dealsApi, BrokerageLedgerResponse } from '@/api/deals';
import { apiClient } from '@/api/client';
import { Deal, Seller, Buyer, Product } from '@/types';
import { cn, getApiErrorMessage } from '@/lib/utils';

export const DealsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'DEALS' | 'BROKERAGE'>('DEALS');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [brokerageFilter, setBrokerageFilter] = useState<string>('ALL');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedDealForChithi, setSelectedDealForChithi] = useState<Deal | null>(null);

  // Brokerage payment modal state
  const [isBrokerageModalOpen, setIsBrokerageModalOpen] = useState(false);
  const [selectedDealForBrokerage, setSelectedDealForBrokerage] = useState<Deal | null>(null);
  const [brokerageForm, setBrokerageForm] = useState({
    amount: '',
    paid_by: 'SELLER' as 'SELLER' | 'BUYER',
    payment_date: new Date().toISOString().split('T')[0],
    payment_mode: 'RTGS',
    reference_number: '',
    collected_by: '',
    notes: '',
  });

  const { data: dealsData, isLoading } = useQuery({
    queryKey: ['deals', statusFilter, brokerageFilter, searchTerm],
    queryFn: () =>
      dealsApi.getDeals({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        brokerage_status: brokerageFilter !== 'ALL' ? brokerageFilter : undefined,
        search: searchTerm || undefined,
      }),
  });

  const { data: stats } = useQuery({
    queryKey: ['deals-stats'],
    queryFn: () => dealsApi.getStats(),
  });

  const { data: ledgerData, isLoading: isLedgerLoading } = useQuery({
    queryKey: ['brokerage-ledger'],
    queryFn: () => dealsApi.getBrokerageLedger(),
    enabled: activeTab === 'BROKERAGE',
  });

  const { data: sellers } = useQuery({
    queryKey: ['sellers-dropdown'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/sellers/');
      return Array.isArray(res.data) ? res.data : (res.data.results as Seller[]);
    },
  });

  const { data: buyers } = useQuery({
    queryKey: ['buyers-dropdown'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/buyers/');
      return Array.isArray(res.data) ? res.data : (res.data.results as Buyer[]);
    },
  });

  const { data: products } = useQuery({
    queryKey: ['products-dropdown'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/products/');
      return Array.isArray(res.data) ? res.data : (res.data.results as Product[]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => dealsApi.deleteDeal(id),
    onSuccess: () => {
      toast.success('Deal deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['deals-stats'] });
      queryClient.invalidateQueries({ queryKey: ['brokerage-ledger'] });
    },
    onError: () => toast.error('Failed to delete deal'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      dealsApi.updateDeal(id, { status: status as any }),
    onSuccess: () => {
      toast.success('Sauda status updated');
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['deals-stats'] });
      queryClient.invalidateQueries({ queryKey: ['brokerage-ledger'] });
    },
  });

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    seller_id: '',
    seller_name: '',
    buyer_id: '',
    buyer_name: '',
    buyer_city: '',
    product_id: '',
    product_name: '',
    packaging: '50 kg Bag',
    quantity: 300,
    rate: 1650,
    rate_unit: 'Per Bag',
    brokerage_type: 'PER_UNIT',
    brokerage_rate: 5,
    brokerage_from: 'SELLER',
    delivery_terms: 'Ex-Mill (Billed by Seller)',
    payment_terms: '10 Days Net',
    notes: '',
  });

  const calculatedGross = (formData.quantity || 0) * (formData.rate || 0);
  const mult = formData.brokerage_from === 'BOTH' ? 2 : 1;
  const calculatedBrokerage =
    formData.brokerage_type === 'PER_UNIT'
      ? (formData.quantity || 0) * (formData.brokerage_rate || 0) * mult
      : (calculatedGross * (formData.brokerage_rate || 0) * mult) / 100;

  const handleSellerChange = (idStr: string) => {
    const s = sellers?.find((item: Seller) => item.id.toString() === idStr);
    setFormData((prev) => ({
      ...prev,
      seller_id: idStr,
      seller_name: s ? s.company_name : '',
    }));
  };

  const handleBuyerChange = (idStr: string) => {
    const b = buyers?.find((item: Buyer) => item.id.toString() === idStr);
    setFormData((prev) => ({
      ...prev,
      buyer_id: idStr,
      buyer_name: b ? b.company_name : '',
      buyer_city: b ? b.address.split(',')[0] || '' : prev.buyer_city,
    }));
  };

  const handleProductChange = (idStr: string) => {
    const p = products?.find((item: Product) => item.id.toString() === idStr);
    setFormData((prev) => ({
      ...prev,
      product_id: idStr,
      product_name: p ? p.name : '',
      packaging: p?.packaging || prev.packaging,
      rate: p?.price ? Number(p.price) : prev.rate,
    }));
  };

  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.seller_name.trim() && !formData.seller_id) {
      toast.error('Seller / Mill: Please select an existing seller or type the seller name.', {
        id: 'deal-form-error',
      });
      return;
    }
    if (!formData.buyer_name.trim() && !formData.buyer_id) {
      toast.error('Buyer / Party: Please select an existing buyer or type the buyer name.', {
        id: 'deal-form-error',
      });
      return;
    }
    if (!formData.product_name.trim() && !formData.product_id) {
      toast.error('Product / Commodity: Please select or enter the item description.', {
        id: 'deal-form-error',
      });
      return;
    }
    if (!formData.quantity || Number(formData.quantity) <= 0) {
      toast.error('Quantity: Please enter a valid quantity of bags (must be greater than 0).', {
        id: 'deal-form-error',
      });
      return;
    }
    if (!formData.rate || Number(formData.rate) <= 0) {
      toast.error('Rate: Please enter a valid rate per bag (must be greater than ₹0).', {
        id: 'deal-form-error',
      });
      return;
    }

    try {
      await dealsApi.createDeal({
        date: formData.date,
        seller: formData.seller_id ? Number(formData.seller_id) : null,
        seller_name: formData.seller_name.trim(),
        buyer: formData.buyer_id ? Number(formData.buyer_id) : null,
        buyer_name: formData.buyer_name.trim(),
        buyer_city: formData.buyer_city.trim(),
        product: formData.product_id ? Number(formData.product_id) : null,
        product_name: formData.product_name.trim(),
        packaging: formData.packaging,
        quantity: Number(formData.quantity),
        rate: Number(formData.rate),
        rate_unit: formData.rate_unit,
        gross_amount: calculatedGross,
        brokerage_type: formData.brokerage_type as any,
        brokerage_rate: Number(formData.brokerage_rate),
        brokerage_from: formData.brokerage_from as any,
        brokerage_total: calculatedBrokerage,
        delivery_terms: formData.delivery_terms,
        payment_terms: formData.payment_terms,
        notes: formData.notes,
        status: 'BOOKED',
      });
      toast.success('Sauda Deal booked successfully!', { id: 'deal-form-success' });
      setIsAddModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['deals-stats'] });
      queryClient.invalidateQueries({ queryKey: ['brokerage-ledger'] });
    } catch (err: any) {
      const errorMsg = getApiErrorMessage(err, 'Failed to create deal. Please verify the entered fields.');
      toast.error(errorMsg, { id: 'deal-form-error', duration: 7000 });
    }
  };

  const handleOpenBrokerageModal = (deal: Deal) => {
    setSelectedDealForBrokerage(deal);
    const pending = Math.max(0, Number(deal.brokerage_total) - Number(deal.brokerage_received || 0));
    setBrokerageForm({
      amount: pending > 0 ? pending.toString() : '',
      paid_by: deal.brokerage_from === 'BUYER' ? 'BUYER' : 'SELLER',
      payment_date: new Date().toISOString().split('T')[0],
      payment_mode: 'RTGS',
      reference_number: '',
      collected_by: '',
      notes: '',
    });
    setIsBrokerageModalOpen(true);
  };

  const handleSaveBrokeragePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDealForBrokerage) return;
    const amt = parseFloat(brokerageForm.amount);
    if (isNaN(amt) || amt <= 0) {
      toast.error('Please enter a valid brokerage amount greater than zero.');
      return;
    }

    try {
      const res = await dealsApi.recordBrokeragePayment(selectedDealForBrokerage.id, {
        amount: amt,
        paid_by: brokerageForm.paid_by,
        payment_date: brokerageForm.payment_date,
        payment_mode: brokerageForm.payment_mode,
        reference_number: brokerageForm.reference_number,
        collected_by: brokerageForm.collected_by,
        notes: brokerageForm.notes,
      });

      if (res.success) {
        toast.success(res.message);
        setIsBrokerageModalOpen(false);
        setSelectedDealForBrokerage(null);
        queryClient.invalidateQueries({ queryKey: ['deals'] });
        queryClient.invalidateQueries({ queryKey: ['deals-stats'] });
        queryClient.invalidateQueries({ queryKey: ['brokerage-ledger'] });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to record brokerage collection.');
    }
  };

  const dealsList: Deal[] = dealsData?.results || [];

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Deals & Sauda Register
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 rounded-full">
              સોદા બુકિંગ & દલાલી
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Jalaram Brokers mediation records, Sauda Chithi generation & brokerage collection ledger
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Tab Switcher */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveTab('DEALS')}
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                activeTab === 'DEALS'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Sauda Deals
            </button>
            <button
              onClick={() => setActiveTab('BROKERAGE')}
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5',
                activeTab === 'BROKERAGE'
                  ? 'bg-white text-emerald-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <IndianRupee size={13} />
              <span>Brokerage Ledger (દલાલી)</span>
            </button>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-sm rounded-xl shadow-xs transition-all shadow-emerald-700/20 hover:shadow-md cursor-pointer"
          >
            <Plus size={18} />
            <span>New Sauda Booking</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Deals Booked
            </p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {stats?.total_deals || 0}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {stats?.total_bags?.toLocaleString('en-IN') || 0} Total Bags Traded
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Handshake size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Trade Volume
            </p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              ₹{(stats?.total_volume || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
              <TrendingUp size={12} /> Total Transaction Value
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <TrendingUp size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Brokerage Earned
            </p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">
              ₹{(stats?.total_brokerage || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              ₹{(stats?.total_brokerage_received || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })} Collected
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <IndianRupee size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Pending Commission
            </p>
            <p className="text-2xl font-bold text-amber-600 mt-1">
              ₹{(stats?.pending_brokerage || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-amber-700/80 mt-1">To be recovered from Mills/Buyers</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Clock size={24} />
          </div>
        </div>
      </div>

      {activeTab === 'DEALS' ? (
        <>
          {/* Deals Search & Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search party, sauda #, city..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                <Filter size={14} /> Filter:
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-emerald-500"
              >
                <option value="ALL">All Deal Statuses</option>
                <option value="BOOKED">Booked</option>
                <option value="DISPATCHED">Dispatched</option>
                <option value="DELIVERED">Delivered</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>

              <select
                value={brokerageFilter}
                onChange={(e) => setBrokerageFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-emerald-500"
              >
                <option value="ALL">All Brokerage Status</option>
                <option value="UNPAID">Brokerage Unpaid</option>
                <option value="PARTIAL">Brokerage Partial</option>
                <option value="PAID">Brokerage Paid</option>
              </select>
            </div>
          </div>

          {/* Deals Register Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-xs font-semibold text-slate-600">
                    <th className="py-3.5 px-4">Sauda # & Date</th>
                    <th className="py-3.5 px-4">Seller / Mill</th>
                    <th className="py-3.5 px-4">Buyer Party (Station)</th>
                    <th className="py-3.5 px-4">Product / Item</th>
                    <th className="py-3.5 px-4 text-right">Qty & Rate</th>
                    <th className="py-3.5 px-4 text-right">Gross Deal Amount</th>
                    <th className="py-3.5 px-4 text-right">Brokerage</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <div className="w-8 h-8 border-3 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin mx-auto mb-2" />
                        Loading Sauda Deals...
                      </td>
                    </tr>
                  ) : dealsList.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <Handshake size={36} className="mx-auto text-slate-300 mb-2" />
                        No deals match the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    dealsList.map((deal) => (
                      <tr key={deal.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-emerald-800 font-mono text-xs">
                            {deal.deal_number}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                            <Calendar size={12} />
                            {deal.date}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-800 font-medium">
                          <div className="flex items-center gap-1.5">
                            <Building2 size={14} className="text-slate-400 shrink-0" />
                            <span>{deal.seller_name}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-800">
                          <div className="font-medium">{deal.buyer_name}</div>
                          {deal.buyer_city && (
                            <span className="text-xs text-slate-400">{deal.buyer_city}</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-slate-700">
                          <div>{deal.product_name}</div>
                          <div className="text-xs text-slate-400">{deal.packaging}</div>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="font-semibold text-slate-900">
                            {deal.quantity} Bags
                          </div>
                          <div className="text-xs text-slate-500">
                            ₹{Number(deal.rate)?.toFixed(2)} / bag
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                          ₹{Number(deal.gross_amount)?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <span className="font-bold text-emerald-700">
                            ₹{Number(deal.brokerage_total)?.toLocaleString('en-IN')}
                          </span>
                          <div className="flex items-center justify-end gap-1.5 mt-0.5">
                            <span
                              className={cn(
                                'text-[10px] font-bold px-1.5 py-0.2 rounded',
                                deal.brokerage_status === 'PAID' && 'bg-emerald-100 text-emerald-800',
                                deal.brokerage_status === 'PARTIAL' && 'bg-amber-100 text-amber-800',
                                deal.brokerage_status === 'UNPAID' && 'bg-slate-100 text-slate-600'
                              )}
                            >
                              {deal.brokerage_status}
                            </span>
                            {deal.brokerage_status !== 'PAID' && (
                              <button
                                onClick={() => handleOpenBrokerageModal(deal)}
                                className="text-[10px] text-emerald-700 hover:underline font-semibold cursor-pointer"
                                title="Record Brokerage Receipt"
                              >
                                + જમા
                              </button>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <select
                            value={deal.status}
                            onChange={(e) =>
                              updateStatusMutation.mutate({ id: deal.id, status: e.target.value })
                            }
                            className={cn(
                              'text-xs font-semibold px-2 py-1 rounded-lg border-0 cursor-pointer focus:ring-1 focus:ring-emerald-500',
                              deal.status === 'BOOKED' && 'bg-blue-100 text-blue-800',
                              deal.status === 'DISPATCHED' && 'bg-amber-100 text-amber-800',
                              deal.status === 'DELIVERED' && 'bg-purple-100 text-purple-800',
                              deal.status === 'COMPLETED' && 'bg-emerald-100 text-emerald-800',
                              deal.status === 'CANCELLED' && 'bg-rose-100 text-rose-800'
                            )}
                          >
                            <option value="BOOKED">Booked</option>
                            <option value="DISPATCHED">Dispatched</option>
                            <option value="DELIVERED">Delivered</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="CANCELLED">Cancelled</option>
                          </select>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setSelectedDealForChithi(deal)}
                              title="Generate Sauda Chithi / Note (સોદા ચિઠ્ઠી)"
                              className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <FileText size={16} />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Delete deal ${deal.deal_number}?`)) {
                                  deleteMutation.mutate(deal.id);
                                }
                              }}
                              title="Delete Sauda"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Brokerage Ledger View */
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen size={18} className="text-emerald-700" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Mill / Seller-Wise Brokerage Summary (દલાલી હિસાબ ખાતાવહી)
                </h3>
              </div>
              <span className="text-xs text-slate-400">Commission breakdown per oil mill</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-xs font-semibold text-slate-600">
                    <th className="py-3 px-4">Seller / Mill Name</th>
                    <th className="py-3 px-4">Phone / GSTIN</th>
                    <th className="py-3 px-4 text-center">Total Deals</th>
                    <th className="py-3 px-4 text-right">Brokerage Earned (₹)</th>
                    <th className="py-3 px-4 text-right text-emerald-700">Received (₹)</th>
                    <th className="py-3 px-4 text-right font-bold text-amber-700">Pending (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLedgerLoading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Loading brokerage ledger...
                      </td>
                    </tr>
                  ) : !ledgerData?.mill_summary || ledgerData.mill_summary.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No mill brokerage data available yet.
                      </td>
                    </tr>
                  ) : (
                    ledgerData.mill_summary.map((item) => (
                      <tr key={item.seller_id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {item.company_name}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500">
                          {item.phone} {item.gstin ? `• GST: ${item.gstin}` : ''}
                        </td>
                        <td className="py-3 px-4 text-center font-semibold text-slate-700">
                          {item.deals_count}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-slate-900">
                          ₹{item.brokerage_earned.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-emerald-700">
                          ₹{item.brokerage_received.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-amber-700 text-sm">
                          ₹{item.brokerage_pending.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Brokerage Payments Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt size={18} className="text-emerald-700" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Recent Brokerage Collections (તાજેતરની દલાલી આવક)
                </h3>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-xs font-semibold text-slate-600">
                    <th className="py-3 px-4">Sauda Deal #</th>
                    <th className="py-3 px-4">Paid By</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Mode</th>
                    <th className="py-3 px-4">Reference / UTR</th>
                    <th className="py-3 px-4 text-right font-bold">Amount Paid (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {!ledgerData?.recent_payments || ledgerData.recent_payments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No brokerage payment receipts recorded yet.
                      </td>
                    </tr>
                  ) : (
                    ledgerData.recent_payments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 font-mono font-semibold text-emerald-800 text-xs">
                          {p.deal_number}
                        </td>
                        <td className="py-3 px-4 text-xs font-semibold text-slate-700">
                          {p.paid_by}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500">
                          {p.payment_date}
                        </td>
                        <td className="py-3 px-4 text-xs font-mono text-slate-600">
                          {p.payment_mode}
                        </td>
                        <td className="py-3 px-4 text-xs font-mono text-slate-600">
                          {p.reference_number || '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-700">
                          ₹{p.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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

      {/* Record Brokerage Payment Modal */}
      {isBrokerageModalOpen && selectedDealForBrokerage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden my-6">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-emerald-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <CreditCard size={22} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    દલાલી જમા કરો (Record Brokerage)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Sauda #{selectedDealForBrokerage.deal_number} ({selectedDealForBrokerage.seller_name})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBrokerageModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveBrokeragePayment} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    દલાલી રકમ (Amount ₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={brokerageForm.amount}
                    onChange={(e) => setBrokerageForm({ ...brokerageForm, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold text-emerald-800 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    કોની પાસેથી મળ્યા (Paid By)
                  </label>
                  <select
                    value={brokerageForm.paid_by}
                    onChange={(e) => setBrokerageForm({ ...brokerageForm, paid_by: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  >
                    <option value="SELLER">Seller / Mill (વેચનાર)</option>
                    <option value="BUYER">Buyer / Party (ખરીદનાર)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    તારીખ (Date) *
                  </label>
                  <input
                    type="date"
                    value={brokerageForm.payment_date}
                    onChange={(e) => setBrokerageForm({ ...brokerageForm, payment_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    મોડ (Mode)
                  </label>
                  <select
                    value={brokerageForm.payment_mode}
                    onChange={(e) => setBrokerageForm({ ...brokerageForm, payment_mode: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  >
                    <option value="RTGS">RTGS</option>
                    <option value="NEFT">NEFT</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="UPI">UPI</option>
                    <option value="CASH">Cash</option>
                    <option value="TDS_ADJUSTMENT">TDS / Book Adjustment</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  UTR / Cheque No.
                </label>
                <input
                  type="text"
                  value={brokerageForm.reference_number}
                  onChange={(e) => setBrokerageForm({ ...brokerageForm, reference_number: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  placeholder="UTR-XXXX-YYYY"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsBrokerageModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl cursor-pointer shadow-xs shadow-emerald-700/20"
                >
                  Confirm Brokerage Collection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Book New Sauda Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden my-8">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Handshake size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Book New Sauda / સોદો નોંધણી
                  </h3>
                  <p className="text-xs text-slate-500">
                    Jalaram Brokers mediation deal contract
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateDeal} className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Deal Date
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Seller / Mill (વેચનાર કંપની)
                  </label>
                  <select
                    value={formData.seller_id}
                    onChange={(e) => handleSellerChange(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Select Existing Seller...</option>
                    {sellers?.map((s: Seller) => (
                      <option key={s.id} value={s.id}>
                        {s.company_name}
                      </option>
                    ))}
                  </select>
                  {!formData.seller_id && (
                    <input
                      type="text"
                      placeholder="Or enter new Seller Name"
                      value={formData.seller_name}
                      onChange={(e) => setFormData({ ...formData, seller_name: e.target.value })}
                      className="mt-1 w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Buyer / Party (ખરીદનાર વેપારી)
                  </label>
                  <select
                    value={formData.buyer_id}
                    onChange={(e) => handleBuyerChange(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Select Existing Buyer...</option>
                    {buyers?.map((b: Buyer) => (
                      <option key={b.id} value={b.id}>
                        {b.company_name}
                      </option>
                    ))}
                  </select>
                  {!formData.buyer_id && (
                    <input
                      type="text"
                      placeholder="Or enter new Buyer Name"
                      value={formData.buyer_name}
                      onChange={(e) => setFormData({ ...formData, buyer_name: e.target.value })}
                      className="mt-1 w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Buyer Station / City
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Anand, Hadgud, Morbi"
                    value={formData.buyer_city}
                    onChange={(e) => setFormData({ ...formData, buyer_city: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Product / Item Description (માલ)
                </label>
                <select
                  value={formData.product_id}
                  onChange={(e) => handleProductChange(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Select Product...</option>
                  {products?.map((p: Product) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.packaging || '50 kg'}) - ₹{p.price}
                    </option>
                  ))}
                </select>
                {!formData.product_id && (
                  <input
                    type="text"
                    placeholder="Or type custom item name (e.g., Kadi Cotton Cake)"
                    value={formData.product_name}
                    onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                    className="mt-1 w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
                  />
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Packaging
                  </label>
                  <input
                    type="text"
                    value={formData.packaging}
                    onChange={(e) => setFormData({ ...formData, packaging: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Quantity (Bags)
                  </label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Rate per Bag (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.rate}
                    onChange={(e) => setFormData({ ...formData, rate: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 font-semibold"
                    required
                  />
                </div>
              </div>

              <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-emerald-800">Total Deal Amount (કુલ સોદો)</p>
                  <p className="text-xl font-bold text-emerald-950 mt-0.5">
                    ₹{calculatedGross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    {formData.quantity} Bags × ₹{formData.rate}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium text-emerald-800">Brokerage Earned (દલાલી)</p>
                  <p className="text-xl font-bold text-emerald-950 mt-0.5">
                    ₹{calculatedBrokerage.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    ₹{formData.brokerage_rate}/bag ({formData.brokerage_from})
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Brokerage Type
                  </label>
                  <select
                    value={formData.brokerage_type}
                    onChange={(e) => setFormData({ ...formData, brokerage_type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  >
                    <option value="PER_UNIT">₹ Per Bag/Unit</option>
                    <option value="PERCENTAGE">% Percentage</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Brokerage Rate
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.brokerage_rate}
                    onChange={(e) =>
                      setFormData({ ...formData, brokerage_rate: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Charged From
                  </label>
                  <select
                    value={formData.brokerage_from}
                    onChange={(e) => setFormData({ ...formData, brokerage_from: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  >
                    <option value="SELLER">Seller Only (વેચનાર)</option>
                    <option value="BUYER">Buyer Only (ખરીદનાર)</option>
                    <option value="BOTH">Both (બંને પાસેથી)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Delivery Condition / Station
                  </label>
                  <input
                    type="text"
                    value={formData.delivery_terms}
                    onChange={(e) =>
                      setFormData({ ...formData, delivery_terms: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Terms
                  </label>
                  <input
                    type="text"
                    value={formData.payment_terms}
                    onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Special Notes / Remarks
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  placeholder="Transport / Vehicle / Quality specifics..."
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl cursor-pointer shadow-xs shadow-emerald-700/20"
                >
                  Save & Book Sauda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Sauda Confirmation Note (સોદા ચિઠ્ઠી) Modal */}
      {selectedDealForChithi && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 relative my-8">
            <button
              onClick={() => setSelectedDealForChithi(null)}
              className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
            >
              <X size={18} />
            </button>

            <div id="sauda-chithi-print" className="border-2 border-slate-800 p-6 rounded-xl bg-amber-50/20 font-serif">
              <div className="text-center border-b-2 border-slate-800 pb-3">
                <p className="text-xs tracking-widest text-slate-600 uppercase">|| શ્રી ગણેશાય નમઃ ||</p>
                <h2 className="text-2xl font-bold text-slate-900 mt-1">JALARAM BROKERS</h2>
                <p className="text-xs text-slate-700">
                  Cattle Feed & Agricultural Commodities Brokers
                </p>
                <p className="text-[11px] text-slate-500">
                  Station Road, Anand - 388001 | Mo: +91 98980 00000
                </p>
                <div className="mt-2 inline-block bg-slate-900 text-white text-xs font-sans font-bold px-3 py-1 rounded">
                  SAUDA CONFIRMATION NOTE / સોદા ચિઠ્ઠી
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 my-4 text-xs font-sans">
                <div>
                  <span className="text-slate-500 font-serif">Sauda No:</span>{' '}
                  <span className="font-bold text-slate-900">{selectedDealForChithi.deal_number}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 font-serif">Date:</span>{' '}
                  <span className="font-bold text-slate-900">{selectedDealForChithi.date}</span>
                </div>

                <div className="p-2.5 bg-slate-100 rounded-lg">
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">SELLER / વેચનાર</p>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">
                    {selectedDealForChithi.seller_name}
                  </p>
                </div>

                <div className="p-2.5 bg-slate-100 rounded-lg">
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">BUYER / ખરીદનાર</p>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">
                    {selectedDealForChithi.buyer_name}
                  </p>
                  <p className="text-xs text-slate-600">{selectedDealForChithi.buyer_city}</p>
                </div>
              </div>

              <table className="w-full text-xs font-sans border-collapse my-3">
                <thead>
                  <tr className="border-y border-slate-300 bg-slate-100/70 text-slate-700">
                    <th className="py-2 text-left px-2">Particulars</th>
                    <th className="py-2 text-center px-2">Packing</th>
                    <th className="py-2 text-right px-2">Quantity</th>
                    <th className="py-2 text-right px-2">Rate</th>
                    <th className="py-2 text-right px-2">Total Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-200">
                    <td className="py-2.5 px-2 font-bold text-slate-900">
                      {selectedDealForChithi.product_name}
                    </td>
                    <td className="py-2.5 px-2 text-center text-slate-700">
                      {selectedDealForChithi.packaging}
                    </td>
                    <td className="py-2.5 px-2 text-right font-bold text-slate-900">
                      {selectedDealForChithi.quantity} Bags
                    </td>
                    <td className="py-2.5 px-2 text-right font-semibold text-slate-900">
                      ₹{Number(selectedDealForChithi.rate).toFixed(2)}
                    </td>
                    <td className="py-2.5 px-2 text-right font-bold text-slate-900">
                      ₹{Number(selectedDealForChithi.gross_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="text-[11px] font-sans text-slate-700 space-y-1 my-3 bg-white/70 p-3 rounded-lg border border-slate-200">
                <p>
                  <span className="font-semibold">Delivery Condition:</span>{' '}
                  {selectedDealForChithi.delivery_terms || 'Ex-Factory / Mill'}
                </p>
                <p>
                  <span className="font-semibold">Payment Terms:</span>{' '}
                  {selectedDealForChithi.payment_terms || 'As per customary terms'}
                </p>
                <p>
                  <span className="font-semibold">Brokerage:</span> ₹
                  {Number(selectedDealForChithi.brokerage_total).toFixed(2)} ({selectedDealForChithi.brokerage_from})
                </p>
                {selectedDealForChithi.notes && (
                  <p>
                    <span className="font-semibold">Remarks:</span> {selectedDealForChithi.notes}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 text-center pt-8 text-[11px] font-sans">
                <div>
                  <p className="border-t border-slate-400 pt-1 text-slate-600">Buyer's Signature</p>
                </div>
                <div>
                  <p className="border-t border-slate-400 pt-1 text-slate-600">For Jalaram Brokers</p>
                </div>
                <div>
                  <p className="border-t border-slate-400 pt-1 text-slate-600">Seller's Signature</p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-3">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <Printer size={15} />
                <span>Print Sauda Chithi</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DealsPage;
