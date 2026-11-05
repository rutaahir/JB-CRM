import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  IndianRupee,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  Calendar,
  MessageCircle,
  PlusCircle,
  X,
  CreditCard,
  Receipt,
  FileText,
  Copy,
  Plus,
  Send,
  ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { recoveriesApi } from '@/api/recoveries';
import { apiClient } from '@/api/client';
import { RecoveryRecord, PaymentReceipt, Seller, Buyer } from '@/types';
import { cn } from '@/lib/utils';

export const RecoveriesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [companyFilter, setCompanyFilter] = useState<string>('ALL');
  const [isOverdueOnly, setIsOverdueOnly] = useState<boolean>(false);
  const [agingFilter, setAgingFilter] = useState<string>('ALL'); // ALL, BUCKET_0_15, BUCKET_16_30, BUCKET_31_45, BUCKET_45_PLUS

  // Modals state
  const [selectedRecordForPayment, setSelectedRecordForPayment] = useState<RecoveryRecord | null>(null);
  const [isManualAddOpen, setIsManualAddOpen] = useState(false);



  // Queries
  const { data: recoveriesData, isLoading } = useQuery({
    queryKey: ['recoveries', statusFilter, companyFilter, searchTerm],
    queryFn: () =>
      recoveriesApi.getRecoveries({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        seller: companyFilter !== 'ALL' ? companyFilter : undefined,
        search: searchTerm || undefined,
      }),
  });

  const { data: stats } = useQuery({
    queryKey: ['recoveries-stats'],
    queryFn: () => recoveriesApi.getStats(),
  });

  const { data: sellers } = useQuery({
    queryKey: ['sellers-dropdown-rec'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/sellers/');
      return Array.isArray(res.data) ? res.data : (res.data.results as Seller[]);
    },
  });

  const { data: buyers } = useQuery({
    queryKey: ['buyers-dropdown-rec'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/buyers/');
      return Array.isArray(res.data) ? res.data : (res.data.results as Buyer[]);
    },
  });

  // Manual Add Form State
  const [manualForm, setManualForm] = useState({
    buyer_id: '',
    buyer_name: '',
    buyer_city: '',
    seller_id: '',
    seller_name: '',
    bill_number: '',
    bill_date: new Date().toISOString().split('T')[0],
    billed_amount: '',
    due_days: 15,
    assigned_staff: 'Rajesh',
    notes: '',
  });

  const handleBuyerSelect = (bId: string) => {
    const b = buyers?.find((item: Buyer) => item.id.toString() === bId);
    setManualForm((prev) => ({
      ...prev,
      buyer_id: bId,
      buyer_name: b ? b.company_name : '',
      buyer_city: b ? b.address.split(',')[0] || '' : prev.buyer_city,
      due_days: b?.credit_days || 15,
    }));
  };

  const handleSellerSelect = (sId: string) => {
    const s = sellers?.find((item: Seller) => item.id.toString() === sId);
    setManualForm((prev) => ({
      ...prev,
      seller_id: sId,
      seller_name: s ? s.company_name : '',
    }));
  };

  const handleSaveManualBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.buyer_name) {
      toast.error('કૃપા કરી બાયર પાર્ટીનું નામ પસંદ કરો અથવા ટાઈપ કરો.');
      return;
    }
    if (!manualForm.seller_name && !manualForm.seller_id) {
      toast.error('કૃપા કરી સેલર કંપની પસંદ કરો.');
      return;
    }
    if (!manualForm.bill_number) {
      toast.error('કૃપા કરી બિલ નંબર દાખલ કરો.');
      return;
    }
    const amt = parseFloat(manualForm.billed_amount);
    if (isNaN(amt) || amt <= 0) {
      toast.error('કૃપા કરી યોગ્ય બાકી રકમ દાખલ કરો.');
      return;
    }

    try {
      await recoveriesApi.createRecovery({
        buyer: manualForm.buyer_id ? Number(manualForm.buyer_id) : null,
        buyer_name: manualForm.buyer_name,
        buyer_city: manualForm.buyer_city,
        seller: manualForm.seller_id ? Number(manualForm.seller_id) : null,
        seller_name: manualForm.seller_name,
        bill_number: manualForm.bill_number,
        bill_date: manualForm.bill_date,
        due_days: Number(manualForm.due_days) || 15,
        billed_amount: amt,
        balance_amount: amt,
        assigned_staff: manualForm.assigned_staff || 'Rajesh',
        notes: manualForm.notes,
        status: 'PENDING',
      });
      toast.success(`✅ બિલ #${manualForm.bill_number} (${manualForm.buyer_name}) સફળતાપૂર્વક ઉમેરાઈ ગયું.`);
      setIsManualAddOpen(false);
      setManualForm({
        buyer_id: '',
        buyer_name: '',
        buyer_city: '',
        seller_id: '',
        seller_name: '',
        bill_number: '',
        bill_date: new Date().toISOString().split('T')[0],
        billed_amount: '',
        due_days: 15,
        assigned_staff: 'Rajesh',
        notes: '',
      });
      queryClient.invalidateQueries({ queryKey: ['recoveries'] });
      queryClient.invalidateQueries({ queryKey: ['recoveries-stats'] });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'બિલ સેવ કરવામાં ભૂલ આવી.');
    }
  };

  // Payment form state
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    deductions_amount: 0,
    deduction_reason: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_mode: 'RTGS',
    reference_number: '',
    collected_by: '',
    notes: '',
  });

  const handleOpenPayment = (rec: RecoveryRecord) => {
    setSelectedRecordForPayment(rec);
    setPaymentForm({
      amount: Number(rec.balance_amount),
      deductions_amount: 0,
      deduction_reason: '',
      payment_date: new Date().toISOString().split('T')[0],
      payment_mode: 'RTGS',
      reference_number: '',
      collected_by: '',
      notes: '',
    });
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecordForPayment) return;
    if (paymentForm.amount <= 0 && paymentForm.deductions_amount <= 0) {
      toast.error('જમા રકમ અથવા કપાત 0 કરતા વધુ હોવી જોઈએ.');
      return;
    }

    try {
      const res = await recoveriesApi.recordPayment(selectedRecordForPayment.id, paymentForm);
      if (res.success) {
        toast.success(res.message);
        setSelectedRecordForPayment(null);
        queryClient.invalidateQueries({ queryKey: ['recoveries'] });
        queryClient.invalidateQueries({ queryKey: ['recoveries-stats'] });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'પેમેન્ટ નોંધવામાં ભૂલ આવી.');
    }
  };



  // Consolidated WhatsApp Reminder for a whole party with all their bills
  const handleSendConsolidatedWhatsApp = async (buyerId: number | null | undefined, buyerName: string, bills: RecoveryRecord[]) => {
    const firstBill = bills[0];
    const buyerObj = buyers?.find((b) => b.id === buyerId);
    const phone = buyerObj?.whatsapp || buyerObj?.phone || firstBill.buyer_phone || '919898000000';
    const cleanPhone = phone.replace(/[^\d]/g, '');

    const totalBalance = bills.reduce((sum, b) => sum + Number(b.balance_amount || 0), 0);

    const billsListText = bills
      .map(
        (b, i) =>
          `${i + 1}. બિલ નં: *${b.bill_number}* (તારીખ: ${b.bill_date}) - મિલ: *${b.seller_name}* - બાકી: *₹ ${Number(b.balance_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}*`
      )
      .join('\n');

    const msg = `જય જલારામ 🙏\n*જલારામ બ્રોકર્સ (JALARAM BROKERS)*\nતારીખ: ${new Date().toLocaleDateString('en-GB')}\n\nનમસ્તે શ્રી *${buyerName}*,\nઆપના ખાતાના નીચે મુજબના બિલની રકમ બાકી છે:\n\n${billsListText}\n\n---------------------------------\n*કુલ બાકી રકમ: ₹ ${totalBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}*\n---------------------------------\n\nકૃપા કરી સત્વરે RTGS / Cheque મારફતે મિલના ખાતામાં જમા કરાવી સ્લિપ મોકલી આપવા નમ્ર વિનંતી.\n\nઆભાર,\nજલારામ બ્રોકર્સ, આણંદ.`;

    // Log reminder to backend
    try {
      await recoveriesApi.logReminder({
        buyer_id: buyerId || undefined,
        bill_ids: bills.map((b) => b.id),
      });
      queryClient.invalidateQueries({ queryKey: ['recoveries'] });
    } catch (e) {
      // silent
    }

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const allRecords: RecoveryRecord[] = recoveriesData?.results || [];

  // Filter bills by status, overdue, and aging bucket
  const filteredRecords = allRecords.filter((rec) => {
    if (isOverdueOnly && !rec.is_overdue) return false;

    if (agingFilter !== 'ALL') {
      const days = rec.overdue_days || 0;
      if (agingFilter === 'BUCKET_0_15' && days > 15) return false;
      if (agingFilter === 'BUCKET_16_30' && (days <= 15 || days > 30)) return false;
      if (agingFilter === 'BUCKET_31_45' && (days <= 30 || days > 45)) return false;
      if (agingFilter === 'BUCKET_45_PLUS' && days <= 45) return false;
    }

    return true;
  });

  // Group bills strictly by Party ID (with fallback to cleaned Name)
  const partyGroups: Record<string, RecoveryRecord[]> = {};
  const partyOrder: string[] = [];

  filteredRecords.forEach((item) => {
    const key = item.buyer ? `buyer-${item.buyer}` : `name-${(item.buyer_name || '').trim().toLowerCase()}`;
    if (!partyGroups[key]) {
      partyGroups[key] = [];
      partyOrder.push(key);
    }
    partyGroups[key].push(item);
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              રિકવરી લેજર અને બાકી હિસાબ (Recovery Ledger)
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 rounded-full">
              દૈનિક ઉઘરાણી ખાતાવહી
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            જલારામ બ્રોકર્સ - પાર્ટી ID લિન્કિંગ, એકસાથે પેમેન્ટ જમા, સિંગલ કન્સોલિડેટેડ WhatsApp રીમાઇન્ડર અને એજિંગ બકેટ
          </p>
        </div>

        <button
          onClick={() => setIsManualAddOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-medium text-sm rounded-xl shadow-xs transition-all shadow-amber-600/20 hover:shadow-md cursor-pointer"
        >
          <Plus size={18} />
          <span>મેન્યુઅલ રો ઉમેરો (Manual Add Bill)</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              કુલ બાકી ઉધારી (Total Balance)
            </p>
            <p className="text-2xl font-bold text-amber-600 mt-1">
              ₹{(stats?.total_balance || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {stats?.pending_count || 0} પેન્ડિંગ • {stats?.partial_count || 0} અંશતઃ ચૂકવેલ
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <IndianRupee size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              કુલ જમા થયેલ (Recovered)
            </p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">
              ₹{(stats?.total_collected || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
              <CheckCircle2 size={12} /> {stats?.paid_count || 0} બિલો સંપૂર્ણ ચૂકતે થયા
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Receipt size={24} />
          </div>
        </div>

        {/* Clickable Overdue Card */}
        <div
          onClick={() => {
            setIsOverdueOnly(!isOverdueOnly);
            if (!isOverdueOnly) {
              setAgingFilter('ALL');
            }
          }}
          className={cn(
            'p-5 rounded-2xl border shadow-xs flex items-center justify-between cursor-pointer transition-all',
            isOverdueOnly
              ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-400'
              : 'bg-white border-slate-200/80 hover:border-rose-200'
          )}
        >
          <div>
            <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle size={13} />
              <span>ડ્યૂ થયેલી ઉધારી (Overdue Bills)</span>
            </p>
            <p className="text-2xl font-bold text-rose-700 mt-1">
              ₹{(stats?.overdue_amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-rose-600 font-medium mt-1">
              {stats?.overdue_count || 0} બિલો ક્રેડિટ લિમિટ ઓળંગી ગયા • ક્લિક કરો
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
            <Clock size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              સક્રિય પાર્ટીઓ (Parties in Ledger)
            </p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{partyOrder.length}</p>
            <p className="text-xs text-slate-400 mt-1">ID લિન્ક્ડ અને ખાતાવહી ગ્રુપિંગ</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Building2 size={24} />
          </div>
        </div>
      </div>

      {/* Aging Buckets Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-1">Aging Buckets:</span>
          <button
            onClick={() => {
              setAgingFilter('ALL');
              setIsOverdueOnly(false);
            }}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer',
              agingFilter === 'ALL' && !isOverdueOnly
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            All Aging
          </button>
          <button
            onClick={() => {
              setAgingFilter('BUCKET_0_15');
              setIsOverdueOnly(false);
            }}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer',
              agingFilter === 'BUCKET_0_15'
                ? 'bg-emerald-700 text-white'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            )}
          >
            0–15 Days (તાજા બિલ)
          </button>
          <button
            onClick={() => {
              setAgingFilter('BUCKET_16_30');
              setIsOverdueOnly(false);
            }}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer',
              agingFilter === 'BUCKET_16_30'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            )}
          >
            16–30 Days (ડ્યૂ લિસ્ટ)
          </button>
          <button
            onClick={() => {
              setAgingFilter('BUCKET_31_45');
              setIsOverdueOnly(false);
            }}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer',
              agingFilter === 'BUCKET_31_45'
                ? 'bg-orange-600 text-white'
                : 'bg-orange-50 text-orange-800 hover:bg-orange-100'
            )}
          >
            31–45 Days (ઉઘરાણી યાદી)
          </button>
          <button
            onClick={() => {
              setAgingFilter('BUCKET_45_PLUS');
              setIsOverdueOnly(false);
            }}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer',
              agingFilter === 'BUCKET_45_PLUS'
                ? 'bg-rose-700 text-white'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
            )}
          >
            45+ Days (તાત્કાલિક ઉઘરાણી)
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search party, bill, mill..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Recovery Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-xs font-semibold text-slate-600">
                <th className="py-3.5 px-4">બાયર પાર્ટી / શહેર (Buyer & Place)</th>
                <th className="py-3.5 px-4">સેલર મિલ (Seller Company)</th>
                <th className="py-3.5 px-4">બિલ નંબર & તારીખ (Bill # & Date)</th>
                <th className="py-3.5 px-4 text-right">બિલ રકમ (Billed ₹)</th>
                <th className="py-3.5 px-4 text-right font-bold">બાકી રકમ (Balance ₹)</th>
                <th className="py-3.5 px-4 text-center">ઉધારી દિવસો (Aging)</th>
                <th className="py-3.5 px-4 text-center">સ્ટેટસ (Status)</th>
                <th className="py-3.5 px-4 text-center">એક્શન (Actions)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="w-8 h-8 border-3 border-amber-500/20 border-t-amber-600 rounded-full animate-spin mx-auto mb-2" />
                    રિકવરી રેકોર્ડ્સ લોડ થઈ રહ્યા છે...
                  </td>
                </tr>
              ) : partyOrder.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <IndianRupee size={36} className="mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-700">કોઈ બાકી રિકવરી રેકોર્ડ મળ્યો નથી</p>
                    <p className="text-xs text-slate-400 mt-1">
                      ઉપરથી "મેન્યુઅલ રો ઉમેરો" અથવા સ્ટેટમેન્ટ PDF અપલોડ કરી ડેટા લાવો.
                    </p>
                  </td>
                </tr>
              ) : (
                partyOrder.map((key) => {
                  const bills = partyGroups[key];
                  const partyTotalBalance = bills.reduce((sum, b) => sum + Number(b.balance_amount || 0), 0);
                  const firstBill = bills[0];
                  const buyerObj = buyers?.find((b) => b.id === firstBill.buyer);

                  const partyDisplayName = buyerObj ? buyerObj.company_name : firstBill.buyer_name;
                  const partyCity = firstBill.buyer_city || (buyerObj ? buyerObj.address.split(',')[0] : '');
                  const creditDays = buyerObj?.credit_days || firstBill.due_days || 15;

                  return (
                    <React.Fragment key={key}>
                      {/* Party Header Banner */}
                      <tr className="bg-slate-100/70 border-t-2 border-slate-300">
                        <td colSpan={8} className="py-2.5 px-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-sm">{partyDisplayName}</span>
                              {partyCity && (
                                <span className="text-[11px] font-medium bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md">
                                  {partyCity}
                                </span>
                              )}
                              {firstBill.buyer && (
                                <span className="text-[10px] font-mono bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.2 rounded font-semibold">
                                  ID #{firstBill.buyer}
                                </span>
                              )}
                              <span className="text-[11px] text-slate-500 font-medium">
                                Credit: {creditDays} Days
                              </span>
                              {firstBill.reminder_count ? (
                                <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full">
                                  Sent {firstBill.reminder_count}x
                                </span>
                              ) : null}
                            </div>

                            <div className="flex items-center gap-2">
                              {/* 1-Click Consolidated WhatsApp for all bills */}
                              {partyTotalBalance > 0 && (
                                <button
                                  onClick={() => handleSendConsolidatedWhatsApp(firstBill.buyer, partyDisplayName, bills)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-2xs transition-colors"
                                  title="બધા બાકી બિલોનો એક જ સહિયારો WhatsApp મેસેજ મોકલો"
                                >
                                  <MessageCircle size={13} />
                                  <span>કન્સોલિડેટેડ WhatsApp ({bills.length})</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>

                      {/* Individual Bills Rows */}
                      {bills.map((rec) => {
                        const isOld = rec.is_overdue;
                        return (
                          <tr
                            key={rec.id}
                            className={cn(
                              'hover:bg-slate-50/80 transition-colors',
                              isOld && 'bg-rose-50/40'
                            )}
                          >
                            <td className="py-3 px-4 pl-8">
                              <div className="text-xs font-medium text-slate-700">
                                {rec.notes || 'Cattle Feed / Oil Cake Bill'}
                              </div>
                            </td>

                            <td className="py-3 px-4 text-xs font-medium text-amber-900">
                              <div className="flex items-center gap-1.5">
                                <Building2 size={13} className="text-amber-600/70 shrink-0" />
                                <span>{rec.seller_name}</span>
                              </div>
                            </td>

                            <td className="py-3 px-4 text-xs text-slate-700">
                              <span className="font-mono font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
                                {rec.bill_number}
                              </span>
                              <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                                <Calendar size={11} />
                                {rec.bill_date}
                              </div>
                            </td>

                            <td className="py-3 px-4 text-right text-xs text-slate-600">
                              ₹{Number(rec.billed_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>

                            <td className="py-3 px-4 text-right">
                              <span
                                className={cn(
                                  'font-bold text-sm',
                                  Number(rec.balance_amount) <= 0
                                    ? 'text-emerald-700'
                                    : isOld
                                    ? 'text-rose-700'
                                    : 'text-amber-700'
                                )}
                              >
                                ₹{Number(rec.balance_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                            </td>

                            <td className="py-3 px-4 text-center">
                              <span
                                className={cn(
                                  'text-xs font-semibold px-2 py-0.5 rounded-full',
                                  isOld
                                    ? 'bg-rose-100 text-rose-800 font-bold'
                                    : (rec.overdue_days || 0) >= 15
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-slate-100 text-slate-600'
                                )}
                              >
                                {rec.overdue_days || 0} દિવસ {isOld ? '⚠️' : ''}
                              </span>
                            </td>

                            <td className="py-3 px-4 text-center">
                              <span
                                className={cn(
                                  'text-xs font-bold px-2 py-0.5 rounded-full',
                                  rec.status === 'PAID' && 'bg-emerald-100 text-emerald-800',
                                  rec.status === 'PARTIAL' && 'bg-amber-100 text-amber-800',
                                  rec.status === 'PENDING' && 'bg-slate-100 text-slate-700'
                                )}
                              >
                                {rec.status === 'PAID'
                                  ? 'ચૂકતે થયેલ'
                                  : rec.status === 'PARTIAL'
                                  ? 'અંશતઃ'
                                  : 'બાકી'}
                              </span>
                            </td>

                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {Number(rec.balance_amount) > 0 && (
                                  <button
                                    onClick={() => handleOpenPayment(rec)}
                                    title="પેમેન્ટ નોંધો (Record Payment)"
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                  >
                                    <CreditCard size={13} />
                                    <span>પેમેન્ટ</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                      {/* Subtotal row when party has multiple bills */}
                      {bills.length > 1 && (
                        <tr className="border-b-2 border-amber-300 bg-amber-50/80">
                          <td className="py-2.5 px-4 font-bold text-slate-800 pl-8" colSpan={4}>
                            <span className="flex items-center gap-1.5">
                              <span>🧮</span>
                              <span>{partyDisplayName} - કુલ ખાતા બાકી ({bills.length} બિલો)</span>
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right font-black text-amber-900 text-base">
                            ₹{partyTotalBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td colSpan={3} className="py-2.5 px-4 text-right"></td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>



      {/* Single Bill Record Payment Modal */}
      {selectedRecordForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden my-6">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-emerald-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <CreditCard size={22} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    બિલ પેમેન્ટ જમા કરો (Record Receipt)
                  </h3>
                  <p className="text-xs text-slate-500">
                    બિલ #{selectedRecordForPayment.bill_number} • {selectedRecordForPayment.buyer_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRecordForPayment(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-6 space-y-4">
              <div>
                <p className="text-xs text-slate-500">હાલની બાકી રકમ (Balance Due)</p>
                <p className="text-2xl font-bold text-amber-600 mt-0.5">
                  ₹{Number(selectedRecordForPayment.balance_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    જમા રકમ (Amount ₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold text-emerald-800 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    તારીખ (Date) *
                  </label>
                  <input
                    type="date"
                    value={paymentForm.payment_date}
                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    પેમેન્ટ મોડ (Payment Mode)
                  </label>
                  <select
                    value={paymentForm.payment_mode}
                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_mode: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  >
                    <option value="RTGS">RTGS</option>
                    <option value="NEFT">NEFT</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="UPI">UPI</option>
                    <option value="CASH">Cash</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    UTR / Cheque No.
                  </label>
                  <input
                    type="text"
                    value={paymentForm.reference_number}
                    onChange={(e) => setPaymentForm({ ...paymentForm, reference_number: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                    placeholder="UTR-XXXX-YYYY"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ઉઘરાણી કરનાર સ્ટાફ (Collected By)
                </label>
                <input
                  type="text"
                  value={paymentForm.collected_by}
                  onChange={(e) => setPaymentForm({ ...paymentForm, collected_by: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  placeholder="e.g. Rajesh Patel"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedRecordForPayment(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl cursor-pointer shadow-xs shadow-emerald-700/20"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Add Bill Modal */}
      {isManualAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden my-6">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-amber-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <PlusCircle size={22} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    મેન્યુઅલ બિલ ઉમેરો (Manual Bill Entry)
                  </h3>
                  <p className="text-xs text-slate-500">
                    બાયર પાર્ટી અને સેલર મિલની નવી ઉધારી સીધી લેજરમાં એડ કરો
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsManualAddOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveManualBill} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    બાયર પાર્ટી (Buyer Party) *
                  </label>
                  <select
                    value={manualForm.buyer_id}
                    onChange={(e) => handleBuyerSelect(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  >
                    <option value="">-- પસંદ કરો અથવા ટાઈપ કરો --</option>
                    {buyers?.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.company_name}
                      </option>
                    ))}
                  </select>
                  {!manualForm.buyer_id && (
                    <input
                      type="text"
                      placeholder="અથવા નવું નામ લખો..."
                      value={manualForm.buyer_name}
                      onChange={(e) => setManualForm({ ...manualForm, buyer_name: e.target.value })}
                      className="w-full px-3 py-1.5 mt-1.5 border border-slate-200 rounded-lg text-xs"
                      required
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    સેલર મિલ (Seller Mill) *
                  </label>
                  <select
                    value={manualForm.seller_id}
                    onChange={(e) => handleSellerSelect(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                    required
                  >
                    <option value="">-- સેલર પસંદ કરો --</option>
                    {sellers?.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.company_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    બિલ નંબર (Bill #) *
                  </label>
                  <input
                    type="text"
                    value={manualForm.bill_number}
                    onChange={(e) => setManualForm({ ...manualForm, bill_number: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono"
                    placeholder="e.g. 1042"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    બિલ તારીખ (Date) *
                  </label>
                  <input
                    type="date"
                    value={manualForm.bill_date}
                    onChange={(e) => setManualForm({ ...manualForm, bill_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ક્રેડિટ દિવસો (Due Days)
                  </label>
                  <input
                    type="number"
                    value={manualForm.due_days}
                    onChange={(e) => setManualForm({ ...manualForm, due_days: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    બિલ રકમ (Billed Amount ₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={manualForm.billed_amount}
                    onChange={(e) => setManualForm({ ...manualForm, billed_amount: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold text-amber-800"
                    placeholder="e.g. 45000"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    પાર્ટી શહેર / સ્ટેશન
                  </label>
                  <input
                    type="text"
                    value={manualForm.buyer_city}
                    onChange={(e) => setManualForm({ ...manualForm, buyer_city: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                    placeholder="e.g. Anand"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  વિગત / માલ (Remarks / Item)
                </label>
                <input
                  type="text"
                  value={manualForm.notes}
                  onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  placeholder="e.g. Cotton Cake 300 Bags"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsManualAddOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl cursor-pointer shadow-xs shadow-amber-600/20"
                >
                  Save Bill to Ledger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecoveriesPage;
