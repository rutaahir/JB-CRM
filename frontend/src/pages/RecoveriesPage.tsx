import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  Phone,
  PlusCircle,
  X,
  CreditCard,
  Receipt,
  FileText,
  Copy,
  Plus,
  Send,
  UploadCloud,
  Check,
  UserPlus,
  Eye,
  RefreshCw,
  Layers,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { recoveriesApi, PartyBalanceSummary } from '@/api/recoveries';
import { contactsApi } from '@/api/contacts';
import { apiClient } from '@/api/client';
import { RecoveryRecord, Contact } from '@/types';
import { cn, formatPrice } from '@/lib/utils';

export const RecoveriesPage: React.FC = () => {
  const queryClient = useQueryClient();

  // Active Tab: 'party_summary' (Company Balances), 'invoices' (All Bills), 'upload' (PDF Upload)
  const [activeTab, setActiveTab] = useState<'party_summary' | 'invoices' | 'upload'>('party_summary');

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [agingFilter, setAgingFilter] = useState<string>('ALL'); // ALL, BUCKET_0_15, BUCKET_16_30, BUCKET_31_45, BUCKET_45_PLUS
  const [overdueOnly, setOverdueOnly] = useState(false);

  // Expanded Party for viewing bills
  const [expandedPartyKey, setExpandedPartyKey] = useState<string | null>(null);

  // Modals state
  const [selectedPartyForPayment, setSelectedPartyForPayment] = useState<PartyBalanceSummary | null>(null);
  const [selectedRecordForPayment, setSelectedRecordForPayment] = useState<RecoveryRecord | null>(null);
  const [selectedPartyForCall, setSelectedPartyForCall] = useState<PartyBalanceSummary | null>(null);
  const [isManualAddOpen, setIsManualAddOpen] = useState(false);

  // PDF Upload State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadOcrText, setUploadOcrText] = useState<string>('');
  const [showOcrInput, setShowOcrInput] = useState<boolean>(false);
  const [uploadSellerId, setUploadSellerId] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedResult, setExtractedResult] = useState<any | null>(null);
  const [isApproving, setIsApproving] = useState(false);

  // 1. Fetch Party-Wise Balance Summaries (Company Aggregate)
  const {
    data: partySummaries = [],
    isLoading: isLoadingParties,
    refetch: refetchParties,
  } = useQuery({
    queryKey: ['recoveries-party-summary'],
    queryFn: () => recoveriesApi.getPartySummary(),
  });

  // 2. Fetch All Invoices / Bills Register
  const {
    data: recoveriesData,
    isLoading: isLoadingBills,
    refetch: refetchBills,
  } = useQuery({
    queryKey: ['recoveries-bills', statusFilter, searchTerm],
    queryFn: () =>
      recoveriesApi.getRecoveries({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        search: searchTerm || undefined,
        page_size: 500,
      }),
  });

  // 3. Overall Recovery Stats
  const { data: stats } = useQuery({
    queryKey: ['recoveries-stats'],
    queryFn: () => recoveriesApi.getStats(),
  });

  // 4. Contacts Dropdown (Mills & Buyers from Contact Master)
  const { data: contactsData } = useQuery({
    queryKey: ['contacts-dropdown-for-recoveries'],
    queryFn: () => contactsApi.getAllContactsList(),
  });

  const millContacts = useMemo(
    () => contactsData?.filter((c) => c.party_type === 'COMPANY_MILL' || c.party_type === ('SELLER' as any)) || [],
    [contactsData]
  );
  const buyerContacts = useMemo(
    () => contactsData?.filter((c) => c.party_type === 'BUYER') || [],
    [contactsData]
  );

  // Manual Add Form State
  const [manualForm, setManualForm] = useState({
    buyer_contact_id: '',
    buyer_name: '',
    buyer_city: '',
    buyer_phone: '',
    company_contact_id: '',
    seller_name: '',
    bill_number: '',
    bill_date: new Date().toISOString().split('T')[0],
    billed_amount: '',
    due_days: 15,
    notes: '',
  });

  // Payment Form State
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    deductions_amount: '',
    deduction_reason: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_mode: 'RTGS',
    reference_number: '',
    collected_by: '',
    notes: '',
  });

  // Handle Opening Payment for a Company
  const handleOpenPartyPayment = (party: PartyBalanceSummary) => {
    setSelectedPartyForPayment(party);
    setSelectedRecordForPayment(null);
    setPaymentForm({
      amount: String(party.total_balance),
      deductions_amount: '',
      deduction_reason: '',
      payment_date: new Date().toISOString().split('T')[0],
      payment_mode: 'RTGS',
      reference_number: '',
      collected_by: '',
      notes: '',
    });
  };

  // Handle Opening Payment for a Single Bill
  const handleOpenBillPayment = (bill: RecoveryRecord) => {
    setSelectedRecordForPayment(bill);
    setSelectedPartyForPayment(null);
    setPaymentForm({
      amount: String(bill.balance_amount),
      deductions_amount: '',
      deduction_reason: '',
      payment_date: new Date().toISOString().split('T')[0],
      payment_mode: 'RTGS',
      reference_number: '',
      collected_by: '',
      notes: '',
    });
  };

  // Submit Payment (Allocates across bills or single bill)
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(paymentForm.amount || '0');
    const ded = parseFloat(paymentForm.deductions_amount || '0');

    if (amt <= 0 && ded <= 0) {
      toast.error('કૃપા કરી જમા રકમ અથવા કપાત દાખલ કરો (Enter payment or deduction amount).');
      return;
    }

    try {
      if (selectedRecordForPayment) {
        // Single Bill Payment
        const res = await recoveriesApi.recordPayment(selectedRecordForPayment.id, {
          amount: amt,
          deductions_amount: ded,
          deduction_reason: paymentForm.deduction_reason,
          payment_date: paymentForm.payment_date,
          payment_mode: paymentForm.payment_mode,
          reference_number: paymentForm.reference_number,
          collected_by: paymentForm.collected_by,
          notes: paymentForm.notes,
        });
        toast.success(
          `પેમેન્ટ ₹${amt.toLocaleString('en-IN')} જમા થયું! બાકી રકમ: ₹${res.new_balance.toLocaleString('en-IN')}`
        );
      } else if (selectedPartyForPayment) {
        // Company Lump-Sum Allocation
        const res = await recoveriesApi.allocatePayment({
          buyer_contact_id: selectedPartyForPayment.buyer_contact_id || undefined,
          buyer_id: selectedPartyForPayment.buyer_id || undefined,
          buyer_name: selectedPartyForPayment.company_name,
          amount: amt,
          deductions_amount: ded,
          deduction_reason: paymentForm.deduction_reason,
          payment_date: paymentForm.payment_date,
          payment_mode: paymentForm.payment_mode,
          reference_number: paymentForm.reference_number,
          collected_by: paymentForm.collected_by,
          notes: paymentForm.notes,
        });
        toast.success(
          `શ્રી ${selectedPartyForPayment.company_name} ના ખાતામાં ₹${amt.toLocaleString('en-IN')} જમા થયા!`
        );
      }

      // Close modal & refresh queries
      setSelectedPartyForPayment(null);
      setSelectedRecordForPayment(null);
      queryClient.invalidateQueries({ queryKey: ['recoveries-party-summary'] });
      queryClient.invalidateQueries({ queryKey: ['recoveries-bills'] });
      queryClient.invalidateQueries({ queryKey: ['recoveries-stats'] });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'પેમેન્ટ સેવ કરવામાં ભૂલ આવી (Failed to record payment).');
    }
  };

  // WhatsApp Reminder Generator & Sender
  const handleSendWhatsApp = async (party: PartyBalanceSummary) => {
    const rawPhone = party.phone || '9898000000';
    const cleanPhone = rawPhone.replace(/[^\d]/g, '');
    const phoneWithCode = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    const billsListText = party.bills
      .filter((b) => b.balance_amount > 0)
      .slice(0, 5)
      .map(
        (b, i) =>
          `${i + 1}. બિલ નં: *${b.bill_number}* (તારીખ: ${b.bill_date}) - મિલ: *${b.seller_name}* - બાકી: *₹ ${b.balance_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}*`
      )
      .join('\n');

    const msg = `જય જલારામ 🙏\n*જલારામ બ્રોકર્સ (JALARAM BROKERS, ANAND)*\nતારીખ: ${new Date().toLocaleDateString('en-GB')}\n\nનમસ્તે શ્રી *${party.company_name}*,\nઆપના ખાતાની પેમેન્ટ વિગત નીચે મુજબ છે:\n\n• કુલ બિલ રકમ: ₹ ${party.total_billed.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n• જમા થયેલ રકમ: ₹ ${party.total_paid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n---------------------------------\n*ચાલુ બાકી રકમ: ₹ ${party.total_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}*\n---------------------------------\n${billsListText ? `બાકી બિલો:\n${billsListText}\n` : ''}\nકૃપા કરી સત્વરે RTGS / Cheque મારફતે મિલના ખાતામાં જમા કરાવી સ્લિપ મોકલી આપવા નમ્ર વિનંતી.\n\nઆભાર,\nજલારામ બ્રોકર્સ, આણંદ.`;

    // Log reminder in backend
    try {
      await recoveriesApi.logReminder({
        buyer_id: party.buyer_contact_id || party.buyer_id || undefined,
        bill_ids: party.bills.map((b) => b.id),
      });
      queryClient.invalidateQueries({ queryKey: ['recoveries-party-summary'] });
    } catch (e) {
      // ignore
    }

    window.open(`https://wa.me/${phoneWithCode}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // PDF Extraction Handler
  const handleUploadPDF = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile && !uploadOcrText.trim()) {
      toast.error('કૃપા કરી PDF ફાઇલ પસંદ કરો અથવા સ્ટેટમેન્ટ ટેક્સ્ટ દાખલ કરો.');
      return;
    }

    try {
      setIsExtracting(true);
      const formData = new FormData();
      if (uploadFile) {
        formData.append('file', uploadFile);
      }
      if (uploadOcrText.trim()) {
        formData.append('ocr_text', uploadOcrText.trim());
      }
      if (uploadSellerId) {
        formData.append('seller_id', uploadSellerId);
        formData.append('company_contact_id', uploadSellerId);
      }

      const res = await recoveriesApi.uploadStatement(formData);
      setExtractedResult(res);
      toast.success(`સ્ટેટમેન્ટ સફળતાપૂર્વક વંચાઈ ગયું! ${res.records_count} બિલ રેકોર્ડ્સ મળ્યા.`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'સ્ટેટમેન્ટ વાંચવામાં ભૂલ આવી.');
    } finally {
      setIsExtracting(false);
    }
  };

  // Approve Extracted PDF to Live Database
  const handleApproveExtracted = async () => {
    if (!extractedResult || !extractedResult.statement_id) return;
    try {
      setIsApproving(true);
      const res = await recoveriesApi.saveVerifiedRecords(extractedResult.statement_id, {
        records: extractedResult.records,
        target: 'RECOVERIES',
        seller_id: uploadSellerId || extractedResult.seller_id,
      });
      toast.success(res.message || 'રેકોર્ડ્સ સફળતાપૂર્વક આયાત થઈ ગયા!');
      setExtractedResult(null);
      setUploadFile(null);
      setActiveTab('party_summary');
      queryClient.invalidateQueries({ queryKey: ['recoveries-party-summary'] });
      queryClient.invalidateQueries({ queryKey: ['recoveries-bills'] });
      queryClient.invalidateQueries({ queryKey: ['recoveries-stats'] });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'ડેટા સેવ કરવામાં ભૂલ આવી.');
    } finally {
      setIsApproving(false);
    }
  };

  // Handle Manual Bill Creation
  const handleSaveManualBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.buyer_name) {
      toast.error('કૃપા કરી બાયર કંપનીનું નામ પસંદ કરો.');
      return;
    }
    if (!manualForm.bill_number) {
      toast.error('કૃપા કરી બિલ નંબર દાખલ કરો.');
      return;
    }
    const amt = parseFloat(manualForm.billed_amount || '0');
    if (amt <= 0) {
      toast.error('બિલની રકમ શૂન્ય કરતાં વધુ હોવી જોઈએ.');
      return;
    }

    try {
      await recoveriesApi.createRecovery({
        buyer_contact: manualForm.buyer_contact_id ? Number(manualForm.buyer_contact_id) : undefined,
        buyer_name: manualForm.buyer_name,
        buyer_city: manualForm.buyer_city,
        buyer_phone: manualForm.buyer_phone,
        company_contact: manualForm.company_contact_id ? Number(manualForm.company_contact_id) : undefined,
        seller_name: manualForm.seller_name || 'Mill Partner',
        bill_number: manualForm.bill_number,
        bill_date: manualForm.bill_date,
        due_days: Number(manualForm.due_days) || 15,
        billed_amount: amt as any,
        balance_amount: amt as any,
        status: 'PENDING',
        notes: manualForm.notes,
      });

      toast.success(`બિલ નં ${manualForm.bill_number} (₹${amt.toLocaleString('en-IN')}) ઉમેરાઈ ગયું!`);
      setIsManualAddOpen(false);
      setManualForm({
        buyer_contact_id: '',
        buyer_name: '',
        buyer_city: '',
        buyer_phone: '',
        company_contact_id: '',
        seller_name: '',
        bill_number: '',
        bill_date: new Date().toISOString().split('T')[0],
        billed_amount: '',
        due_days: 15,
        notes: '',
      });
      queryClient.invalidateQueries({ queryKey: ['recoveries-party-summary'] });
      queryClient.invalidateQueries({ queryKey: ['recoveries-bills'] });
      queryClient.invalidateQueries({ queryKey: ['recoveries-stats'] });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'બિલ ઉમેરવામાં ભૂલ આવી.');
    }
  };

  // Filtered party summaries
  const filteredParties = useMemo(() => {
    return partySummaries.filter((p) => {
      if (overdueOnly && p.max_overdue_days <= 15) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (
          p.company_name.toLowerCase().includes(q) ||
          p.city.toLowerCase().includes(q) ||
          p.phone.includes(q)
        );
      }
      return true;
    });
  }, [partySummaries, searchTerm, overdueOnly]);

  // Filtered individual bills
  const allBills: RecoveryRecord[] = recoveriesData?.results || [];
  const filteredBills = useMemo(() => {
    return allBills.filter((rec) => {
      if (overdueOnly && !rec.is_overdue) return false;
      if (agingFilter !== 'ALL') {
        const days = rec.overdue_days || 0;
        if (agingFilter === 'BUCKET_0_15' && days > 15) return false;
        if (agingFilter === 'BUCKET_16_30' && (days <= 15 || days > 30)) return false;
        if (agingFilter === 'BUCKET_31_45' && (days <= 30 || days > 45)) return false;
        if (agingFilter === 'BUCKET_45_PLUS' && days <= 45) return false;
      }
      return true;
    });
  }, [allBills, overdueOnly, agingFilter]);

  return (
    <div className="space-y-6">
      {/* ======================================================== */}
      {/* Page Header */}
      {/* ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold font-heading text-slate-900">
              પેમેન્ટ ઉઘરાણી (Payment Recovery & Follow-up)
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-800 border border-amber-300">
              Live Ledger
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            કંપનીવાર બાકી પેમેન્ટ, સ્ટેટમેન્ટ PDF અપલોડ, પેમેન્ટ જમા અને વોટ્સએપ/કોલ ફોલો-અપ
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          <button
            onClick={() => setActiveTab('upload')}
            className="px-3.5 py-2.5 bg-[#0B3B24] hover:bg-[#124b30] text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 transition-all cursor-pointer"
          >
            <UploadCloud size={16} />
            <span>સ્ટેટમેન્ટ PDF અપલોડ (Upload PDF)</span>
          </button>
          <button
            onClick={() => setIsManualAddOpen(true)}
            className="px-3.5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus size={15} />
            <span>+ નવું બિલ ઉમેરો (Add Bill)</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* KPI Stats Cards */}
      {/* ======================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl border border-rose-200 bg-rose-50/20 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-rose-800 uppercase">
            <span>કુલ બાકી રકમ (Outstanding)</span>
            <AlertTriangle size={16} className="text-rose-600" />
          </div>
          <p className="text-2xl font-black text-rose-900 mt-1">
            ₹ {(stats?.total_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-rose-700 mt-1 font-medium">
            {stats?.pending_count || 0} બાકી બિલો ({partySummaries.filter((p) => p.total_balance > 0).length} પાર્ટીઓ)
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-emerald-200 bg-emerald-50/20 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-800 uppercase">
            <span>કુલ જમા / વસૂલાત (Collected)</span>
            <CheckCircle2 size={16} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-900 mt-1">
            ₹ {(stats?.total_collected || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-emerald-700 mt-1 font-medium">
            {stats?.paid_count || 0} બિલો સંપૂર્ણ ચૂકતે (Paid)
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 uppercase">
            <span>કુલ બિલ રકમ (Total Invoiced)</span>
            <Receipt size={16} className="text-slate-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-1">
            ₹ {(stats?.total_billed || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">કુલ {stats?.total_bills || 0} બિલ નોંધાયા</p>
        </div>

        <div className="bg-white rounded-2xl border border-amber-200 bg-amber-50/20 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-amber-800 uppercase">
            <span>ઓવરડ્યુ રકમ (15+ Days Due)</span>
            <Clock size={16} className="text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-900 mt-1">
            ₹ {(stats?.overdue_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-amber-800 mt-1 font-medium">
            {stats?.overdue_count || 0} બિલો ક્રેડિટ મર્યાદા બહાર
          </p>
        </div>
      </div>

      {/* ======================================================== */}
      {/* Navigation Tabs */}
      {/* ======================================================== */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('party_summary')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'party_summary'
              ? 'bg-[#0B3B24] text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Building2 size={15} />
          <span>કંપનીવાર બાકી સારાંશ (Company Balances)</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/20 text-white font-mono">
            {partySummaries.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('invoices')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'invoices'
              ? 'bg-[#0B3B24] text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileText size={15} />
          <span>તમામ બિલ રજીસ્ટર (All Invoices)</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/20 text-white font-mono">
            {allBills.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('upload')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'upload'
              ? 'bg-[#0B3B24] text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <UploadCloud size={15} />
          <span>સ્ટેટમેન્ટ PDF અપલોડ (PDF Statement Extractor)</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: Company Outstanding Balances (Main requirement)   */}
      {/* ======================================================== */}
      {activeTab === 'party_summary' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="કંપની / વેપારી શોધો (e.g. ABC, Ami, Patel)..."
                className="w-full pl-10 pr-4 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B3B24]/20 shadow-2xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setOverdueOnly(!overdueOnly)}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                  overdueOnly
                    ? 'bg-rose-50 text-rose-800 border-rose-300 shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <AlertTriangle size={14} className={overdueOnly ? 'text-rose-600' : 'text-slate-400'} />
                <span>માત્ર ઓવરડ્યુ (Overdue Only)</span>
              </button>

              <button
                onClick={() => refetchParties()}
                className="p-2 bg-white text-slate-500 hover:text-slate-800 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                title="Refresh"
              >
                <RefreshCw size={15} className={isLoadingParties ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Party Balance Summary Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-subtle overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4 sm:px-6">કંપની / વેપારી (Party Name)</th>
                    <th className="py-3 px-4 text-right">કુલ બિલ (Invoiced)</th>
                    <th className="py-3 px-4 text-right">જમા થયેલ (Paid)</th>
                    <th className="py-3 px-4 text-right">ચાલુ બાકી રકમ (Balance Due)</th>
                    <th className="py-3 px-4 text-center">બિલો (Bills)</th>
                    <th className="py-3 px-4 text-center">ઓવરડ્યુ (Aging)</th>
                    <th className="py-3 px-4 text-center">ફોલો-અપ / ક્રિયાઓ (Follow-up)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoadingParties ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={7} className="py-4 px-6">
                          <div className="h-5 bg-slate-200 rounded w-full" />
                        </td>
                      </tr>
                    ))
                  ) : filteredParties.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                          <Building2 size={24} />
                        </div>
                        <p className="text-sm font-bold text-slate-700">કોઈ બાકી પાર્ટી મળી નથી</p>
                        <p className="text-xs text-slate-400 mt-1">
                          સ્ટેટમેન્ટ PDF અપલોડ કરો અથવા નવું બિલ ઉમેરો.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredParties.map((party) => {
                      const isExpanded = expandedPartyKey === party.party_key;
                      const hasBalance = party.total_balance > 0;

                      return (
                        <React.Fragment key={party.party_key}>
                          <tr
                            className={`hover:bg-slate-50/80 transition-colors ${
                              isExpanded ? 'bg-emerald-50/30' : ''
                            }`}
                          >
                            {/* Company Name & City */}
                            <td className="py-3 px-4 sm:px-6 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                                    hasBalance
                                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  }`}
                                >
                                  {party.company_name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900 text-sm">
                                    {party.company_name}
                                  </p>
                                  <p className="text-[11px] text-slate-400 flex items-center gap-2">
                                    {party.city && <span>{party.city}</span>}
                                    {party.phone && <span>• 📞 {party.phone}</span>}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* Total Billed */}
                            <td className="py-3 px-4 text-right font-mono font-semibold text-slate-700 whitespace-nowrap">
                              ₹ {party.total_billed.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>

                            {/* Total Paid */}
                            <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-700 whitespace-nowrap">
                              ₹ {party.total_paid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>

                            {/* Current Outstanding Balance (Bold prominent highlight) */}
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <span
                                className={`inline-block px-3 py-1 rounded-xl font-mono font-black text-sm ${
                                  hasBalance
                                    ? 'bg-rose-100 text-rose-900 border border-rose-300'
                                    : 'bg-emerald-50 text-emerald-800'
                                }`}
                              >
                                ₹ {party.total_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                            </td>

                            {/* Pending Bills count */}
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <button
                                onClick={() =>
                                  setExpandedPartyKey(isExpanded ? null : party.party_key)
                                }
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-colors cursor-pointer"
                              >
                                <span>{party.pending_bills_count} Bills</span>
                                <Eye size={12} />
                              </button>
                            </td>

                            {/* Aging Overdue Days */}
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              {party.max_overdue_days > 0 ? (
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                    party.max_overdue_days > 30
                                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                      : party.max_overdue_days > 15
                                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {party.max_overdue_days} days
                                </span>
                              ) : (
                                <span className="text-slate-400 font-medium">On Time</span>
                              )}
                            </td>

                            {/* Actions: WhatsApp, Call, Record Payment */}
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5">
                                {/* WhatsApp Message Button */}
                                <button
                                  type="button"
                                  onClick={() => handleSendWhatsApp(party)}
                                  className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                                  title="Send WhatsApp Payment Reminder"
                                >
                                  <MessageCircle size={14} />
                                  <span>WhatsApp</span>
                                </button>

                                {/* Phone Call Button */}
                                <button
                                  type="button"
                                  onClick={() => setSelectedPartyForCall(party)}
                                  className="p-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300 transition-all cursor-pointer"
                                  title={`Call ${party.company_name}`}
                                >
                                  <Phone size={14} />
                                </button>

                                {/* Record Payment Button */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenPartyPayment(party)}
                                  className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-[#062616] font-bold text-xs flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                                  title="Record Payment / Credit Amount"
                                >
                                  <CreditCard size={13} />
                                  <span>+ Pay</span>
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Expanded Bills breakdown for this company */}
                          {isExpanded && (
                            <tr className="bg-slate-50/70 border-b border-slate-200">
                              <td colSpan={7} className="p-4 pl-14">
                                <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs space-y-2">
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                                      <Receipt size={14} className="text-[#0B3B24]" />
                                      <span>{party.company_name} ના બાકી બિલોની યાદી ({party.bills.length} Bills)</span>
                                    </h4>
                                    <span className="text-[11px] text-slate-500">
                                      કુલ બાકી: <strong>₹ {party.total_balance.toLocaleString('en-IN')}</strong>
                                    </span>
                                  </div>

                                  <div className="overflow-x-auto">
                                    <table className="w-full text-[11px] text-left">
                                      <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                                        <tr>
                                          <th className="py-2 px-3">બિલ નંબર</th>
                                          <th className="py-2 px-3">તારીખ</th>
                                          <th className="py-2 px-3">મિલ / સપ્લાયર</th>
                                          <th className="py-2 px-3 text-right">બિલ રકમ</th>
                                          <th className="py-2 px-3 text-right">જમા રકમ</th>
                                          <th className="py-2 px-3 text-right">બાકી રકમ</th>
                                          <th className="py-2 px-3 text-center">સ્થિતિ</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                        {party.bills.map((b) => (
                                          <tr key={b.id} className="hover:bg-slate-50">
                                            <td className="py-2 px-3 font-bold text-slate-900">{b.bill_number}</td>
                                            <td className="py-2 px-3 text-slate-600 font-mono">{b.bill_date}</td>
                                            <td className="py-2 px-3 text-slate-700">{b.seller_name}</td>
                                            <td className="py-2 px-3 text-right font-mono text-slate-700">₹ {b.billed_amount.toLocaleString('en-IN')}</td>
                                            <td className="py-2 px-3 text-right font-mono text-emerald-700">₹ {b.paid_amount.toLocaleString('en-IN')}</td>
                                            <td className="py-2 px-3 text-right font-mono font-bold text-rose-800">₹ {b.balance_amount.toLocaleString('en-IN')}</td>
                                            <td className="py-2 px-3 text-center">
                                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                b.status === 'PAID'
                                                  ? 'bg-emerald-100 text-emerald-800'
                                                  : b.status === 'PARTIAL'
                                                  ? 'bg-amber-100 text-amber-800'
                                                  : 'bg-rose-100 text-rose-800'
                                              }`}>
                                                {b.status}
                                              </span>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </td>
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
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: All Invoices Register                              */}
      {/* ======================================================== */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="બિલ નં, કંપની અથવા મિલ શોધો..."
                className="w-full pl-10 pr-4 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B3B24]/20 shadow-2xs"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
              >
                <option value="ALL">બધી સ્થિતિ (All Status)</option>
                <option value="PENDING">Pending (બાકી)</option>
                <option value="PARTIAL">Partial (અંશતઃ ચૂકવેલ)</option>
                <option value="PAID">Paid (ચૂકતે)</option>
              </select>

              <select
                value={agingFilter}
                onChange={(e) => setAgingFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
              >
                <option value="ALL">બધો સમયગાળો (All Aging)</option>
                <option value="BUCKET_0_15">0 - 15 Days</option>
                <option value="BUCKET_16_30">16 - 30 Days</option>
                <option value="BUCKET_31_45">31 - 45 Days</option>
                <option value="BUCKET_45_PLUS">45+ Days (Critical)</option>
              </select>

              <button
                onClick={() => refetchBills()}
                className="p-2 bg-white text-slate-500 hover:text-slate-800 border border-slate-200 rounded-xl hover:bg-slate-50"
              >
                <RefreshCw size={15} className={isLoadingBills ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Individual Bills Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-subtle overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4">બિલ નંબર</th>
                    <th className="py-3 px-4">તારીખ</th>
                    <th className="py-3 px-4">બાયર / કંપની</th>
                    <th className="py-3 px-4">મિલ / સપ્લાયર</th>
                    <th className="py-3 px-4 text-right">ઓરિજિનલ રકમ</th>
                    <th className="py-3 px-4 text-right">બાકી રકમ</th>
                    <th className="py-3 px-4 text-center">સ્થિતિ</th>
                    <th className="py-3 px-4 text-center">ક્રિયાઓ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoadingBills ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={8} className="py-4 px-6">
                          <div className="h-5 bg-slate-200 rounded w-full" />
                        </td>
                      </tr>
                    ))
                  ) : filteredBills.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        કોઈ બિલ મળ્યા નથી.
                      </td>
                    </tr>
                  ) : (
                    filteredBills.map((bill) => (
                      <tr key={bill.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                          {bill.bill_number}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                          {bill.bill_date}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <p className="font-bold text-slate-900">{bill.buyer_name}</p>
                          {bill.buyer_city && (
                            <p className="text-[11px] text-slate-400">{bill.buyer_city}</p>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                          {bill.seller_name}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-700 whitespace-nowrap">
                          ₹ {Number(bill.billed_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-rose-800 whitespace-nowrap">
                          ₹ {Number(bill.balance_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              bill.status === 'PAID'
                                ? 'bg-emerald-100 text-emerald-800'
                                : bill.status === 'PARTIAL'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {bill.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleOpenBillPayment(bill)}
                            className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-[#062616] font-bold text-xs cursor-pointer"
                          >
                            + Pay Bill
                          </button>
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

      {/* ======================================================== */}
      {/* TAB 3: Statement PDF Upload & Preview                      */}
      {/* ======================================================== */}
      {activeTab === 'upload' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-subtle">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <UploadCloud size={20} className="text-[#0B3B24]" />
              <span>સ્ટેટમેન્ટ PDF અપલોડ કરો (Upload Statement PDF)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              મિલ અથવા કંપનીનું લેજર / આઉટસ્ટેન્ડિંગ PDF અપલોડ કરો. સિસ્ટમ આપમેળે કંપનીઓને જોડી દેશે અને નવી કંપનીઓ લિસ્ટમાં ઉમેરશે.
            </p>
          </div>

          {/* Upload Form */}
          <div className="flex items-center gap-2 mb-3">
            <button
              type="button"
              onClick={() => setShowOcrInput(false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                !showOcrInput
                  ? 'bg-forest-900 text-white border-forest-900 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              📄 PDF Upload (શ્રી વિજય, આકાશ એગ્રો, રાધેશ્યામ, B.H. એગ્રી)
            </button>
            <button
              type="button"
              onClick={() => setShowOcrInput(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                showOcrInput
                  ? 'bg-forest-900 text-white border-forest-900 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              📝 Paste Text / OCR
            </button>
          </div>

          <form onSubmit={handleUploadPDF} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  સપ્લાયર મિલ / કંપની પસંદ કરો (Mill Partner)
                </label>
                <select
                  value={uploadSellerId}
                  onChange={(e) => setUploadSellerId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                >
                  <option value="">-- આપોઆપ શોધો (Auto-Detect from Header) --</option>
                  {millContacts.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.city ? `(${m.city})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {!showOcrInput ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    PDF ફાઇલ પસંદ કરો (Select Statement PDF) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#0B3B24] file:text-white hover:file:bg-[#124b30] cursor-pointer"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    સ્ટેટમેન્ટ ટેક્સ્ટ પેસ્ટ કરો (Paste OCR / Statement Text) <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Paste statement lines or WhatsApp text here..."
                    value={uploadOcrText}
                    onChange={(e) => setUploadOcrText(e.target.value)}
                    className="w-full text-xs font-mono p-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isExtracting || (!uploadFile && !uploadOcrText.trim())}
                className="py-2.5 px-6 bg-[#0B3B24] hover:bg-[#124b30] text-white rounded-xl text-xs font-bold shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                {isExtracting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>સ્ટેટમેન્ટ વંચાઈ રહ્યું છે...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud size={16} />
                    <span>ડેટા ફેચ કરો (Extract & Analyze Statement)</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Extracted Preview Table */}
          {extractedResult && (
            <div className="space-y-4 pt-4 border-t border-slate-200 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
                <div>
                  <h3 className="font-bold text-emerald-950 text-sm flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-emerald-700" />
                    <span>
                      ડેટા સફળતાપૂર્વક મળ્યો: {extractedResult.records_count} બિલ રેકોર્ડ્સ
                    </span>
                  </h3>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    મિલ: <strong>{extractedResult.seller_name}</strong> • કુલ રકમ: ₹{' '}
                    {extractedResult.total_amount?.toLocaleString('en-IN')}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleApproveExtracted}
                  disabled={isApproving}
                  className="px-5 py-2.5 bg-[#0B3B24] hover:bg-[#124b30] text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {isApproving ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Check size={16} />
                  )}
                  <span>ઉઘરાણી રજીસ્ટરમાં સેવ કરો (Approve & Import)</span>
                </button>
              </div>

              {/* Preview Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">બિલ નંબર</th>
                      <th className="py-2 px-3">તારીખ</th>
                      <th className="py-2 px-3">પાર્ટીનું નામ (PDF)</th>
                      <th className="py-2 px-3">સિસ્ટમ મેચિંગ (Contact Master)</th>
                      <th className="py-2 px-3">શહેર</th>
                      <th className="py-2 px-3 text-right">બિલ રકમ (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {extractedResult.records?.map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-bold text-slate-900">{row.bill_number}</td>
                        <td className="py-2 px-3 font-mono text-slate-600">{row.bill_date}</td>
                        <td className="py-2 px-3 font-semibold text-slate-800">{row.buyer_name}</td>
                        <td className="py-2 px-3">
                          {!row.is_new_party ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <Check size={11} />
                              <span>{row.matched_buyer_name || 'Matched Contact'}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              <UserPlus size={11} />
                              <span>New Company (Auto-Add)</span>
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-slate-500">{row.city || '-'}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          ₹ {Number(row.pending_amount || row.billed_amount || 0).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: Record Payment / Balance Update                     */}
      {/* ======================================================== */}
      {(selectedPartyForPayment || selectedRecordForPayment) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden">
            <div className="bg-[#0B3B24] text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard size={18} />
                <h3 className="font-bold text-sm">
                  પેમેન્ટ જમા કરો (Record Payment / Credit)
                </h3>
              </div>
              <button
                onClick={() => {
                  setSelectedPartyForPayment(null);
                  setSelectedRecordForPayment(null);
                }}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitPayment} className="p-5 space-y-4">
              {/* Highlight Target & Balance */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                <p className="text-xs text-amber-800 font-semibold uppercase">પાર્ટીનું નામ (Company)</p>
                <p className="text-base font-bold text-slate-900">
                  {selectedPartyForPayment?.company_name || selectedRecordForPayment?.buyer_name}
                </p>
                <div className="mt-2 flex items-center justify-between text-xs pt-2 border-t border-amber-200/60">
                  <span className="text-amber-800 font-semibold">ચાલુ બાકી રકમ (Current Balance):</span>
                  <span className="font-mono font-black text-rose-800 text-sm">
                    ₹{' '}
                    {Number(
                      selectedPartyForPayment?.total_balance ?? selectedRecordForPayment?.balance_amount ?? 0
                    ).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Amount to pay */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  જમા રકમ (Amount Paid ₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  placeholder="e.g. 300000"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B3B24]/20"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  આ રકમ જમા કરવાથી બાકી રકમ આપમેળે ઘટી જશે.
                </p>
              </div>

              {/* Payment Mode & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    પેમેન્ટ મોડ (Mode)
                  </label>
                  <select
                    value={paymentForm.payment_mode}
                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_mode: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value="RTGS">RTGS / Bank</option>
                    <option value="NEFT">NEFT</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="UPI">UPI / Net Banking</option>
                    <option value="CASH">Cash</option>
                    <option value="ADJUSTMENT">Rate Diff / Claim</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    તારીખ (Date)
                  </label>
                  <input
                    type="date"
                    value={paymentForm.payment_date}
                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800"
                  />
                </div>
              </div>

              {/* Reference / UTR Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  UTR / ચેક નંબર (Reference Number)
                </label>
                <input
                  type="text"
                  value={paymentForm.reference_number}
                  onChange={(e) => setPaymentForm({ ...paymentForm, reference_number: e.target.value })}
                  placeholder="e.g. UTR12345678 or Chq# 8765"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                />
              </div>

              {/* Deductions (Claims / Shortage) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    કપાત / વળતર (Deduction ₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={paymentForm.deductions_amount}
                    onChange={(e) =>
                      setPaymentForm({ ...paymentForm, deductions_amount: e.target.value })
                    }
                    placeholder="e.g. 5000"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    કપાતનું કારણ (Reason)
                  </label>
                  <input
                    type="text"
                    value={paymentForm.deduction_reason}
                    onChange={(e) =>
                      setPaymentForm({ ...paymentForm, deduction_reason: e.target.value })
                    }
                    placeholder="દા.ત. વજન ઘટ, ભાવ ફેર"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPartyForPayment(null);
                    setSelectedRecordForPayment(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 cursor-pointer"
                >
                  રદ કરો (Cancel)
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-[#0B3B24] rounded-xl hover:bg-[#124b30] shadow-sm cursor-pointer flex items-center gap-1.5"
                >
                  <Check size={14} />
                  <span>જમા કરો (Update Balance)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: Call Contacts Picker Dialog                        */}
      {/* ======================================================== */}
      {selectedPartyForCall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-slate-200 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-sky-800">
                <Phone size={18} />
                <h3 className="font-bold text-sm">કોલ કરો (Make a Call)</h3>
              </div>
              <button
                onClick={() => setSelectedPartyForCall(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div>
              <p className="font-bold text-slate-900 text-sm">{selectedPartyForCall.company_name}</p>
              <p className="text-xs text-slate-500 mt-0.5">{selectedPartyForCall.city}</p>
              <p className="text-xs text-rose-800 font-bold mt-1">
                બાકી રકમ: ₹ {selectedPartyForCall.total_balance.toLocaleString('en-IN')}
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <p className="text-[11px] font-bold text-slate-600 uppercase">ઉપલબ્ધ ફોન નંબર:</p>
              {selectedPartyForCall.phone ? (
                <a
                  href={`tel:${selectedPartyForCall.phone.replace(/[^\d+]/g, '')}`}
                  className="w-full px-4 py-2.5 bg-sky-50 hover:bg-sky-100 border border-sky-300 text-sky-900 rounded-xl font-bold text-xs flex items-center justify-between transition-colors"
                >
                  <span>📞 {selectedPartyForCall.phone}</span>
                  <span className="text-[10px] bg-sky-200 px-2 py-0.5 rounded-full">Call Now</span>
                </a>
              ) : (
                <p className="text-xs text-slate-400 italic">કોઈ ફોન નંબર સેવ નથી.</p>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedPartyForCall(null)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 cursor-pointer"
              >
                બંધ કરો (Close)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: Manual Add Recovery Bill                           */}
      {/* ======================================================== */}
      {isManualAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden">
            <div className="bg-[#0B3B24] text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt size={18} />
                <h3 className="font-bold text-sm">નવું ઉઘરાણી બિલ ઉમેરો (Add Recovery Bill)</h3>
              </div>
              <button onClick={() => setIsManualAddOpen(false)} className="text-white/80 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveManualBill} className="p-5 space-y-4">
              {/* Buyer / Company Contact Select */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  બાયર વેપારી (Buyer Company) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={manualForm.buyer_contact_id}
                  onChange={(e) => {
                    const c = buyerContacts.find((b) => b.id.toString() === e.target.value);
                    setManualForm({
                      ...manualForm,
                      buyer_contact_id: e.target.value,
                      buyer_name: c ? c.name : '',
                      buyer_city: c ? c.city || '' : '',
                      buyer_phone: c ? c.mobile_1 || c.phone_office_1 || '' : '',
                      due_days: (c as any)?.credit_days || 15,
                    });
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
                  required
                >
                  <option value="">-- બાયર વેપારી પસંદ કરો --</option>
                  {buyerContacts.map((b) => (
                    <option key={b.id} value={b.id}>
                      [{b.code}] {b.name} {b.city ? `(${b.city})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mill / Supplier Select */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  મિલ / સપ્લાયર (Mill Partner)
                </label>
                <select
                  value={manualForm.company_contact_id}
                  onChange={(e) => {
                    const m = millContacts.find((s) => s.id.toString() === e.target.value);
                    setManualForm({
                      ...manualForm,
                      company_contact_id: e.target.value,
                      seller_name: m ? m.name : '',
                    });
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                >
                  <option value="">-- મિલ પસંદ કરો --</option>
                  {millContacts.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.city ? `(${m.city})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Bill Number & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    બિલ નંબર <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={manualForm.bill_number}
                    onChange={(e) => setManualForm({ ...manualForm, bill_number: e.target.value })}
                    placeholder="e.g. 1045"
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    બિલ તારીખ
                  </label>
                  <input
                    type="date"
                    value={manualForm.bill_date}
                    onChange={(e) => setManualForm({ ...manualForm, bill_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold"
                  />
                </div>
              </div>

              {/* Amount & Credit Days */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    બિલ રકમ (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={manualForm.billed_amount}
                    onChange={(e) => setManualForm({ ...manualForm, billed_amount: e.target.value })}
                    placeholder="e.g. 500000"
                    required
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    ક્રેડિટ મુદત (Due Days)
                  </label>
                  <input
                    type="number"
                    value={manualForm.due_days}
                    onChange={(e) => setManualForm({ ...manualForm, due_days: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  વિગત / નોંધ (Item Notes)
                </label>
                <input
                  type="text"
                  value={manualForm.notes}
                  onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
                  placeholder="દા.ત. 500 ગુણી કપાસ ખોળ"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsManualAddOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 cursor-pointer"
                >
                  રદ કરો (Cancel)
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-[#0B3B24] rounded-xl hover:bg-[#124b30] shadow-sm cursor-pointer"
                >
                  બિલ સાચવો (Save Bill)
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
