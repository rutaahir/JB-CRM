import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Building2,
  Calendar,
  FileSpreadsheet,
  Search,
  Filter,
  Check,
  UserPlus,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  History,
  Eye,
  AlertCircle,
  Package,
  Layers,
  Phone,
  PhoneCall,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ArrowRight,
  X,
  Building,
  User,
  Send,
} from 'lucide-react';
import { apiClient } from '@/api/client';
import {
  Contact,
  PendingOrderExtractedRow,
  PendingOrderSummary,
  PendingOrderReport,
  PendingOrderRecord,
} from '@/types';
import { toast } from 'sonner';

interface MillPendingGroup {
  company_name: string;
  company_phone: string;
  company_code: string;
  company_contact_id?: number | null;
  total_orders: number;
  total_order_bags: number;
  total_dispatched_bags: number;
  total_pending_bags: number;
  max_days_pending: number;
  oldest_order_date: string;
  buyer_names: string[];
  orders: PendingOrderRecord[];
}

interface VepariPendingGroup {
  party_name: string;
  buyer_name: string;
  city: string;
  buyer_phone: string;
  buyer_code: string;
  buyer_contact_id?: number | null;
  total_orders: number;
  total_order_bags: number;
  total_dispatched_bags: number;
  total_pending_bags: number;
  max_days_pending: number;
  oldest_order_date: string;
  mills: string[];
  orders: PendingOrderRecord[];
}

export const PendingOrdersPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'upload' | 'register' | 'history'>('upload');

  // Register sub-tab: 'mills' (Mill tracker) | 'veparis' (Vepari tracker) | 'orders' (Detailed list)
  const [registerView, setRegisterView] = useState<'mills' | 'veparis' | 'orders'>('mills');

  // Mills list for company select
  const [mills, setMills] = useState<Contact[]>([]);
  const [selectedMillId, setSelectedMillId] = useState<string>('');
  const [customCompanyName, setCustomCompanyName] = useState<string>('');
  const [reportDate, setReportDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [ocrText, setOcrText] = useState<string>('');
  const [showOcrInput, setShowOcrInput] = useState<boolean>(false);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);

  // Extracted Result state
  const [statementId, setStatementId] = useState<number | null>(null);
  const [extractedRows, setExtractedRows] = useState<PendingOrderExtractedRow[]>([]);
  const [summary, setSummary] = useState<PendingOrderSummary | null>(null);
  const [comparison, setComparison] = useState<any>(null);
  const [duplicateNotice, setDuplicateNotice] = useState<string>('');
  const [isApproved, setIsApproved] = useState<boolean>(false);
  const [isApproving, setIsApproving] = useState<boolean>(false);

  // Quick contact modal
  const [addingPartyRow, setAddingPartyRow] = useState<PendingOrderExtractedRow | null>(null);
  const [newContactPhone, setNewContactPhone] = useState<string>('');
  const [isSavingContact, setIsSavingContact] = useState<boolean>(false);

  // Filter / Search for extracted table
  const [extractedSearch, setExtractedSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [comparisonFilter, setComparisonFilter] = useState<string>('ALL');

  // Live Register State
  const [liveOrders, setLiveOrders] = useState<PendingOrderRecord[]>([]);
  const [isLoadingLive, setIsLoadingLive] = useState<boolean>(false);
  const [liveCompanyFilter, setLiveCompanyFilter] = useState<string>('ALL');
  const [liveStatusFilter, setLiveStatusFilter] = useState<string>('ALL');
  const [liveSearch, setLiveSearch] = useState<string>('');

  // Accordion expansion states
  const [expandedMills, setExpandedMills] = useState<Record<string, boolean>>({});
  const [expandedVeparis, setExpandedVeparis] = useState<Record<string, boolean>>({});

  // Call modal state
  const [callModalData, setCallModalData] = useState<{
    name: string;
    role: string;
    phone: string;
  } | null>(null);

  // History State
  const [reportsHistory, setReportsHistory] = useState<PendingOrderReport[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch Mills on mount
  useEffect(() => {
    fetchMills();
  }, []);

  const fetchMills = async () => {
    try {
      const res = await apiClient.get('/contacts/?page_size=200');
      const list = res.data.results || res.data || [];
      const mList = list.filter(
        (c: Contact) => c.party_type === 'COMPANY_MILL' || (c.party_type as any) === 'SELLER'
      );
      setMills(mList);
    } catch (err) {
      console.error('Failed to fetch mills:', err);
    }
  };

  const fetchLiveOrders = async () => {
    try {
      setIsLoadingLive(true);
      const res = await apiClient.get('/pending-orders/?page_size=500');
      const list = res.data.results || res.data || [];
      setLiveOrders(list);
    } catch (err) {
      toast.error('Failed to load pending orders register');
    } finally {
      setIsLoadingLive(false);
    }
  };

  const fetchHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const res = await apiClient.get('/pending-orders/reports/');
      setReportsHistory(res.data || []);
    } catch (err) {
      toast.error('Failed to load report history');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'register') {
      fetchLiveOrders();
    } else if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab]);

  // Handle File Change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  // Upload and Extract Handler
  const handleExtract = async () => {
    if (!file && !ocrText.trim()) {
      toast.error('કૃપા કરીને PDF ફાઇલ પસંદ કરો અથવા OCR ટેક્સ્ટ દાખલ કરો.');
      return;
    }

    const selectedMill = mills.find((m) => String(m.id) === selectedMillId);
    const compName = customCompanyName.trim() || selectedMill?.name || '';

    const formData = new FormData();
    if (file) {
      formData.append('file', file);
    }
    if (ocrText.trim()) {
      formData.append('ocr_text', ocrText.trim());
    }
    if (selectedMillId) {
      formData.append('company_contact_id', selectedMillId);
    }
    if (compName) {
      formData.append('company_name', compName);
    }
    formData.append('report_date', reportDate);

    try {
      setIsExtracting(true);
      setDuplicateNotice('');
      setIsApproved(false);

      const res = await apiClient.post('/pending-orders/upload-pdf/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const data = res.data;
      setStatementId(data.statement_id);
      setExtractedRows(data.records || []);
      setSummary(data.summary || null);
      setComparison(data.comparison || null);

      if (data.is_duplicate && data.duplicate_message) {
        setDuplicateNotice(data.duplicate_message);
      }

      toast.success(`${data.records?.length || 0} ઓર્ડર સફળતાપૂર્વક મેળવી લેવાયા!`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to parse and extract PDF.');
    } finally {
      setIsExtracting(false);
    }
  };

  // Quick Add Contact Handler
  const handleQuickAddContact = async () => {
    if (!addingPartyRow) return;

    try {
      setIsSavingContact(true);
      const res = await apiClient.post('/pending-orders/quick-add-contact/', {
        party_name: addingPartyRow.party_name,
        city: addingPartyRow.city,
        phone: newContactPhone.trim() || '9999999999',
        statement_id: statementId,
      });

      const newContact = res.data.contact;
      toast.success(`વેપારી [${newContact.code}] ${newContact.name} સફળતાપૂર્વક ઉમેરાયા!`);

      // Update extractedRows state locally
      setExtractedRows((prev) =>
        prev.map((r) =>
          r.party_name.toLowerCase() === addingPartyRow.party_name.toLowerCase()
            ? {
                ...r,
                contact_id: newContact.id,
                contact_code: newContact.code,
                contact_name: newContact.name,
                is_new_party: false,
                match_confidence: 1.0,
              }
            : r
        )
      );

      setAddingPartyRow(null);
      setNewContactPhone('');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to add contact.');
    } finally {
      setIsSavingContact(false);
    }
  };

  // Approve & Save into CRM Pending Order Register
  const handleApprove = async () => {
    if (!statementId) return;

    try {
      setIsApproving(true);
      const res = await apiClient.post(`/pending-orders/approve/${statementId}/`, {
        records: extractedRows,
      });

      toast.success(res.data.message || 'ઓર્ડર સફળતાપૂર્વક CRM માં સેવ થયા!');
      setIsApproved(true);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to approve and sync orders.');
    } finally {
      setIsApproving(false);
    }
  };

  // Reset form to upload next company
  const handleUploadNextCompany = () => {
    setFile(null);
    setOcrText('');
    setExtractedRows([]);
    setSummary(null);
    setComparison(null);
    setDuplicateNotice('');
    setIsApproved(false);
    setSelectedMillId('');
    setCustomCompanyName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast.info('નવી કંપનીનો દૈનિક રિપોર્ટ અપલોડ કરવા તૈયાર!');
  };

  // Filtered rows for Tab 1
  const filteredExtractedRows = useMemo(() => {
    return extractedRows.filter((r) => {
      const searchMatch =
        !extractedSearch ||
        r.party_name.toLowerCase().includes(extractedSearch.toLowerCase()) ||
        r.city.toLowerCase().includes(extractedSearch.toLowerCase()) ||
        r.product.toLowerCase().includes(extractedSearch.toLowerCase());

      const statusMatch =
        statusFilter === 'ALL' || r.status.toLowerCase() === statusFilter.toLowerCase();

      const compMatch =
        comparisonFilter === 'ALL' ||
        r.comparison_status.toUpperCase() === comparisonFilter.toUpperCase();

      return searchMatch && statusMatch && compMatch;
    });
  }, [extractedRows, extractedSearch, statusFilter, comparisonFilter]);

  // Filtered live register orders for Tab 2
  const filteredLiveOrders = useMemo(() => {
    return liveOrders.filter((o) => {
      const searchMatch =
        !liveSearch ||
        o.party_name?.toLowerCase().includes(liveSearch.toLowerCase()) ||
        o.buyer_name?.toLowerCase().includes(liveSearch.toLowerCase()) ||
        o.company_name?.toLowerCase().includes(liveSearch.toLowerCase()) ||
        o.city?.toLowerCase().includes(liveSearch.toLowerCase()) ||
        o.product_name?.toLowerCase().includes(liveSearch.toLowerCase());

      const companyMatch =
        liveCompanyFilter === 'ALL' ||
        o.company_name?.toLowerCase() === liveCompanyFilter.toLowerCase();

      const statusMatch =
        liveStatusFilter === 'ALL' || o.status?.toLowerCase() === liveStatusFilter.toLowerCase();

      return searchMatch && companyMatch && statusMatch;
    });
  }, [liveOrders, liveSearch, liveCompanyFilter, liveStatusFilter]);

  // Group by Mill / Company ("કઈ મિલમાંથી સ્ટોક ડિલિવર થવાનો બાકી છે")
  const millGroups = useMemo<MillPendingGroup[]>(() => {
    const map = new Map<string, MillPendingGroup>();

    filteredLiveOrders.forEach((o) => {
      const compKey = o.company_name?.trim() || 'Other Mill';
      const existing = map.get(compKey);
      const pendingQty = Number(o.pending_quantity) || 0;
      const orderQty = Number(o.order_quantity) || 0;
      const dispatchQty = Number(o.dispatch_quantity) || 0;
      const days = Number(o.days_pending) || 0;
      const bName = o.party_name || o.buyer_name || 'Buyer';

      if (!existing) {
        map.set(compKey, {
          company_name: compKey,
          company_phone: o.company_phone || '',
          company_code: o.company_code || '',
          company_contact_id: o.company_contact,
          total_orders: 1,
          total_order_bags: orderQty,
          total_dispatched_bags: dispatchQty,
          total_pending_bags: pendingQty,
          max_days_pending: days,
          oldest_order_date: o.order_date,
          buyer_names: [bName],
          orders: [o],
        });
      } else {
        existing.total_orders += 1;
        existing.total_order_bags += orderQty;
        existing.total_dispatched_bags += dispatchQty;
        existing.total_pending_bags += pendingQty;
        if (days > existing.max_days_pending) {
          existing.max_days_pending = days;
        }
        if (!existing.company_phone && o.company_phone) {
          existing.company_phone = o.company_phone;
        }
        if (!existing.buyer_names.includes(bName)) {
          existing.buyer_names.push(bName);
        }
        existing.orders.push(o);
      }
    });

    return Array.from(map.values()).sort(
      (a, b) => b.total_pending_bags - a.total_pending_bags
    );
  }, [filteredLiveOrders]);

  // Group by Vepari / Buyer ("કયા વેપારીનો ઓર્ડર પેન્ડિંગ છે")
  const vepariGroups = useMemo<VepariPendingGroup[]>(() => {
    const map = new Map<string, VepariPendingGroup>();

    filteredLiveOrders.forEach((o) => {
      const vKey = o.party_name?.trim() || o.buyer_name?.trim() || 'Unknown Vepari';
      const existing = map.get(vKey);
      const pendingQty = Number(o.pending_quantity) || 0;
      const orderQty = Number(o.order_quantity) || 0;
      const dispatchQty = Number(o.dispatch_quantity) || 0;
      const days = Number(o.days_pending) || 0;
      const millName = o.company_name?.trim() || 'Mill';
      const city = o.city || o.buyer_city || '';

      if (!existing) {
        map.set(vKey, {
          party_name: vKey,
          buyer_name: o.buyer_name || vKey,
          city: city,
          buyer_phone: o.buyer_phone || '',
          buyer_code: o.buyer_code || '',
          buyer_contact_id: o.buyer_contact,
          total_orders: 1,
          total_order_bags: orderQty,
          total_dispatched_bags: dispatchQty,
          total_pending_bags: pendingQty,
          max_days_pending: days,
          oldest_order_date: o.order_date,
          mills: [millName],
          orders: [o],
        });
      } else {
        existing.total_orders += 1;
        existing.total_order_bags += orderQty;
        existing.total_dispatched_bags += dispatchQty;
        existing.total_pending_bags += pendingQty;
        if (days > existing.max_days_pending) {
          existing.max_days_pending = days;
        }
        if (!existing.buyer_phone && o.buyer_phone) {
          existing.buyer_phone = o.buyer_phone;
        }
        if (!existing.city && city) {
          existing.city = city;
        }
        if (!existing.mills.includes(millName)) {
          existing.mills.push(millName);
        }
        existing.orders.push(o);
      }
    });

    return Array.from(map.values()).sort(
      (a, b) => b.total_pending_bags - a.total_pending_bags
    );
  }, [filteredLiveOrders]);

  // Overall Live KPIs
  const liveKpis = useMemo(() => {
    let pendingBags = 0;
    let dispatchBags = 0;
    let criticalCount = 0;

    filteredLiveOrders.forEach((o) => {
      const p = Number(o.pending_quantity) || 0;
      const d = Number(o.dispatch_quantity) || 0;
      pendingBags += p;
      dispatchBags += d;
      if ((o.days_pending || 0) >= 7 && p > 0) {
        criticalCount += 1;
      }
    });

    return {
      totalPendingBags: pendingBags,
      totalDispatchedBags: dispatchBags,
      totalOrders: filteredLiveOrders.length,
      millsCount: millGroups.length,
      veparisCount: vepariGroups.length,
      criticalOrdersCount: criticalCount,
    };
  }, [filteredLiveOrders, millGroups, vepariGroups]);

  // WhatsApp Follow-up to Mill (Asking about pending stock delivery)
  const handleWhatsAppMill = (mg: MillPendingGroup) => {
    const todayStr = new Date().toLocaleDateString('gu-IN');
    const orderLines = mg.orders
      .filter((o) => Number(o.pending_quantity) > 0)
      .slice(0, 8)
      .map(
        (o, i) =>
          `${i + 1}. ${o.party_name || o.buyer_name}: *${Number(o.pending_quantity).toLocaleString()} BAG* (${o.product_name})`
      )
      .join('\n');

    const moreText =
      mg.orders.filter((o) => Number(o.pending_quantity) > 0).length > 8
        ? `\n... અને બીજા ${mg.orders.length - 8} ઓર્ડર્સ`
        : '';

    const text =
      `*જલારામ બ્રોકર્સ - દૈનિક પેન્ડિંગ સ્ટોક ડિસ્પેચ રિપોર્ટ*\n` +
      `તારીખ: ${todayStr}\n` +
      `મિલ / કંપની: *${mg.company_name}*\n\n` +
      `નમસ્તે જી, આપણી મિલમાંથી નીચે મુજબના વેપારીઓના ઓર્ડર ડિલિવરી માટે બાકી છે:\n\n` +
      `${orderLines}${moreText}\n\n` +
      `*કુલ બાકી સ્ટોક: ${mg.total_pending_bags.toLocaleString()} BAG*\n` +
      `કુલ ઓર્ડર્સ: ${mg.total_orders} (${mg.buyer_names.length} વેપારીઓ)\n\n` +
      `મહેરબાની કરીને આ સ્ટોક ક્યારે ડિસ્પેચ થશે તે જણાવવા વિનંતી જેથી વેપારીઓને જાણ કરી શકાય.\n` +
      `આભાર,\n*જલારામ બ્રોકર્સ*`;

    let phone = (mg.company_phone || '').replace(/\D/g, '');
    if (!phone) {
      phone = prompt('કૃપા કરીને મિલ પ્રતિનિધિનો મોબાઇલ નંબર દાખલ કરો (10 અંક):', '') || '';
      phone = phone.replace(/\D/g, '');
    }

    if (!phone) {
      toast.error('મોબાઇલ નંબર મળ્યો નથી.');
      return;
    }
    if (phone.length === 10) phone = '91' + phone;

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    toast.success(`${mg.company_name} ને WhatsApp સંદેશ મોકલવા તૈયાર!`);
  };

  // WhatsApp Update to Vepari (Informing about pending order delivery status)
  const handleWhatsAppVepari = (vg: VepariPendingGroup) => {
    const orderLines = vg.orders
      .filter((o) => Number(o.pending_quantity) > 0)
      .slice(0, 6)
      .map(
        (o, i) =>
          `• ${o.company_name}: *${Number(o.pending_quantity).toLocaleString()} BAG* (${o.product_name}) - ઓર્ડર: ${o.order_date}`
      )
      .join('\n');

    const text =
      `*જલારામ બ્રોકર્સ - ઓર્ડર ડિલિવરી અપડેટ*\n` +
      `વેપારી: *${vg.party_name}* ${vg.city ? `(${vg.city})` : ''}\n\n` +
      `નમસ્તે જી, આપના નીચે મુજબના ઓર્ડર્સ મિલમાંથી રવાના થવાના બાકી છે:\n\n` +
      `${orderLines}\n\n` +
      `*કુલ બાકી માલ: ${vg.total_pending_bags.toLocaleString()} BAG*\n\n` +
      `અમે મિલ સાથે આપનો માલ ઝડપથી રવાના કરાવવા સતત સંપર્કમાં છીએ. ગાડી ભરાતાં જ આપને તરત જાણ કરવામાં આવશે.\n` +
      `આભાર,\n*જલારામ બ્રોકર્સ*`;

    let phone = (vg.buyer_phone || '').replace(/\D/g, '');
    if (!phone) {
      phone = prompt('કૃપા કરીને વેપારીનો મોબાઇલ નંબર દાખલ કરો (10 અંક):', '') || '';
      phone = phone.replace(/\D/g, '');
    }

    if (!phone) {
      toast.error('મોબાઇલ નંબર મળ્યો નથી.');
      return;
    }
    if (phone.length === 10) phone = '91' + phone;

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    toast.success(`${vg.party_name} ને WhatsApp અપડેટ મોકલવા તૈયાર!`);
  };

  // Trigger Phone Call
  const handleInitiateCall = (name: string, role: string, phone?: string) => {
    let clean = (phone || '').replace(/\D/g, '');
    if (!clean) {
      clean = prompt(`કૃપા કરીને ${name} નો ફોન નંબર દાખલ કરો:`, '') || '';
      clean = clean.replace(/\D/g, '');
    }
    if (!clean) {
      toast.error('ફોન નંબર ઉપલબ્ધ નથી.');
      return;
    }
    window.open(`tel:${clean}`, '_self');
  };

  // Export Extracted to CSV
  const handleExportCSV = () => {
    if (!extractedRows.length) return;

    const headers = [
      'Order Date',
      'Party Name',
      'City',
      'Product',
      'Total Bags',
      'Rate',
      'Dispatch Bags',
      'Pending Bags',
      'Status',
      'Matched Contact',
    ];

    const rows = extractedRows.map((r) => [
      `"${r.date}"`,
      `"${r.party_name}"`,
      `"${r.city}"`,
      `"${r.product}"`,
      r.total_bag,
      r.rate,
      r.dispatch_bag,
      r.pending_bag,
      `"${r.status}"`,
      `"${r.contact_name || 'NEW'}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Pending_Orders_${customCompanyName || 'Report'}_${reportDate}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12">
      {/* ======================================================== */}
      {/* Header Banner */}
      {/* ======================================================== */}
      <div className="bg-gradient-to-r from-forest-950 via-forest-900 to-forest-800 text-white rounded-2xl p-5 md:p-6 shadow-md border border-forest-800/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-amber-400 text-forest-950">
                DAILY PENDING ORDER TRACKER
              </span>
              <span className="text-xs text-forest-200">દૈનિક મિલ અને વેપારી પેન્ડિંગ ઓર્ડર</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
              Daily Pending Orders & Stock Delivery
            </h1>
            <p className="text-xs text-forest-200/90 mt-1 max-w-2xl">
              10+ કંપનીઓના દૈનિક પેન્ડિંગ ઓર્ડર રિપોર્ટ્સ PDF અપલોડ કરો, કઈ મિલનો માલ બાકી છે અને
              કયા વેપારીને ડિલિવરી આપવાની છે તે એક જ જગ્યાએથી WhatsApp & Call સાથે ટ્રેક કરો.
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1.5 bg-black/30 p-1.5 rounded-xl border border-white/10 self-start md:self-center">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-amber-400 text-forest-950 shadow-sm font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <UploadCloud size={15} />
              <span>Daily PDF Upload</span>
            </button>
            <button
              onClick={() => setActiveTab('register')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'register'
                  ? 'bg-amber-400 text-forest-950 shadow-sm font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <Layers size={15} />
              <span>Live Delivery Tracker</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-amber-400 text-forest-950 shadow-sm font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <History size={15} />
              <span>Reports Archive</span>
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: PDF Extractor & Multi-Company Upload */}
      {/* ======================================================== */}
      {activeTab === 'upload' && (
        <div className="space-y-6">
          {/* Upload Configuration Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Building2 size={18} className="text-forest-800" />
                <span>1. Select Company / Mill & Upload Daily PDF (કંપનીવાર દૈનિક અપલોડ)</span>
              </h2>

              {isApproved && (
                <button
                  type="button"
                  onClick={handleUploadNextCompany}
                  className="px-3.5 py-1.5 bg-forest-900 text-white rounded-xl text-xs font-bold hover:bg-forest-800 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw size={13} />
                  <span>+ Upload Next Company Report (બીજી કંપની રિપોર્ટ)</span>
                </button>
              )}
            </div>

            {/* Quick Mill Selector Chips for Fast 10-Company Upload */}
            {mills.length > 0 && (
              <div className="mb-4 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <p className="text-[11px] font-bold text-slate-600 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                  <Building size={13} className="text-forest-700" />
                  <span>ઝડપી કંપની પસંદગી (Quick Select Mill):</span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {mills.slice(0, 10).map((m) => {
                    const isSelected = String(m.id) === selectedMillId;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setSelectedMillId(String(m.id));
                          setCustomCompanyName(m.name);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-forest-900 text-white border-forest-900 shadow-sm font-bold'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {m.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* Mill / Company select */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Company / Mill Name (કંપની / મિલ) *
                </label>
                <select
                  value={selectedMillId}
                  onChange={(e) => {
                    setSelectedMillId(e.target.value);
                    if (e.target.value) {
                      const m = mills.find((mill) => String(mill.id) === e.target.value);
                      if (m) setCustomCompanyName(m.name);
                    }
                  }}
                  className="w-full text-xs rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:border-forest-800 focus:ring-forest-800/20 py-2.5 px-3 font-semibold text-slate-800"
                >
                  <option value="">-- મિલ માસ્ટરમાંથી પસંદ કરો --</option>
                  {mills.map((m) => (
                    <option key={m.id} value={m.id}>
                      [{m.code}] {m.name} {m.city ? `(${m.city})` : ''}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="અથવા નવી કંપનીનું નામ લખો..."
                  value={customCompanyName}
                  onChange={(e) => setCustomCompanyName(e.target.value)}
                  className="mt-2 w-full text-xs rounded-xl border-slate-200 bg-slate-50 focus:bg-white py-2 px-3 placeholder:text-slate-400 font-medium"
                />
              </div>

              {/* Report Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Report Date (રિપોર્ટ તારીખ) *
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                    className="w-full text-xs rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:border-forest-800 py-2.5 px-3 font-semibold text-slate-800"
                  />
                  <Calendar
                    size={16}
                    className="absolute right-3 top-3 text-slate-400 pointer-events-none"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  આજની તારીખ અથવા મિલના પેન્ડિંગ સ્ટેટમેન્ટની તારીખ
                </p>
              </div>

              {/* Extractor Mode / Direct OCR toggle */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  ઇનપુટ પદ્ધતિ (Format)
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowOcrInput(false)}
                    className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                      !showOcrInput
                        ? 'bg-forest-900 text-white border-forest-900 shadow-sm'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    PDF Upload (ઓટો)
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowOcrInput(true)}
                    className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                      showOcrInput
                        ? 'bg-forest-900 text-white border-forest-900 shadow-sm'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Paste Text / OCR
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  મિલની સીધી PDF અથવા વોટ્સએપ ટેક્સ્ટ પેસ્ટ કરો
                </p>
              </div>
            </div>

            {/* PDF Upload Dropzone */}
            {!showOcrInput ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 hover:border-forest-700 rounded-2xl p-7 text-center cursor-pointer transition-all bg-slate-50/50 hover:bg-forest-50/30 flex flex-col items-center justify-center gap-2.5"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf"
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-2xl bg-forest-100 text-forest-800 flex items-center justify-center shadow-inner">
                  <UploadCloud size={24} />
                </div>
                {file ? (
                  <div>
                    <p className="text-xs font-bold text-slate-800">{file.name}</p>
                    <p className="text-[11px] text-slate-500">
                      {(file.size / 1024).toFixed(1)} KB - ફાઇલ બદલવા ક્લિક કરો
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-bold text-slate-700">
                      મિલનો દૈનિક પેન્ડિંગ ઓર્ડર PDF અહીં ડ્રોપ કરો અથવા સિલેક્ટ કરો
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      શ્રી વિજય, ગોકુલ, શ્યામ વગેરે મિલ ફોર્મેટ્સ ઓટોમેટિક ઓળખાઈ જાય છે
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <textarea
                  rows={5}
                  value={ocrText}
                  onChange={(e) => setOcrText(e.target.value)}
                  placeholder="Paste pending order table text or WhatsApp dispatch message..."
                  className="w-full text-xs font-mono rounded-xl border-slate-200 bg-slate-50 focus:bg-white p-3 text-slate-800"
                />
              </div>
            )}

            {/* Extract Action Button */}
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {duplicateNotice && (
                  <span className="text-amber-600 font-medium flex items-center gap-1">
                    <AlertTriangle size={14} /> {duplicateNotice}
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={handleExtract}
                disabled={isExtracting || (!file && !ocrText.trim())}
                className="px-5 py-2.5 bg-forest-900 text-white rounded-xl text-xs font-bold hover:bg-forest-800 transition-all shadow-sm hover:shadow flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isExtracting ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>PDF ડેટા ફેચ થઈ રહ્યો છે...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={15} className="text-amber-400" />
                    <span>Extract & Fetch PDF Data (ડેટા ફેચ કરો)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ======================================================== */}
          {/* Extracted Data Section */}
          {/* ======================================================== */}
          {extractedRows.length > 0 && (
            <div className="space-y-4 animate-fadeIn">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                    <span>Total Orders</span>
                    <Package size={16} className="text-slate-400" />
                  </div>
                  <p className="text-2xl font-black text-slate-800">
                    {summary?.total_orders || extractedRows.length}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">રિપોર્ટમાંથી ફેચ થયેલા ઓર્ડર્સ</p>
                </div>

                <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200/80 shadow-sm">
                  <div className="flex items-center justify-between text-amber-800 text-xs mb-1 font-semibold">
                    <span>Pending Quantity</span>
                    <Clock size={16} className="text-amber-600" />
                  </div>
                  <p className="text-2xl font-black text-amber-900">
                    {summary?.total_pending_bags.toLocaleString() || '0'}{' '}
                    <span className="text-xs font-semibold">BAG</span>
                  </p>
                  <p className="text-[11px] text-amber-700/80 mt-1">મિલમાંથી રવાના થવાનો બાકી માલ</p>
                </div>

                <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200/80 shadow-sm">
                  <div className="flex items-center justify-between text-emerald-800 text-xs mb-1 font-semibold">
                    <span>Dispatched Quantity</span>
                    <CheckCircle2 size={16} className="text-emerald-600" />
                  </div>
                  <p className="text-2xl font-black text-emerald-900">
                    {summary?.total_dispatched_bags.toLocaleString() || '0'}{' '}
                    <span className="text-xs font-semibold">BAG</span>
                  </p>
                  <p className="text-[11px] text-emerald-700/80 mt-1">વેપારીઓને રવાના થઈ ગયેલ</p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between text-slate-600 text-xs mb-1">
                    <span>Party Matching</span>
                    <UserPlus size={16} className="text-slate-500" />
                  </div>
                  <p className="text-2xl font-black text-slate-800">
                    {summary?.matched_parties_count || 0}{' '}
                    <span className="text-xs font-normal text-slate-500">
                      / {summary?.total_orders || extractedRows.length}
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {summary?.new_parties_count ? (
                      <span className="text-amber-700 font-semibold">
                        {summary.new_parties_count} નવી પાર્ટી (Auto-detect)
                      </span>
                    ) : (
                      'તમામ પાર્ટી CRM સાથે લિન્ક થઈ ગઈ'
                    )}
                  </p>
                </div>
              </div>

              {/* Comparison Banner (Old vs New PDF) */}
              {comparison && comparison.has_previous_comparison && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 text-white rounded-xl shadow-sm">
                      <RefreshCw size={20} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-blue-950 uppercase tracking-wider">
                        PDF Comparison with Previous Report ({comparison.previous_statement_date})
                      </h4>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-blue-800">
                        <span className="flex items-center gap-1 font-semibold">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          {comparison.completed_orders_count} Completed Orders
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 font-semibold">
                          <span className="w-2 h-2 rounded-full bg-blue-500" />
                          {comparison.partially_dispatched_count} Partial Dispatches
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 font-semibold">
                          <span className="w-2 h-2 rounded-full bg-purple-500" />
                          {comparison.new_orders_count} New Orders
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono bg-blue-100 text-blue-800 px-2.5 py-1 rounded-lg">
                    Autopilot Matched
                  </span>
                </div>
              )}

              {/* Interactive Table Container */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Table Header Filter & Action Bar */}
                <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/60">
                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Search */}
                    <div className="relative w-64">
                      <Search
                        size={15}
                        className="absolute left-3 top-2.5 text-slate-400 pointer-events-none"
                      />
                      <input
                        type="text"
                        placeholder="Search party, city, product..."
                        value={extractedSearch}
                        onChange={(e) => setExtractedSearch(e.target.value)}
                        className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl border-slate-200 bg-white"
                      />
                    </div>

                    {/* Status filter */}
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="text-xs rounded-xl border-slate-200 bg-white py-1.5 px-2.5"
                    >
                      <option value="ALL">All Status</option>
                      <option value="Pending">Pending</option>
                      <option value="Dispatch Due">Dispatch Due</option>
                      <option value="Completed">Completed</option>
                    </select>

                    {/* Comparison filter */}
                    <select
                      value={comparisonFilter}
                      onChange={(e) => setComparisonFilter(e.target.value)}
                      className="text-xs rounded-xl border-slate-200 bg-white py-1.5 px-2.5"
                    >
                      <option value="ALL">All Comparison Badges</option>
                      <option value="NEW_ORDER">New Orders</option>
                      <option value="PARTIALLY_DISPATCHED">Partially Dispatched</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="UNCHANGED">Unchanged</option>
                    </select>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleExportCSV}
                      className="px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileSpreadsheet size={14} className="text-emerald-600" />
                      <span>Export CSV</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleApprove}
                      disabled={isApproving || isApproved}
                      className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                        isApproved
                          ? 'bg-emerald-600 text-white cursor-default'
                          : 'bg-forest-900 hover:bg-forest-800 text-white'
                      }`}
                    >
                      {isApproving ? (
                        <>
                          <RefreshCw size={13} className="animate-spin" />
                          <span>Syncing to CRM...</span>
                        </>
                      ) : isApproved ? (
                        <>
                          <Check size={14} />
                          <span>Approved & Synced!</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={14} className="text-amber-400" />
                          <span>Approve & Save into CRM</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-600 font-semibold text-[11px] uppercase border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Party Name (CRM Match)</th>
                        <th className="py-2.5 px-3">City</th>
                        <th className="py-2.5 px-3">Product</th>
                        <th className="py-2.5 px-3 text-right">Order Bags</th>
                        <th className="py-2.5 px-3 text-right">Rate</th>
                        <th className="py-2.5 px-3 text-right">Dispatch</th>
                        <th className="py-2.5 px-3 text-right">Pending Bags</th>
                        <th className="py-2.5 px-3 text-center">Daily Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredExtractedRows.map((row) => (
                        <tr
                          key={row.row_id}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            row.is_new_party ? 'bg-amber-50/20' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                            {row.date}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <div>
                                <p className="font-bold text-slate-800">{row.party_name}</p>
                                {row.contact_name ? (
                                  <p className="text-[11px] text-emerald-700 font-medium">
                                    Linked: [{row.contact_code}] {row.contact_name}
                                  </p>
                                ) : (
                                  <span className="inline-block mt-0.5 text-[10px] font-bold px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded">
                                    New Party
                                  </span>
                                )}
                              </div>
                              {row.is_new_party && !row.contact_id && (
                                <button
                                  type="button"
                                  onClick={() => setAddingPartyRow(row)}
                                  className="ml-auto px-2 py-0.5 bg-forest-900 text-white rounded text-[10px] font-bold hover:bg-forest-800 shadow-xs cursor-pointer flex items-center gap-1"
                                >
                                  <UserPlus size={10} /> Add
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">{row.city || '-'}</td>
                          <td className="py-2.5 px-3 text-slate-700 font-medium">{row.product}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-800">
                            {row.total_bag?.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                            ₹{row.rate}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-semibold">
                            {row.dispatch_bag?.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-amber-800 font-bold bg-amber-50/30">
                            {row.pending_bag?.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            {row.comparison_status === 'NEW_ORDER' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                                New Order
                              </span>
                            ) : row.comparison_status === 'PARTIALLY_DISPATCHED' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                                Dispatched
                              </span>
                            ) : row.comparison_status === 'COMPLETED' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                Completed
                              </span>
                            ) : (
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  row.status === 'Completed'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : row.status === 'Dispatch Due'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {row.status}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: Live Delivery & Pending Order Tracker */}
      {/* ======================================================== */}
      {activeTab === 'register' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs mb-1 font-semibold">
                <span>કુલ બાકી સ્ટોક (Pending Bags)</span>
                <Clock size={16} className="text-amber-600" />
              </div>
              <p className="text-2xl font-black text-amber-900">
                {liveKpis.totalPendingBags.toLocaleString()}{' '}
                <span className="text-xs font-semibold">BAG</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {liveKpis.totalOrders} કુલ પેન્ડિંગ ઓર્ડર્સ
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs mb-1 font-semibold">
                <span>બાકી ડિલિવરી વાળી મિલો (Mills)</span>
                <Building2 size={16} className="text-forest-700" />
              </div>
              <p className="text-2xl font-black text-forest-950">
                {liveKpis.millsCount}{' '}
                <span className="text-xs font-semibold text-slate-500">કંપનીઓ</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">જેમનો માલ હજુ રવાના થયો નથી</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs mb-1 font-semibold">
                <span>માલની રાહ જોતા વેપારી (Buyers)</span>
                <User size={16} className="text-blue-600" />
              </div>
              <p className="text-2xl font-black text-blue-950">
                {liveKpis.veparisCount}{' '}
                <span className="text-xs font-semibold text-slate-500">વેપારી</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">ડિલિવરીની રાહમાં રહેલા પક્ષકારો</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs mb-1 font-semibold">
                <span>અતિ મહત્વના ઓર્ડર (&gt;7 Days)</span>
                <AlertTriangle size={16} className="text-rose-600" />
              </div>
              <p className="text-2xl font-black text-rose-700">
                {liveKpis.criticalOrdersCount}{' ताત્કાલિક'}
              </p>
              <p className="text-[11px] text-rose-600/80 mt-0.5">7 દિવસથી વધુ જૂના પેન્ડિંગ ઓર્ડર</p>
            </div>
          </div>

          {/* Main Container */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-5 space-y-4">
            {/* Sub-view switcher and search bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              {/* Tracker Mode Switcher */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setRegisterView('mills')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    registerView === 'mills'
                      ? 'bg-forest-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <Building2 size={14} />
                  <span>મિલ સ્ટોક ડિલિવરી ટ્રેકર ({millGroups.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRegisterView('veparis')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    registerView === 'veparis'
                      ? 'bg-forest-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <User size={14} />
                  <span>વેપારી પેન્ડિંગ ઓર્ડર ({vepariGroups.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRegisterView('orders')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    registerView === 'orders'
                      ? 'bg-forest-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <Layers size={14} />
                  <span>ઓર્ડર રજિસ્ટર ({filteredLiveOrders.length})</span>
                </button>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-52">
                  <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="મિલ, વેપારી, શહેર શોધો..."
                    value={liveSearch}
                    onChange={(e) => setLiveSearch(e.target.value)}
                    className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl border-slate-200 bg-slate-50 focus:bg-white"
                  />
                </div>

                <select
                  value={liveCompanyFilter}
                  onChange={(e) => setLiveCompanyFilter(e.target.value)}
                  className="text-xs rounded-xl border-slate-200 py-1.5 px-2.5 bg-slate-50 font-medium"
                >
                  <option value="ALL">તમામ મિલો</option>
                  {Array.from(new Set(liveOrders.map((o) => o.company_name).filter(Boolean))).map(
                    (cName) => (
                      <option key={cName} value={cName}>
                        {cName}
                      </option>
                    )
                  )}
                </select>

                <button
                  onClick={fetchLiveOrders}
                  className="p-1.5 text-slate-500 hover:text-slate-800 border rounded-xl hover:bg-slate-50 cursor-pointer"
                  title="રીફ્રેશ"
                >
                  <RefreshCw size={15} className={isLoadingLive ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {/* ======================================================== */}
            {/* VIEW 1: MILL STOCK TRACKER ("કઈ મિલનો કેટલો સ્ટોક ડિલિવર કરવાનો બાકી છે") */}
            {/* ======================================================== */}
            {registerView === 'mills' && (
              <div className="space-y-3">
                <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 size={16} className="text-amber-800" />
                    <p className="text-xs text-amber-950 font-medium">
                      <span className="font-bold">મિલ ડિલિવરી ટ્રેકર:</span> અહીં દર્શાવેલ છે કે કઈ
                      કંપની કે મિલમાંથી હજુ કેટલો માલ રવાના થવાનો બાકી છે. મિલને સીધો વોટ્સએપ મેસેજ
                      મોકલીને ડિસ્પેચ વિગત માંગી શકો છો.
                    </p>
                  </div>
                  <span className="text-[11px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full">
                    {millGroups.length} મિલોમાં સ્ટોક પેન્ડિંગ
                  </span>
                </div>

                {isLoadingLive ? (
                  <div className="py-12 text-center text-slate-400">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
                    <span>મિલ પેન્ડિંગ ડેટા લોડ થઈ રહ્યો છે...</span>
                  </div>
                ) : millGroups.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <Package size={28} className="mx-auto mb-2 opacity-40" />
                    <span>કોઈ પેન્ડિંગ મિલ સ્ટોક મળ્યો નથી.</span>
                  </div>
                ) : (
                  millGroups.map((mg) => {
                    const isExpanded = expandedMills[mg.company_name] ?? false;
                    return (
                      <div
                        key={mg.company_name}
                        className="border border-slate-200 rounded-2xl p-4 bg-white hover:border-slate-300 transition-all shadow-xs"
                      >
                        {/* Header Row */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-forest-900/10 text-forest-900 flex items-center justify-center shrink-0 font-black">
                              <Building2 size={20} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-sm font-black text-slate-800">
                                  {mg.company_name}
                                </h3>
                                {mg.company_code && (
                                  <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                                    {mg.company_code}
                                  </span>
                                )}
                                {mg.max_days_pending >= 7 && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-100 text-rose-800 rounded-full flex items-center gap-1">
                                    <AlertTriangle size={11} /> {mg.max_days_pending} દિવસ પેન્ડિંગ
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">
                                <span className="font-semibold text-slate-700">
                                  {mg.buyer_names.length} વેપારીઓ
                                </span>{' '}
                                રાહ જુએ છે ({mg.buyer_names.slice(0, 3).join(', ')}
                                {mg.buyer_names.length > 3 ? '...' : ''})
                              </p>
                            </div>
                          </div>

                          {/* Stats & Actions */}
                          <div className="flex items-center gap-2 md:gap-4 flex-wrap">
                            <div className="text-right">
                              <p className="text-[10px] text-slate-400 font-semibold uppercase">
                                બાકી સ્ટોક (Pending)
                              </p>
                              <p className="text-lg font-black text-amber-900">
                                {mg.total_pending_bags.toLocaleString()}{' '}
                                <span className="text-xs font-semibold">BAG</span>
                              </p>
                            </div>

                            <div className="h-8 w-px bg-slate-200 hidden md:block" />

                            <div className="flex items-center gap-1.5">
                              {/* WhatsApp Follow-up to Mill */}
                              <button
                                type="button"
                                onClick={() => handleWhatsAppMill(mg)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                                title="મિલને વોટ્સએપ ફોલોઅપ મોકલો"
                              >
                                <MessageSquare size={14} />
                                <span>WhatsApp Mill</span>
                              </button>

                              {/* Call Mill */}
                              <button
                                type="button"
                                onClick={() =>
                                  handleInitiateCall(
                                    mg.company_name,
                                    'Mill Representative',
                                    mg.company_phone
                                  )
                                }
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                                title="મિલ પર કોલ કરો"
                              >
                                <Phone size={14} className="text-slate-600" />
                                <span>Call</span>
                              </button>

                              {/* Expand/Collapse Orders */}
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedMills({
                                    ...expandedMills,
                                    [mg.company_name]: !isExpanded,
                                  })
                                }
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer"
                                title={isExpanded ? 'Hide orders' : 'View orders'}
                              >
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Expandable Order Breakdown */}
                        {isExpanded && (
                          <div className="mt-3.5 pt-3 border-t border-slate-100 overflow-x-auto">
                            <table className="w-full text-xs text-left">
                              <thead className="bg-slate-50 text-slate-500 font-semibold text-[10px] uppercase">
                                <tr>
                                  <th className="py-2 px-2.5">ઓર્ડર તારીખ</th>
                                  <th className="py-2 px-2.5">વેપારી (Buyer)</th>
                                  <th className="py-2 px-2.5">શહેર</th>
                                  <th className="py-2 px-2.5">પ્રોડક્ટ</th>
                                  <th className="py-2 px-2.5 text-right">ઓર્ડર Qty</th>
                                  <th className="py-2 px-2.5 text-right">રવાના (Dispatch)</th>
                                  <th className="py-2 px-2.5 text-right">બાકી (Pending)</th>
                                  <th className="py-2 px-2.5 text-center">દિવસો</th>
                                  <th className="py-2 px-2.5 text-center">સ્થિતિ</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {mg.orders.map((o) => (
                                  <tr key={o.id} className="hover:bg-slate-50/70">
                                    <td className="py-2 px-2.5 font-mono text-slate-600">
                                      {o.order_date}
                                    </td>
                                    <td className="py-2 px-2.5 font-bold text-slate-800">
                                      {o.party_name || o.buyer_name}
                                    </td>
                                    <td className="py-2 px-2.5 text-slate-500">
                                      {o.city || o.buyer_city || '-'}
                                    </td>
                                    <td className="py-2 px-2.5 text-slate-700 font-medium">
                                      {o.product_name}
                                    </td>
                                    <td className="py-2 px-2.5 text-right font-mono text-slate-700">
                                      {Number(o.order_quantity).toLocaleString()}
                                    </td>
                                    <td className="py-2 px-2.5 text-right font-mono text-emerald-700 font-semibold">
                                      {Number(o.dispatch_quantity || 0).toLocaleString()}
                                    </td>
                                    <td className="py-2 px-2.5 text-right font-mono text-amber-800 font-bold bg-amber-50/40">
                                      {Number(o.pending_quantity).toLocaleString()} BAG
                                    </td>
                                    <td className="py-2 px-2.5 text-center">
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                        {o.days_pending || 0}d
                                      </span>
                                    </td>
                                    <td className="py-2 px-2.5 text-center">
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                          o.status === 'Completed'
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : o.status === 'Dispatch Due'
                                            ? 'bg-amber-100 text-amber-800'
                                            : 'bg-slate-100 text-slate-700'
                                        }`}
                                      >
                                        {o.status}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ======================================================== */}
            {/* VIEW 2: VEPARI PENDING TRACKER ("કયા વેપારીનો ઓર્ડર પેન્ડિંગ છે") */}
            {/* ======================================================== */}
            {registerView === 'veparis' && (
              <div className="space-y-3">
                <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-blue-800" />
                    <p className="text-xs text-blue-950 font-medium">
                      <span className="font-bold">વેપારી પેન્ડિંગ ટ્રેકર:</span> અહીં કયા વેપારીનો
                      ઓર્ડર કઈ કઈ મિલમાં પેન્ડિંગ છે તે સ્પષ્ટ જોઈ શકાય છે. વેપારીને એક ક્લિકમાં
                      ડિલિવરી સ્થિતિનો વોટ્સએપ મેસેજ મોકલી શકાય છે.
                    </p>
                  </div>
                  <span className="text-[11px] font-bold text-blue-900 bg-blue-100 px-2 py-0.5 rounded-full">
                    {vepariGroups.length} વેપારીઓ માલની રાહમાં
                  </span>
                </div>

                {isLoadingLive ? (
                  <div className="py-12 text-center text-slate-400">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
                    <span>વેપારી પેન્ડિંગ ઓર્ડર લોડ થઈ રહ્યા છે...</span>
                  </div>
                ) : vepariGroups.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <User size={28} className="mx-auto mb-2 opacity-40" />
                    <span>કોઈ પેન્ડિંગ વેપારી ઓર્ડર મળ્યો નથી.</span>
                  </div>
                ) : (
                  vepariGroups.map((vg) => {
                    const isExpanded = expandedVeparis[vg.party_name] ?? false;
                    return (
                      <div
                        key={vg.party_name}
                        className="border border-slate-200 rounded-2xl p-4 bg-white hover:border-slate-300 transition-all shadow-xs"
                      >
                        {/* Header Row */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-700 flex items-center justify-center shrink-0 font-black">
                              <User size={20} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-sm font-black text-slate-800">
                                  {vg.party_name}
                                </h3>
                                {vg.city && (
                                  <span className="text-[11px] font-semibold text-slate-500">
                                    • {vg.city}
                                  </span>
                                )}
                                {vg.buyer_code && (
                                  <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                                    {vg.buyer_code}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">
                                સપ્લાય મિલો:{' '}
                                <span className="font-semibold text-slate-700">
                                  {vg.mills.join(', ')}
                                </span>{' '}
                                ({vg.total_orders} ઓર્ડર્સ)
                              </p>
                            </div>
                          </div>

                          {/* Stats & Actions */}
                          <div className="flex items-center gap-2 md:gap-4 flex-wrap">
                            <div className="text-right">
                              <p className="text-[10px] text-slate-400 font-semibold uppercase">
                                વેપારીનો બાકી માલ
                              </p>
                              <p className="text-lg font-black text-blue-950">
                                {vg.total_pending_bags.toLocaleString()}{' '}
                                <span className="text-xs font-semibold">BAG</span>
                              </p>
                            </div>

                            <div className="h-8 w-px bg-slate-200 hidden md:block" />

                            <div className="flex items-center gap-1.5">
                              {/* WhatsApp Update to Vepari */}
                              <button
                                type="button"
                                onClick={() => handleWhatsAppVepari(vg)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                                title="વેપારીને ઓર્ડર સ્થિતિ જણાવો"
                              >
                                <MessageSquare size={14} />
                                <span>WhatsApp Vepari</span>
                              </button>

                              {/* Call Vepari */}
                              <button
                                type="button"
                                onClick={() =>
                                  handleInitiateCall(vg.party_name, 'Buyer / Vepari', vg.buyer_phone)
                                }
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                                title="વેપારીને કોલ કરો"
                              >
                                <Phone size={14} className="text-slate-600" />
                                <span>Call</span>
                              </button>

                              {/* Expand/Collapse */}
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedVeparis({
                                    ...expandedVeparis,
                                    [vg.party_name]: !isExpanded,
                                  })
                                }
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer"
                              >
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Expandable Order Breakdown */}
                        {isExpanded && (
                          <div className="mt-3.5 pt-3 border-t border-slate-100 overflow-x-auto">
                            <table className="w-full text-xs text-left">
                              <thead className="bg-slate-50 text-slate-500 font-semibold text-[10px] uppercase">
                                <tr>
                                  <th className="py-2 px-2.5">ઓર્ડર તારીખ</th>
                                  <th className="py-2 px-2.5">મિલ / કંપની (Supplier Mill)</th>
                                  <th className="py-2 px-2.5">પ્રોડક્ટ</th>
                                  <th className="py-2 px-2.5 text-right">ઓર્ડર Bags</th>
                                  <th className="py-2 px-2.5 text-right">રવાના</th>
                                  <th className="py-2 px-2.5 text-right">બાકી Bags</th>
                                  <th className="py-2 px-2.5 text-center">દિવસો</th>
                                  <th className="py-2 px-2.5 text-center">સ્થિતિ</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {vg.orders.map((o) => (
                                  <tr key={o.id} className="hover:bg-slate-50/70">
                                    <td className="py-2 px-2.5 font-mono text-slate-600">
                                      {o.order_date}
                                    </td>
                                    <td className="py-2 px-2.5 font-bold text-slate-800">
                                      {o.company_name}
                                    </td>
                                    <td className="py-2 px-2.5 text-slate-700 font-medium">
                                      {o.product_name}
                                    </td>
                                    <td className="py-2 px-2.5 text-right font-mono text-slate-700">
                                      {Number(o.order_quantity).toLocaleString()}
                                    </td>
                                    <td className="py-2 px-2.5 text-right font-mono text-emerald-700 font-semibold">
                                      {Number(o.dispatch_quantity || 0).toLocaleString()}
                                    </td>
                                    <td className="py-2 px-2.5 text-right font-mono text-amber-800 font-bold bg-amber-50/40">
                                      {Number(o.pending_quantity).toLocaleString()} BAG
                                    </td>
                                    <td className="py-2 px-2.5 text-center">
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                        {o.days_pending || 0}d
                                      </span>
                                    </td>
                                    <td className="py-2 px-2.5 text-center">
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                          o.status === 'Completed'
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : o.status === 'Dispatch Due'
                                            ? 'bg-amber-100 text-amber-800'
                                            : 'bg-slate-100 text-slate-700'
                                        }`}
                                      >
                                        {o.status}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ======================================================== */}
            {/* VIEW 3: FULL TABULAR ORDERS REGISTER */}
            {/* ======================================================== */}
            {registerView === 'orders' && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 font-semibold text-[11px] uppercase border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Order Date</th>
                      <th className="py-2.5 px-3">Company / Mill</th>
                      <th className="py-2.5 px-3">Buyer / Party</th>
                      <th className="py-2.5 px-3">Product</th>
                      <th className="py-2.5 px-3 text-right">Order Qty</th>
                      <th className="py-2.5 px-3 text-right">Rate</th>
                      <th className="py-2.5 px-3 text-right">Dispatch</th>
                      <th className="py-2.5 px-3 text-right">Pending</th>
                      <th className="py-2.5 px-3 text-center">Aging</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isLoadingLive ? (
                      <tr>
                        <td colSpan={11} className="py-8 text-center text-slate-400">
                          ઓર્ડર રજિસ્ટર લોડ થઈ રહ્યું છે...
                        </td>
                      </tr>
                    ) : filteredLiveOrders.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="py-8 text-center text-slate-400">
                          કોઈ ઓર્ડર મળ્યો નથી.
                        </td>
                      </tr>
                    ) : (
                      filteredLiveOrders.map((o) => (
                        <tr key={o.id} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">
                            {o.order_date}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-800">
                            {o.company_name || 'Mill'}
                          </td>
                          <td className="py-2.5 px-3">
                            <p className="font-semibold text-slate-800">
                              {o.party_name || o.buyer_name}
                            </p>
                            {(o.city || o.buyer_city) && (
                              <p className="text-[11px] text-slate-400">{o.city || o.buyer_city}</p>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-700">
                            {o.product_name}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-700">
                            {Number(o.order_quantity).toLocaleString()} {o.quantity_unit}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                            {o.rate ? `₹${o.rate}` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-semibold">
                            {Number(o.dispatch_quantity || 0).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-amber-800 font-bold bg-amber-50/30">
                            {Number(o.pending_quantity).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                              {o.days_pending || 0}d
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                o.status === 'Completed'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : o.status === 'Dispatch Due'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {o.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  const text = `*જલારામ બ્રોકર્સ - ઓર્ડર ફોલોઅપ*\nવેપારી: ${o.party_name || o.buyer_name}\nમિલ: ${o.company_name}\nપેન્ડિંગ સ્ટોક: ${Number(o.pending_quantity).toLocaleString()} BAG (${o.product_name})\nઓર્ડર તારીખ: ${o.order_date}`;
                                  let phone = (o.buyer_phone || '').replace(/\D/g, '');
                                  if (!phone) {
                                    phone = prompt('Enter 10-digit mobile number:', '') || '';
                                    phone = phone.replace(/\D/g, '');
                                  }
                                  if (phone) {
                                    if (phone.length === 10) phone = '91' + phone;
                                    window.open(
                                      `https://wa.me/${phone}?text=${encodeURIComponent(text)}`,
                                      '_blank'
                                    );
                                  }
                                }}
                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                                title="WhatsApp"
                              >
                                <MessageSquare size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleInitiateCall(
                                    o.party_name || o.buyer_name || 'Party',
                                    'Party',
                                    o.buyer_phone || ''
                                  )
                                }
                                className="p-1 text-slate-600 hover:bg-slate-100 rounded-lg"
                                title="Call"
                              >
                                <Phone size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: Upload History */}
      {/* ======================================================== */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <History size={18} className="text-forest-800" />
                <span>Uploaded Reports Archive (અગાઉ અપલોડ કરેલા રિપોર્ટ્સ)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Past pending order reports with full comparison history
              </p>
            </div>
            <button
              onClick={fetchHistory}
              className="p-1.5 text-slate-500 hover:text-slate-800 border rounded-xl hover:bg-slate-50 cursor-pointer"
            >
              <RefreshCw size={15} className={isLoadingHistory ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold text-[11px] uppercase border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Report ID</th>
                  <th className="py-2.5 px-3">Company / Mill</th>
                  <th className="py-2.5 px-3">Report Date</th>
                  <th className="py-2.5 px-3">Filename</th>
                  <th className="py-2.5 px-3 text-right">Orders</th>
                  <th className="py-2.5 px-3 text-right">Pending Bags</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3">Uploaded At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoadingHistory ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      Loading reports history...
                    </td>
                  </tr>
                ) : reportsHistory.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No reports uploaded yet.
                    </td>
                  </tr>
                ) : (
                  reportsHistory.map((rep) => (
                    <tr key={rep.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 font-mono text-slate-500">#{rep.id}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-800">{rep.company_name}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-700">{rep.report_date}</td>
                      <td className="py-2.5 px-3 text-slate-600">{rep.filename}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-700">
                        {rep.summary?.total_orders || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-800">
                        {rep.summary?.total_pending_bags
                          ? `${Number(rep.summary.total_pending_bags).toLocaleString()} BAG`
                          : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            rep.status === 'SAVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {rep.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">
                        {new Date(rep.uploaded_at).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* Quick Add Contact Modal */}
      {/* ======================================================== */}
      {addingPartyRow && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-forest-900/10 text-forest-900 rounded-xl">
                <UserPlus size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Add Party to Contact Master</h3>
                <p className="text-xs text-slate-500">
                  Quickly register this new party from the pending order report
                </p>
              </div>
            </div>

            <div className="space-y-3.5 my-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Party Name (વેપારીનું નામ)
                </label>
                <input
                  type="text"
                  value={addingPartyRow.party_name}
                  readOnly
                  className="w-full text-xs font-bold rounded-xl border-slate-200 bg-slate-100 py-2.5 px-3 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  City / Station (ગામ / શહેર)
                </label>
                <input
                  type="text"
                  value={addingPartyRow.city}
                  readOnly
                  className="w-full text-xs rounded-xl border-slate-200 bg-slate-100 py-2.5 px-3 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mobile Number (મોબાઇલ નંબર - Optional)
                </label>
                <input
                  type="tel"
                  placeholder="Enter 10-digit mobile number"
                  value={newContactPhone}
                  onChange={(e) => setNewContactPhone(e.target.value)}
                  className="w-full text-xs rounded-xl border-slate-200 py-2.5 px-3 focus:border-forest-800 focus:ring-forest-800/20"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAddingPartyRow(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleQuickAddContact}
                disabled={isSavingContact}
                className="px-4 py-2 text-xs font-bold bg-forest-900 text-white rounded-xl hover:bg-forest-800 shadow-sm disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {isSavingContact ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    <span>Save Contact & Link</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PendingOrdersPage;
