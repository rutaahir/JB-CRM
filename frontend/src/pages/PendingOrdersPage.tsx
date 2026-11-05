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

export const PendingOrdersPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'upload' | 'register' | 'history'>('upload');

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
      const mList = list.filter((c: Contact) => c.party_type === 'COMPANY_MILL' || c.party_type === ('SELLER' as any));
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
      toast.error('Please select a PDF file or paste report text.');
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

      toast.success(`Successfully extracted ${data.records?.length || 0} orders!`);
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
      toast.success(`Contact [${newContact.code}] ${newContact.name} created and linked!`);

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

      toast.success(res.data.message || 'Orders successfully synced to CRM!');
      setIsApproved(true);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to approve and sync orders.');
    } finally {
      setIsApproving(false);
    }
  };

  // Filtered rows
  const filteredExtractedRows = useMemo(() => {
    return extractedRows.filter((r) => {
      // Search
      const searchMatch =
        !extractedSearch ||
        r.party_name.toLowerCase().includes(extractedSearch.toLowerCase()) ||
        r.city.toLowerCase().includes(extractedSearch.toLowerCase()) ||
        r.product.toLowerCase().includes(extractedSearch.toLowerCase());

      // Status
      const statusMatch =
        statusFilter === 'ALL' || r.status.toLowerCase() === statusFilter.toLowerCase();

      // Comparison
      const compMatch =
        comparisonFilter === 'ALL' ||
        r.comparison_status.toUpperCase() === comparisonFilter.toUpperCase();

      return searchMatch && statusMatch && compMatch;
    });
  }, [extractedRows, extractedSearch, statusFilter, comparisonFilter]);

  // Filtered live register orders
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

  // Export Extracted to CSV
  const handleExportCSV = () => {
    if (!extractedRows.length) return;

    const headers = [
      'Order Date',
      'Party Name',
      'City',
      'Broker',
      'Product',
      'Total Bag',
      'Rate',
      'Dispatch Bag',
      'Pending Bag',
      'Aging (Days)',
      'Status',
      'CRM Match',
      'Comparison Note',
    ];

    const rows = extractedRows.map((r) => [
      `"${r.date}"`,
      `"${r.party_name}"`,
      `"${r.city}"`,
      `"${r.broker}"`,
      `"${r.product}"`,
      r.total_bag,
      r.rate,
      r.dispatch_bag,
      r.pending_bag,
      r.days_pending,
      `"${r.status}"`,
      `"${r.is_new_party ? 'New Party' : `[${r.contact_code}] ${r.contact_name}`}"`,
      `"${r.comparison_notes || r.comparison_status}"`,
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Pending_Orders_${reportDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Page Header */}
      <div className="bg-[#062616] border border-[#0d3f25] rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-amber-500/10 to-transparent pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-400/20 text-amber-400 rounded-xl">
                <FileSpreadsheet size={24} />
              </div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">
                Daily Pending Order PDF System
              </h1>
            </div>
            <p className="mt-1.5 text-xs md:text-sm text-slate-300">
              કંપનીવાર રોજના Pending Order PDF અપલોડ, આપમેળે ડેટા એક્સટ્રેક્શન, જૂની અને નવી PDF ની સરખામણી
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center bg-[#041d10] p-1.5 rounded-xl border border-[#0d3f25] self-start md:self-auto">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-amber-400 text-[#062616] shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-[#0a3821]'
              }`}
            >
              <UploadCloud size={15} />
              <span>PDF Extractor</span>
            </button>
            <button
              onClick={() => setActiveTab('register')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'register'
                  ? 'bg-amber-400 text-[#062616] shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-[#0a3821]'
              }`}
            >
              <Layers size={15} />
              <span>Pending Register</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-amber-400 text-[#062616] shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-[#0a3821]'
              }`}
            >
              <History size={15} />
              <span>Upload History</span>
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: PDF Extractor & Upload */}
      {/* ======================================================== */}
      {activeTab === 'upload' && (
        <div className="space-y-6">
          {/* Upload Configuration Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 md:p-6">
            <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Building2 size={18} className="text-forest-800" />
              <span>Select Company / Mill & PDF Document</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* Mill / Company select */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Company / Mill Name (કંપની / મિલ)
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
                  className="w-full text-xs rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:border-forest-800 focus:ring-forest-800/20 py-2.5 px-3"
                >
                  <option value="">-- Select from Contact Master --</option>
                  {mills.map((m) => (
                    <option key={m.id} value={m.id}>
                      [{m.code}] {m.name} {m.city ? `(${m.city})` : ''}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Or enter company name manually"
                  value={customCompanyName}
                  onChange={(e) => setCustomCompanyName(e.target.value)}
                  className="mt-2 w-full text-xs rounded-xl border-slate-200 bg-slate-50 focus:bg-white py-2 px-3 placeholder:text-slate-400"
                />
              </div>

              {/* Report Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Report Date (તારીખ)
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                    className="w-full text-xs rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:border-forest-800 py-2.5 px-3"
                  />
                  <Calendar size={16} className="absolute right-3 top-3 text-slate-400 pointer-events-none" />
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  Default today or order statement date
                </p>
              </div>

              {/* Extractor Mode / Direct OCR toggle */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Input Format
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowOcrInput(false)}
                    className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all border ${
                      !showOcrInput
                        ? 'bg-forest-900 text-white border-forest-900 shadow-sm'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    PDF Upload (.pdf)
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowOcrInput(true)}
                    className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all border ${
                      showOcrInput
                        ? 'bg-forest-900 text-white border-forest-900 shadow-sm'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Paste Text / OCR
                  </button>
                </div>
              </div>
            </div>

            {/* Drag & Drop PDF zone or OCR text area */}
            {!showOcrInput ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors ${
                  file
                    ? 'border-emerald-400 bg-emerald-50/40'
                    : 'border-slate-300 hover:border-forest-700 bg-slate-50/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="flex flex-col items-center justify-center">
                  <div
                    className={`p-3 rounded-2xl mb-2 ${
                      file ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200/70 text-slate-600'
                    }`}
                  >
                    <UploadCloud size={28} />
                  </div>
                  {file ? (
                    <div>
                      <p className="text-sm font-bold text-slate-800">{file.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {(file.size / 1024).toFixed(1)} KB — Ready to parse
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-semibold text-slate-700">
                        Click or drag & drop Mill's Daily Pending Order PDF
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Supports Aarti, Pashupati, Shree Vijay, and other mill formats
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <textarea
                  rows={5}
                  value={ocrText}
                  onChange={(e) => setOcrText(e.target.value)}
                  placeholder="Paste OCR text lines from Mill's Pending Order report here (e.g. 18-09-26 SHREEJI KIRANA STORE ADADRA JALARAM MAIZE CAKE 500.00 1650/- 150.00 350.00)"
                  className="w-full text-xs font-mono rounded-xl border-slate-200 bg-slate-50 p-3 focus:bg-white focus:border-forest-800"
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
                    <span>Extracting PDF Data...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={15} className="text-amber-400" />
                    <span>Extract & Analyze Report</span>
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
                  <p className="text-[11px] text-slate-400 mt-1">Extracted from report</p>
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
                  <p className="text-[11px] text-amber-700/80 mt-1">Pending dispatch from mill</p>
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
                  <p className="text-[11px] text-emerald-700/80 mt-1">Already sent to buyers</p>
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
                        {summary.new_parties_count} new parties found
                      </span>
                    ) : (
                      'All parties matched in CRM'
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
                      {isApproved ? (
                        <>
                          <Check size={14} />
                          <span>Synced to CRM</span>
                        </>
                      ) : isApproving ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={14} className="text-amber-400" />
                          <span>Approve & Save to CRM</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Data Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Order Date</th>
                        <th className="py-2.5 px-3">Party Name & City</th>
                        <th className="py-2.5 px-3">Contact Master Match</th>
                        <th className="py-2.5 px-3">Product</th>
                        <th className="py-2.5 px-3 text-right">Total Bag</th>
                        <th className="py-2.5 px-3 text-right">Rate</th>
                        <th className="py-2.5 px-3 text-right">Dispatch</th>
                        <th className="py-2.5 px-3 text-right">Pending</th>
                        <th className="py-2.5 px-3 text-center">Aging</th>
                        <th className="py-2.5 px-3 text-center">Status / Note</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredExtractedRows.map((row) => (
                        <tr key={row.row_id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3 font-mono text-slate-400">{row.row_id}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">
                            {row.date}
                          </td>
                          <td className="py-2.5 px-3">
                            <p className="font-bold text-slate-800">{row.party_name}</p>
                            {row.city && (
                              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                                <span>{row.city}</span>
                                {row.broker && (
                                  <span className="text-slate-300">• Broker: {row.broker}</span>
                                )}
                              </p>
                            )}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {!row.is_new_party ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <Check size={12} />
                                <span>
                                  [{row.contact_code}] {row.contact_name}
                                </span>
                              </span>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                  New Party
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setAddingPartyRow(row)}
                                  className="text-[10px] text-forest-800 font-bold hover:underline flex items-center gap-0.5"
                                >
                                  <UserPlus size={11} /> +Add
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-700">{row.product}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-700 font-semibold">
                            {row.total_bag.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                            {row.rate ? `₹${row.rate}` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-semibold">
                            {row.dispatch_bag ? row.dispatch_bag.toLocaleString() : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-amber-800 font-bold bg-amber-50/40">
                            {row.pending_bag.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                row.days_pending > 30
                                  ? 'bg-rose-100 text-rose-800'
                                  : row.days_pending > 15
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {row.days_pending}d
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            {row.comparison_status === 'COMPLETED' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                Completed
                              </span>
                            ) : row.comparison_status === 'PARTIALLY_DISPATCHED' ? (
                              <span
                                className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800"
                                title={row.comparison_notes}
                              >
                                Partial Disp.
                              </span>
                            ) : row.comparison_status === 'NEW_ORDER' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                                New Order
                              </span>
                            ) : (
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  row.status === 'Dispatch Due'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-slate-100 text-slate-600'
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
      {/* TAB 2: Company-wise Pending Register (Live CRM) */}
      {/* ======================================================== */}
      {activeTab === 'register' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 animate-fadeIn">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Layers size={18} className="text-forest-800" />
                <span>Active Pending Orders Register (કંપનીવાર પેન્ડિંગ ઓર્ડર યાદી)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                All pending commitments currently logged across mills and buyers
              </p>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-56">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search order..."
                  value={liveSearch}
                  onChange={(e) => setLiveSearch(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl border-slate-200"
                />
              </div>

              <select
                value={liveStatusFilter}
                onChange={(e) => setLiveStatusFilter(e.target.value)}
                className="text-xs rounded-xl border-slate-200 py-1.5 px-2.5"
              >
                <option value="ALL">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Dispatch Due">Dispatch Due</option>
                <option value="Completed">Completed</option>
              </select>

              <button
                onClick={fetchLiveOrders}
                className="p-1.5 text-slate-500 hover:text-slate-800 border rounded-xl hover:bg-slate-50"
                title="Refresh"
              >
                <RefreshCw size={15} className={isLoadingLive ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Live Orders Table */}
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
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoadingLive ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400">
                      Loading pending orders...
                    </td>
                  </tr>
                ) : filteredLiveOrders.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400">
                      No pending orders found.
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
                        <p className="font-semibold text-slate-800">{o.party_name || o.buyer_name}</p>
                        {o.city && <p className="text-[11px] text-slate-400">{o.city}</p>}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-700">{o.product_name}</td>
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
                    </tr>
                  ))
                )}
              </tbody>
            </table>
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
              className="p-1.5 text-slate-500 hover:text-slate-800 border rounded-xl hover:bg-slate-50"
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
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleQuickAddContact}
                disabled={isSavingContact}
                className="px-4 py-2 text-xs font-bold bg-forest-900 text-white rounded-xl hover:bg-forest-800 shadow-sm disabled:opacity-50 flex items-center gap-1.5"
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
