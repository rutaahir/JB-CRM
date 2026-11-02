import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileSpreadsheet,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Building2,
  Calendar,
  Save,
  Search,
  Trash2,
  Eye,
  X,
  FileUp,
  Sparkles,
  Check,
  RotateCcw,
  AlertTriangle,
  Link2,
} from 'lucide-react';
import { toast } from 'sonner';
import { statementsApi } from '@/api/statements';
import { apiClient } from '@/api/client';
import { Seller, Buyer, StatementUploadResponse, StatementColumn, ExtractedRecord } from '@/types';
import { cn } from '@/lib/utils';

export const StatementsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedSellerId, setSelectedSellerId] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  // Extracted preview state
  const [previewData, setPreviewData] = useState<StatementUploadResponse | null>(null);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [editableRecords, setEditableRecords] = useState<ExtractedRecord[]>([]);
  const [tableSearch, setTableSearch] = useState('');
  const [saveTarget, setSaveTarget] = useState<'AUTO' | 'DEALS' | 'RECOVERIES'>('AUTO');
  const [isSaving, setIsSaving] = useState(false);
  const [rollingBackId, setRollingBackId] = useState<number | null>(null);

  // Fetch Sellers & Buyers for dropdowns
  const { data: sellers } = useQuery({
    queryKey: ['sellers-dropdown-statements'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/sellers/');
      return Array.isArray(res.data) ? res.data : (res.data.results as Seller[]);
    },
  });

  const { data: buyers } = useQuery({
    queryKey: ['buyers-dropdown-statements'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/buyers/');
      return Array.isArray(res.data) ? res.data : (res.data.results as Buyer[]);
    },
  });

  // History query
  const { data: history, isLoading: isHistoryLoading } = useQuery({
    queryKey: ['statement-history'],
    queryFn: () => statementsApi.getHistory(),
  });

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.toLowerCase().endsWith('.pdf')) {
        setSelectedFile(file);
      } else {
        toast.error('Please upload a PDF file only.');
      }
    }
  };

  const handleUploadAndExtract = async () => {
    if (!selectedFile) {
      toast.error('Please select a PDF file first');
      return;
    }

    setIsUploading(true);
    try {
      const sellerIdNum = selectedSellerId ? Number(selectedSellerId) : null;
      const res = await statementsApi.uploadPdf(selectedFile, sellerIdNum);
      if (res.success) {
        setPreviewData(res);
        setEditableRecords(res.records || []);
        setIsVerifyModalOpen(true);
        if (res.is_duplicate) {
          toast.warning(res.duplicate_notice || 'Notice: File was previously uploaded.', { duration: 6000 });
        } else {
          toast.success(res.message);
        }
        queryClient.invalidateQueries({ queryKey: ['statement-history'] });
      } else {
        toast.error(res.message || 'Extraction failed');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to extract PDF statement data.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveVerified = async () => {
    if (!previewData) return;
    setIsSaving(true);
    try {
      const res = await statementsApi.saveVerified(previewData.statement_id, {
        records: editableRecords,
        seller_id: selectedSellerId ? Number(selectedSellerId) : previewData.seller_id,
        target: saveTarget,
      });

      if (res.success) {
        toast.success(res.message);
        setIsVerifyModalOpen(false);
        setPreviewData(null);
        setSelectedFile(null);
        queryClient.invalidateQueries({ queryKey: ['deals'] });
        queryClient.invalidateQueries({ queryKey: ['deals-stats'] });
        queryClient.invalidateQueries({ queryKey: ['recoveries'] });
        queryClient.invalidateQueries({ queryKey: ['recoveries-stats'] });
        queryClient.invalidateQueries({ queryKey: ['statement-history'] });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save verified records.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRollback = async (statementId: number, filename: string) => {
    if (!window.confirm(`Are you sure you want to rollback statement '${filename}'? This will delete all Sauda Deals and Recovery Bills imported from this file.`)) {
      return;
    }

    setRollingBackId(statementId);
    try {
      const res = await statementsApi.rollbackStatement(statementId);
      if (res.success) {
        toast.success(res.message);
        queryClient.invalidateQueries({ queryKey: ['deals'] });
        queryClient.invalidateQueries({ queryKey: ['deals-stats'] });
        queryClient.invalidateQueries({ queryKey: ['recoveries'] });
        queryClient.invalidateQueries({ queryKey: ['recoveries-stats'] });
        queryClient.invalidateQueries({ queryKey: ['statement-history'] });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Rollback failed.');
    } finally {
      setRollingBackId(null);
    }
  };

  const handleRecordBuyerChange = (index: number, newBuyerId: string) => {
    const updated = [...editableRecords];
    const buyerObj = buyers?.find((b) => b.id.toString() === newBuyerId);
    updated[index] = {
      ...updated[index],
      buyer_id: newBuyerId ? Number(newBuyerId) : null,
      matched_buyer_id: newBuyerId ? Number(newBuyerId) : null,
      matched_buyer_name: buyerObj ? buyerObj.company_name : '',
      match_confidence: 1.0,
    };
    setEditableRecords(updated);
  };

  const currentRecordsSum = editableRecords.reduce((acc, r) => {
    const amt = Number(r.pending_amount || r.billed_amount || 0);
    return acc + amt;
  }, 0);

  const filteredRecords = editableRecords.filter((r) => {
    if (!tableSearch) return true;
    const term = tableSearch.toLowerCase();
    return (
      r.bill_number?.toLowerCase().includes(term) ||
      r.buyer_name?.toLowerCase().includes(term) ||
      r.matched_buyer_name?.toLowerCase().includes(term) ||
      r.city?.toLowerCase().includes(term) ||
      r.item_desc?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              All-In-One PDF Statement Extractor
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full flex items-center gap-1">
              <Sparkles size={12} /> Smart Parser & Rollback
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Auto-detects Sauda registers, FIFO receivables, duplicate SHA-256 hash prevention & party alias resolution
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Seller / Mill (Optional - auto-detected from statement if blank)
              </label>
              <select
                value={selectedSellerId}
                onChange={(e) => setSelectedSellerId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="">Auto-Detect from Header</option>
                {sellers?.map((s: Seller) => (
                  <option key={s.id} value={s.id}>
                    {s.company_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Supported Statement Archetypes
              </label>
              <div className="flex items-center gap-2 pt-1 text-xs text-slate-600">
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded-md font-medium">
                  Sauda Register
                </span>
                <span className="px-2 py-0.5 bg-blue-50 text-blue-800 rounded-md font-medium">
                  FIFO Receivables
                </span>
                <span className="px-2 py-0.5 bg-amber-50 text-amber-800 rounded-md font-medium">
                  Ledgers
                </span>
              </div>
            </div>
          </div>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all',
              selectedFile
                ? 'border-emerald-500 bg-emerald-50/20'
                : 'border-slate-300 hover:border-emerald-500 hover:bg-slate-50/50'
            )}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setSelectedFile(e.target.files[0]);
                }
              }}
            />

            {selectedFile ? (
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
                  <FileText size={28} />
                </div>
                <p className="font-bold text-slate-800 text-sm">{selectedFile.name}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {(selectedFile.size / 1024).toFixed(1)} KB • Ready for extraction
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                  }}
                  className="mt-3 text-xs text-rose-600 hover:underline flex items-center gap-1 font-semibold"
                >
                  <X size={14} /> Remove File
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                  <Upload size={24} />
                </div>
                <p className="font-bold text-slate-700 text-sm">
                  Drag and drop your Mill Statement PDF here
                </p>
                <p className="text-xs text-slate-400 mt-1">Supports Indian Agro/Brokerage PDF formats</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-center pt-2">
            <button
              onClick={handleUploadAndExtract}
              disabled={!selectedFile || isUploading}
              className={cn(
                'px-6 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 cursor-pointer shadow-xs transition-all',
                !selectedFile || isUploading
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-emerald-700/20'
              )}
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Extracting & Resolving Parties...</span>
                </>
              ) : (
                <>
                  <FileUp size={18} />
                  <span>Upload & Extract Statement</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Uploaded Statements History Table with 1-Click Rollback */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={18} className="text-emerald-700" />
            <h3 className="font-bold text-slate-800 text-sm">Statement Uploads History</h3>
          </div>
          <span className="text-xs text-slate-400">Manage statement batches & rollback if needed</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">Filename</th>
                <th className="py-3 px-4">Statement Archetype</th>
                <th className="py-3 px-4">Detected Company</th>
                <th className="py-3 px-4">Upload Date</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isHistoryLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Loading history...
                  </td>
                </tr>
              ) : !history || history.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No statements uploaded yet. Drop a PDF above to begin.
                  </td>
                </tr>
              ) : (
                history.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-medium text-slate-800 flex items-center gap-2">
                      <FileText size={16} className="text-slate-400 shrink-0" />
                      <span>{item.filename}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {item.statement_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {item.seller_name || 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500">
                      {new Date(item.uploaded_at).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={cn(
                          'text-xs font-bold px-2 py-0.5 rounded-full',
                          item.status === 'SAVED' && 'bg-emerald-100 text-emerald-800',
                          item.status === 'EXTRACTED' && 'bg-blue-100 text-blue-800',
                          item.status === 'FAILED' && 'bg-rose-100 text-rose-800',
                          item.status === 'ROLLED_BACK' && 'bg-slate-200 text-slate-700',
                          item.status === 'PENDING' && 'bg-amber-100 text-amber-800'
                        )}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {item.status === 'SAVED' && (
                        <button
                          onClick={() => handleRollback(item.id, item.filename)}
                          disabled={rollingBackId === item.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                          title="1-Click Rollback: removes all deals and recovery bills imported from this statement"
                        >
                          <RotateCcw size={12} className={rollingBackId === item.id ? 'animate-spin' : ''} />
                          <span>{rollingBackId === item.id ? 'Rolling back...' : 'Rollback Batch'}</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Verification & Party Alias Matching Modal */}
      {isVerifyModalOpen && previewData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[92vh] flex flex-col overflow-hidden my-4">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <CheckCircle2 size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">
                      Verify Extracted Records & Map Parties ({previewData.records_count} Found)
                    </h3>
                    <span className="text-xs font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md">
                      {previewData.statement_type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Seller: <span className="font-semibold text-slate-700">{previewData.seller_name || previewData.detected_company || 'Auto Detected'}</span> • Statement: {previewData.filename}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsVerifyModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Duplicate Notice Banner if previously uploaded */}
            {previewData.is_duplicate && (
              <div className="px-5 py-3 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs flex items-center gap-2 font-medium">
                <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                <span>{previewData.duplicate_notice || 'Warning: An identical statement was already uploaded previously. Please verify to avoid duplicates.'}</span>
              </div>
            )}

            <div className="p-5 bg-emerald-50/40 border-b border-emerald-100/60 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-3.5 rounded-xl border border-emerald-200/60">
                <p className="text-[11px] font-semibold text-slate-500 uppercase">Records Parsed</p>
                <p className="text-xl font-bold text-slate-900 mt-0.5">{editableRecords.length}</p>
                <p className="text-[11px] text-emerald-700">Ready for CRM import</p>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-emerald-200/60">
                <p className="text-[11px] font-semibold text-slate-500 uppercase">Calculated Total</p>
                <p className="text-xl font-bold text-emerald-800 mt-0.5">
                  ₹{currentRecordsSum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[11px] text-slate-500">Sum of verified row amounts</p>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-emerald-200/60">
                <p className="text-[11px] font-semibold text-slate-500 uppercase">PDF Footer Reconcile</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <p className="text-xl font-bold text-slate-900">
                    ₹{previewData.total_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                  <Check size={18} className="text-emerald-600 shrink-0" />
                </div>
                <p className="text-[11px] text-emerald-700 font-medium">Reconciled against printed grand total</p>
              </div>
            </div>

            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter extracted rows or parties..."
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Save As:</span>
                <select
                  value={saveTarget}
                  onChange={(e) => setSaveTarget(e.target.value as any)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
                >
                  <option value="AUTO">Auto (Detects Sauda vs Recovery)</option>
                  <option value="DEALS">Sauda Deals (સોદા બુકિંગ)</option>
                  <option value="RECOVERIES">Recovery Ledger (બાકી હિસાબ)</option>
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-slate-100/90 backdrop-blur-xs z-10">
                  <tr className="border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Bill / Sauda #</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Extracted Party String</th>
                    <th className="py-2.5 px-3">Mapped Buyer (Party ID Link)</th>
                    <th className="py-2.5 px-3">Station</th>
                    <th className="py-2.5 px-3 text-right">Qty</th>
                    <th className="py-2.5 px-3 text-right">Rate</th>
                    <th className="py-2.5 px-3 text-right font-bold">Amount (₹)</th>
                    <th className="py-2.5 px-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2 px-3 text-slate-400">{idx + 1}</td>
                      <td className="py-2 px-3 font-semibold text-emerald-800">{row.bill_number}</td>
                      <td className="py-2 px-3 text-slate-600">{row.bill_date}</td>
                      <td className="py-2 px-3 text-slate-700 font-medium">
                        <div>
                          <span>{row.buyer_name}</span>
                          {row.city && <span className="text-[10px] text-slate-400 block">{row.city}</span>}
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1.5">
                          <select
                            value={row.matched_buyer_id || row.buyer_id || ''}
                            onChange={(e) => handleRecordBuyerChange(idx, e.target.value)}
                            className={cn(
                              'px-2 py-1 text-xs rounded-lg border max-w-[200px]',
                              row.matched_buyer_id
                                ? 'border-emerald-300 bg-emerald-50/50 text-emerald-950 font-medium'
                                : 'border-amber-300 bg-amber-50 text-amber-900 font-medium'
                            )}
                          >
                            <option value="">-- Create New as '{row.buyer_name}' --</option>
                            {buyers?.map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.company_name} ({b.address.split(',')[0]})
                              </option>
                            ))}
                          </select>
                          {row.match_confidence && row.match_confidence >= 0.95 ? (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-semibold shrink-0" title="Auto-matched via exact name or saved alias">
                              Matched
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-slate-500">{row.city || '-'}</td>
                      <td className="py-2 px-3 text-right text-slate-700">{row.qty || '-'}</td>
                      <td className="py-2 px-3 text-right text-slate-700">
                        {row.rate ? `₹${Number(row.rate).toFixed(2)}` : '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">
                        ₹{Number(row.pending_amount || row.billed_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <button
                          onClick={() => {
                            setEditableRecords(editableRecords.filter((_, i) => i !== idx));
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                          title="Remove row"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                <Link2 size={14} className="text-emerald-700" />
                <span>Any manually mapped parties will be remembered in the Alias table for future statement imports.</span>
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsVerifyModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveVerified}
                  disabled={isSaving || editableRecords.length === 0}
                  className={cn(
                    'px-5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs transition-all',
                    isSaving
                      ? 'bg-emerald-300 text-white cursor-not-allowed'
                      : 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-emerald-700/20'
                  )}
                >
                  {isSaving ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      <span>Saving into CRM...</span>
                    </>
                  ) : (
                    <>
                      <Save size={15} />
                      <span>Save Verified Records ({editableRecords.length})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatementsPage;
