import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Save,
  RotateCcw,
  Search,
  Trash2,
  Printer,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  AlertTriangle,
  Building2,
  CheckCircle2,
  X,
  Users2,
  Handshake,
  FileSpreadsheet,
} from 'lucide-react';
import { toast } from 'sonner';
import { contactsApi } from '@/api/contacts';
import { PartyType } from '@/types';
import { FindContactModal } from '@/components/contact/FindContactModal';
import { formatWhatsAppUrl, cn } from '@/lib/utils';

export const ContactMasterPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryId = searchParams.get('id');

  const [currentId, setCurrentId] = useState<number | null>(queryId ? Number(queryId) : null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isFindModalOpen, setIsFindModalOpen] = useState(false);
  const [printChecked, setPrintChecked] = useState(true);

  // Form state matching Pioneer Systems Desktop Contact Master
  const [formData, setFormData] = useState({
    code: '',
    date: new Date().toISOString().split('T')[0],
    name: '',
    party_type: 'BUYER' as PartyType,
    account_group: 'BALANCE SHEET',
    ac_type: 'Other',
    contact_person_1: '',
    contact_person_2: '',
    mobile_1: '',
    mobile_2: '',
    phone_office_1: '',
    phone_office_2: '',
    gst_no: '',
    address: '',
    area: '',
    city: '',
    pin_code: '',
    aadhar_no: '',
    tin_no: '',
    cst_no: '',
    email: '',
    reference_by: '',
    bank_name: '',
    pan_no: '',
    account_no: '',
    ifsc_code: '',
    branch: '',
    layout: 'Pioneer',
    website: '',
    cheque_layout: '',
  });

  const [hasDeals, setHasDeals] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  // Navigation pointers state
  const [navState, setNavState] = useState<{
    first_id: number | null;
    prev_id: number | null;
    next_id: number | null;
    last_id: number | null;
  }>({
    first_id: null,
    prev_id: null,
    next_id: null,
    last_id: null,
  });

  const nameInputRef = useRef<HTMLInputElement>(null);

  // Initialize: load contact or fetch new code
  useEffect(() => {
    if (queryId && !isNaN(Number(queryId))) {
      loadContact(Number(queryId));
    } else {
      handleClearNew();
    }
  }, [queryId]);

  // Load navigation pointers
  const updateNav = async (code: string) => {
    try {
      const res = await contactsApi.getNavRecords(code);
      setNavState(res);
    } catch (e) {
      console.error(e);
    }
  };

  const loadContact = async (id: number) => {
    try {
      setLoading(true);
      const contact = await contactsApi.getContact(id);
      setCurrentId(contact.id);
      setFormData({
        code: contact.code,
        date: contact.date || new Date().toISOString().split('T')[0],
        name: contact.name,
        party_type: contact.party_type,
        account_group: contact.account_group || 'BALANCE SHEET',
        ac_type: contact.ac_type || (contact.party_type === 'COMPANY_MILL' ? 'Company-Mill' : 'Other'),
        contact_person_1: contact.contact_person_1 || '',
        contact_person_2: contact.contact_person_2 || '',
        mobile_1: contact.mobile_1 || '',
        mobile_2: contact.mobile_2 || '',
        phone_office_1: contact.phone_office_1 || '',
        phone_office_2: contact.phone_office_2 || '',
        gst_no: contact.gst_no || '',
        address: contact.address || '',
        area: contact.area || '',
        city: contact.city || '',
        pin_code: contact.pin_code || '',
        aadhar_no: contact.aadhar_no || '',
        tin_no: contact.tin_no || '',
        cst_no: contact.cst_no || '',
        email: contact.email || '',
        reference_by: contact.reference_by || '',
        bank_name: contact.bank_name || '',
        pan_no: contact.pan_no || '',
        account_no: contact.account_no || '',
        ifsc_code: contact.ifsc_code || '',
        branch: contact.branch || '',
        layout: contact.layout || 'Pioneer',
        website: contact.website || '',
        cheque_layout: contact.cheque_layout || '',
      });
      setHasDeals(Boolean(contact.has_deals));
      setDuplicateWarning(contact.duplicate_warning?.message || null);
      updateNav(contact.code);
      setSearchParams({ id: String(contact.id) });
    } catch (e: any) {
      toast.error('Failed to load contact record');
    } finally {
      setLoading(false);
    }
  };

  const handleClearNew = async () => {
    setCurrentId(null);
    setHasDeals(false);
    setDuplicateWarning(null);
    try {
      const nextCode = await contactsApi.getNextCode('BUYER');
      setFormData({
        code: nextCode,
        date: new Date().toISOString().split('T')[0],
        name: '',
        party_type: 'BUYER',
        account_group: 'BALANCE SHEET',
        ac_type: 'Other',
        contact_person_1: '',
        contact_person_2: '',
        mobile_1: '',
        mobile_2: '',
        phone_office_1: '',
        phone_office_2: '',
        gst_no: '',
        address: '',
        area: '',
        city: '',
        pin_code: '',
        aadhar_no: '',
        tin_no: '',
        cst_no: '',
        email: '',
        reference_by: '',
        bank_name: '',
        pan_no: '',
        account_no: '',
        ifsc_code: '',
        branch: '',
        layout: 'Pioneer',
        website: '',
        cheque_layout: '',
      });
      updateNav(nextCode);
      setSearchParams({});
      setTimeout(() => nameInputRef.current?.focus(), 100);
    } catch (e) {
      console.error(e);
    }
  };

  // Duplicate mobile check on blur
  const handleMobileBlur = async () => {
    if (!formData.mobile_1 || formData.mobile_1.trim().length < 6) {
      setDuplicateWarning(null);
      return;
    }
    try {
      const res = await contactsApi.checkMobile(formData.mobile_1, currentId || undefined);
      if (res.is_duplicate) {
        setDuplicateWarning(res.message || 'Mobile number is already registered.');
      } else {
        setDuplicateWarning(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Save handler (F10)
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Party / Company Name is required (*Name)!');
      nameInputRef.current?.focus();
      return;
    }
    if (!formData.mobile_1.trim()) {
      toast.error('Mobile No 1 is required for communication!');
      return;
    }

    try {
      setSaving(true);
      if (currentId) {
        const updated = await contactsApi.updateContact(currentId, formData);
        toast.success(`Contact '${updated.name}' (Code: ${updated.code}) updated successfully!`);
        loadContact(updated.id);
      } else {
        const created = await contactsApi.createContact(formData);
        toast.success(`Contact '${created.name}' created with Code ${created.code}!`);
        loadContact(created.id);
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.code?.[0] ||
        err.response?.data?.name?.[0] ||
        err.response?.data?.mobile_1?.[0] ||
        err.response?.data?.detail ||
        'Failed to save contact';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // Delete handler (blocked if party has deals)
  const handleDelete = async () => {
    if (!currentId) return;
    if (hasDeals) {
      toast.error('Cannot delete: Active Sauda Deals exist for this party in the Sauda Register!');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete contact '${formData.name}' (Code: ${formData.code})?`)) {
      return;
    }

    try {
      setLoading(true);
      await contactsApi.deleteContact(currentId);
      toast.success('Contact deleted successfully.');
      handleClearNew();
    } catch (err: any) {
      toast.error(err.response?.data?.[0] || 'Cannot delete contact');
    } finally {
      setLoading(false);
    }
  };

  // WhatsApp / SMS click-to-send
  const handleWhatsApp = () => {
    const rawMobile = formData.mobile_1?.trim() || '';
    const isPlaceholder = ['9898000000', '1414141414', '9999999999', '0000000000'].includes(rawMobile);
    if (!rawMobile) {
      toast.error('No mobile number entered for SMS / WhatsApp.');
      return;
    }
    if (isPlaceholder) {
      toast.error('WhatsApp link disabled: Contact has a placeholder or dummy mobile number.');
      return;
    }
    const url = formatWhatsAppUrl(
      rawMobile,
      `Namaste ${formData.name}, greetings from Jalaram Brokers.`
    );
    window.open(url, '_blank');
  };

  // Print contact detail (F9)
  const handlePrint = () => {
    window.print();
  };

  // Keyboard shortcuts (F10 Save, F2 New, F3 Find, F9 Print, F6 Sauda, F7 Register)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F10') {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'F2') {
        e.preventDefault();
        handleClearNew();
      } else if (e.key === 'F3') {
        e.preventDefault();
        setIsFindModalOpen(true);
      } else if (e.key === 'F9') {
        e.preventDefault();
        handlePrint();
      } else if (e.key === 'F6') {
        e.preventDefault();
        navigate('/deals?mode=entry');
      } else if (e.key === 'F7') {
        e.preventDefault();
        navigate('/deals?mode=register');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [formData, currentId]);

  return (
    <div className="max-w-6xl mx-auto space-y-4 pb-12">
      {/* ─── TOP NAVIGATION BAR (CRM THEME) ────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-1">
          <button
            type="button"
            onClick={() => navigate('/contacts/view')}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Users2 size={15} className="text-slate-500" />
            Contact View
          </button>
          <button
            type="button"
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#0a3821] text-white shadow-sm flex items-center gap-2 cursor-default border border-[#0d3f25]"
          >
            <Building2 size={15} className="text-amber-400" />
            Contact Master
            <span className="text-[10px] bg-black/30 text-amber-300 px-1.5 py-0.5 rounded font-mono font-bold">
              F8
            </span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/deals?mode=entry')}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Handshake size={15} className="text-slate-500" />
            Sauda Entry
            <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono">
              F6
            </span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/deals?mode=register')}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all flex items-center gap-2 cursor-pointer"
          >
            <FileSpreadsheet size={15} className="text-slate-500" />
            Sauda Register
            <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono">
              F7
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => navigate('/contacts/view')}
          className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-rose-700 hover:bg-rose-50 hover:border-rose-200 transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer shadow-2xs"
        >
          <X size={14} />
          Exit
        </button>
      </div>

      {/* ─── MAIN CARD CONTAINER ────────────────────────────────────── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
        {/* Card Header (Deep Forest Green Gradient with Amber Badges) */}
        <div className="bg-gradient-to-r from-[#062616] via-[#0a3821] to-[#041d10] text-white px-5 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-emerald-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-amber-400">
              <Building2 size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-white tracking-wide">
                  Party Master (Contact Master)
                </h1>
                <span className="text-[10px] font-mono bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-md font-bold">
                  F8
                </span>
              </div>
              <p className="text-xs text-emerald-200/80">
                {currentId
                  ? `Editing Record #${formData.code} • ${formData.name || 'Untitled Party'}`
                  : `New Party Record • Next Code: ${formData.code || '...'}`}
              </p>
            </div>
          </div>

          {/* Party Type Switcher Pill */}
          <div className="bg-black/35 p-1 rounded-xl border border-white/10 flex items-center text-xs">
            <button
              type="button"
              onClick={() => {
                setFormData({
                  ...formData,
                  party_type: 'BUYER',
                  ac_type: 'Other',
                });
              }}
              className={cn(
                'px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5',
                formData.party_type === 'BUYER'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:text-white'
              )}
            >
              <span>👤</span>
              Buyer (વેપારી)
            </button>
            <button
              type="button"
              onClick={() => {
                setFormData({
                  ...formData,
                  party_type: 'COMPANY_MILL',
                  ac_type: 'Company-Mill',
                });
              }}
              className={cn(
                'px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5',
                formData.party_type === 'COMPANY_MILL'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:text-white'
              )}
            >
              <span>🏭</span>
              Company-Mill (મીલ)
            </button>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-5 sm:p-7 text-slate-800 space-y-4">
          {/* Duplicate Warning Alert */}
          {duplicateWarning && (
            <div className="p-3 bg-amber-50 border border-amber-300 text-amber-900 rounded-xl flex items-center justify-between text-xs shadow-2xs">
              <div className="flex items-center gap-2.5">
                <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                <span className="font-semibold">{duplicateWarning}</span>
              </div>
              <span className="text-[10px] bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-md uppercase font-bold tracking-wide">
                Duplicate Warning
              </span>
            </div>
          )}

          {/* Has Deals Notice */}
          {hasDeals && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-xl flex items-center gap-2.5 text-xs shadow-2xs">
              <CheckCircle2 size={16} className="text-emerald-700 shrink-0" />
              <span>
                Active Sauda deals exist for this party. Deletion protection is active to safeguard ledger history.
              </span>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            {/* ─── SECTION 1: PRIMARY IDENTITY ─────────────────────────── */}
            <div className="space-y-3">
              {/* Row 1: Name, Code, Date */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                <div className="md:col-span-6 flex items-center gap-3">
                  <label className="w-28 text-right font-bold text-xs text-slate-700 shrink-0">
                    *Name:
                  </label>
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter Party / Company Name..."
                    className="flex-1 px-3.5 py-2 text-xs font-bold border-2 border-emerald-600/70 bg-emerald-50/30 text-slate-900 rounded-xl uppercase placeholder:normal-case placeholder:font-normal placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/30 focus:border-emerald-700 transition-all shadow-2xs"
                    required
                  />
                </div>
                <div className="md:col-span-3 flex items-center gap-2">
                  <label className="w-16 text-right font-bold text-xs text-slate-700 shrink-0">
                    Code:
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    readOnly
                    className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 bg-slate-100 text-slate-800 rounded-xl text-center select-all cursor-not-allowed shadow-2xs"
                  />
                </div>
                <div className="md:col-span-3 flex items-center gap-2">
                  <label className="w-14 text-right font-bold text-xs text-slate-700 shrink-0">
                    Date:
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 bg-white text-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-700/30 focus:border-emerald-700 transition-all shadow-2xs"
                  />
                </div>
              </div>

              {/* Row 2: Account Group(F1), A/c Type */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                <div className="md:col-span-6 flex items-center gap-3">
                  <label className="w-28 text-right font-semibold text-xs text-slate-600 shrink-0">
                    Account Group:
                  </label>
                  <input
                    type="text"
                    value={formData.account_group}
                    onChange={(e) => setFormData({ ...formData, account_group: e.target.value })}
                    placeholder="BALANCE SHEET"
                    className="flex-1 px-3 py-1.5 text-xs font-medium border border-slate-300 bg-white text-slate-800 rounded-xl uppercase focus:outline-none focus:ring-2 focus:ring-emerald-700/30 focus:border-emerald-700 transition-all shadow-2xs"
                  />
                </div>
                <div className="md:col-span-6 flex items-center gap-3">
                  <label className="w-24 text-right font-semibold text-xs text-slate-600 shrink-0">
                    A/c Type:
                  </label>
                  <select
                    value={formData.ac_type}
                    onChange={(e) => {
                      const val = e.target.value;
                      const partyType: PartyType = val === 'Company-Mill' ? 'COMPANY_MILL' : 'BUYER';
                      setFormData({ ...formData, ac_type: val, party_type: partyType });
                    }}
                    className="flex-1 px-3 py-1.5 text-xs font-semibold border border-slate-300 bg-white text-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-700/30 focus:border-emerald-700 transition-all shadow-2xs cursor-pointer"
                  >
                    <option value="Other">Other</option>
                    <option value="Sundry Debtors">Sundry Debtors (Buyer)</option>
                    <option value="Sundry Creditors">Sundry Creditors (Supplier/Mill)</option>
                    <option value="Company-Mill">Company-Mill (Seller)</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Contact Person1, Mobile No1 (For SMS) */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                <div className="md:col-span-6 flex items-center gap-3">
                  <label className="w-28 text-right font-semibold text-xs text-slate-600 shrink-0">
                    Contact Person 1:
                  </label>
                  <input
                    type="text"
                    value={formData.contact_person_1}
                    onChange={(e) => setFormData({ ...formData, contact_person_1: e.target.value })}
                    placeholder="e.g. Ramesh Bhai"
                    className="flex-1 px-3 py-1.5 text-xs font-medium border border-slate-300 bg-white text-slate-800 rounded-xl uppercase focus:outline-none focus:ring-2 focus:ring-emerald-700/30 focus:border-emerald-700 transition-all shadow-2xs"
                  />
                </div>
                <div className="md:col-span-6 flex items-center gap-3">
                  <label className="w-24 text-right font-bold text-xs text-slate-700 shrink-0">
                    *Mobile No 1:
                  </label>
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="text"
                      value={formData.mobile_1}
                      onChange={(e) => setFormData({ ...formData, mobile_1: e.target.value })}
                      onBlur={handleMobileBlur}
                      placeholder="10-digit mobile number"
                      className="flex-1 px-3 py-1.5 text-xs font-bold border border-slate-300 bg-white text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-700/30 focus:border-emerald-700 transition-all shadow-2xs"
                      required
                    />
                    <button
                      type="button"
                      onClick={handleWhatsApp}
                      className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg text-xs font-semibold text-emerald-800 shrink-0 cursor-pointer flex items-center gap-1.5 transition-all shadow-2xs"
                      title="Send WhatsApp or SMS greeting"
                    >
                      <MessageCircle size={14} className="text-emerald-700" />
                      For SMS
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 4: Contact Person2, Mobile No2 */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                <div className="md:col-span-6 flex items-center gap-3">
                  <label className="w-28 text-right font-semibold text-xs text-slate-600 shrink-0">
                    Contact Person 2:
                  </label>
                  <input
                    type="text"
                    value={formData.contact_person_2}
                    onChange={(e) => setFormData({ ...formData, contact_person_2: e.target.value })}
                    placeholder="Secondary contact person"
                    className="flex-1 px-3 py-1.5 text-xs font-medium border border-slate-300 bg-white text-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-700/30 focus:border-emerald-700 transition-all shadow-2xs"
                  />
                </div>
                <div className="md:col-span-6 flex items-center gap-3">
                  <label className="w-24 text-right font-semibold text-xs text-slate-600 shrink-0">
                    Mobile No 2:
                  </label>
                  <input
                    type="text"
                    value={formData.mobile_2}
                    onChange={(e) => setFormData({ ...formData, mobile_2: e.target.value })}
                    placeholder="Alternative mobile"
                    className="flex-1 px-3 py-1.5 text-xs font-medium border border-slate-300 bg-white text-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-700/30 focus:border-emerald-700 transition-all shadow-2xs"
                  />
                </div>
              </div>

              {/* Row 5: Phone Off. 1 & 2, GST No */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                <div className="md:col-span-6 flex items-center gap-3">
                  <label className="w-28 text-right font-semibold text-xs text-slate-600 shrink-0">
                    Phone Office:
                  </label>
                  <input
                    type="text"
                    placeholder="Office 1"
                    value={formData.phone_office_1}
                    onChange={(e) => setFormData({ ...formData, phone_office_1: e.target.value })}
                    className="w-1/2 px-3 py-1.5 text-xs font-medium border border-slate-300 bg-white text-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-700/30 focus:border-emerald-700 transition-all shadow-2xs"
                  />
                  <span className="font-bold text-slate-400 text-xs">2:</span>
                  <input
                    type="text"
                    placeholder="Office 2"
                    value={formData.phone_office_2}
                    onChange={(e) => setFormData({ ...formData, phone_office_2: e.target.value })}
                    className="w-1/2 px-3 py-1.5 text-xs font-medium border border-slate-300 bg-white text-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-700/30 focus:border-emerald-700 transition-all shadow-2xs"
                  />
                </div>
                <div className="md:col-span-6 flex items-center gap-3">
                  <label className="w-24 text-right font-semibold text-xs text-slate-600 shrink-0">
                    GST No:
                  </label>
                  <input
                    type="text"
                    value={formData.gst_no}
                    onChange={(e) => setFormData({ ...formData, gst_no: e.target.value.toUpperCase() })}
                    placeholder="e.g. 24AJCPS5513M1Z1"
                    className="flex-1 px-3 py-1.5 text-xs font-mono uppercase font-bold border border-slate-300 bg-white text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-700/30 focus:border-emerald-700 transition-all shadow-2xs"
                  />
                </div>
              </div>
            </div>

            {/* ─── SECTION 2: ADDRESS & LOCATION ───────────────────────── */}
            <div className="border-t border-slate-200/80 pt-3 space-y-3">
              {/* Row 6: Address, Area, City, PIN Code */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                <div className="md:col-span-6 flex items-start gap-3">
                  <label className="w-28 text-right font-semibold text-xs text-slate-600 shrink-0 pt-2">
                    Address:
                  </label>
                  <textarea
                    rows={2}
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Street address, market or shop number..."
                    className="flex-1 px-3 py-1.5 text-xs font-medium border border-slate-300 bg-white text-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-700/30 focus:border-emerald-700 transition-all shadow-2xs resize-none"
                  />
                </div>
                <div className="md:col-span-6 space-y-2.5">
                  <div className="flex items-center gap-3">
                    <label className="w-24 text-right font-semibold text-xs text-slate-600 shrink-0">
                      Area:
                    </label>
                    <div className="flex-1 flex items-center gap-1.5">
                      <input
                        type="text"
                        value={formData.area}
                        onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                        placeholder="Area name"
                        className="flex-1 px-3 py-1.5 text-xs font-medium border border-slate-300 bg-white text-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-700/30 focus:border-emerald-700 transition-all shadow-2xs"
                      />
                      <button
                        type="button"
                        onClick={() => toast.info('Area list: enter specific market area.')}
                        className="p-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-200 cursor-pointer shadow-2xs"
                        title="Area list"
                      >
                        <Search size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="w-24 text-right font-bold text-xs text-slate-700 shrink-0">
                      City:
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="e.g. KADI / GONDAL"
                      className="w-1/2 px-3 py-1.5 text-xs uppercase font-bold border border-slate-300 bg-white text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-700/30 focus:border-emerald-700 transition-all shadow-2xs"
                    />
                    <span className="font-semibold text-slate-600 text-xs text-right w-16 shrink-0">
                      PIN:
                    </span>
                    <input
                      type="text"
                      value={formData.pin_code}
                      onChange={(e) => setFormData({ ...formData, pin_code: e.target.value })}
                      placeholder="382715"
                      className="w-1/2 px-3 py-1.5 text-xs font-mono font-medium border border-slate-300 bg-white text-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-700/30 focus:border-emerald-700 transition-all shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* Row 7: Adhar No, TIN No */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                <div className="md:col-span-6 flex items-center gap-3">
                  <label className="w-28 text-right font-semibold text-xs text-slate-600 shrink-0">
                    Aadhar No:
                  </label>
                  <input
                    type="text"
                    value={formData.aadhar_no}
                    onChange={(e) => setFormData({ ...formData, aadhar_no: e.target.value })}
                    placeholder="12-digit Aadhar number"
                    className="flex-1 px-3 py-1.5 text-xs font-mono border border-slate-300 bg-white text-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-700/30 focus:border-emerald-700 transition-all shadow-2xs"
                  />
                </div>
                <div className="md:col-span-6 flex items-center gap-3">
                  <label className="w-24 text-right font-semibold text-xs text-slate-600 shrink-0">
                    TIN No:
                  </label>
                  <input
                    type="text"
                    value={formData.tin_no}
                    onChange={(e) => setFormData({ ...formData, tin_no: e.target.value })}
                    className="flex-1 px-3 py-1.5 text-xs border border-slate-300 bg-white text-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-700/30 focus:border-emerald-700 transition-all shadow-2xs"
                  />
                </div>
              </div>

              {/* Row 8: CST No, Email */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                <div className="md:col-span-6 flex items-center gap-3">
                  <label className="w-28 text-right font-semibold text-xs text-slate-600 shrink-0">
                    CST No:
                  </label>
                  <input
                    type="text"
                    value={formData.cst_no}
                    onChange={(e) => setFormData({ ...formData, cst_no: e.target.value })}
                    className="flex-1 px-3 py-1.5 text-xs border border-slate-300 bg-white text-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-700/30 focus:border-emerald-700 transition-all shadow-2xs"
                  />
                </div>
                <div className="md:col-span-6 flex items-center gap-3">
                  <label className="w-24 text-right font-semibold text-xs text-slate-600 shrink-0">
                    Email:
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="party@example.com"
                    className="flex-1 px-3 py-1.5 text-xs border border-slate-300 bg-white text-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-700/30 focus:border-emerald-700 transition-all shadow-2xs"
                  />
                </div>
              </div>

              {/* Row 9: Reference By */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                <div className="md:col-span-6 flex items-center gap-3">
                  <label className="w-28 text-right font-semibold text-xs text-slate-600 shrink-0">
                    Reference By:
                  </label>
                  <input
                    type="text"
                    value={formData.reference_by}
                    onChange={(e) => setFormData({ ...formData, reference_by: e.target.value })}
                    placeholder="Optional broker or party reference"
                    className="flex-1 px-3 py-1.5 text-xs border border-slate-300 bg-white text-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-700/30 focus:border-emerald-700 transition-all shadow-2xs"
                  />
                </div>
              </div>
            </div>

            {/* ─── SECTION 3: BANKING & SETTINGS ───────────────────────── */}
            <div className="border-t border-slate-200/80 pt-3 space-y-3">
              {/* Row 10: Bank, PAN No */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                <div className="md:col-span-6 flex items-center gap-3">
                  <label className="w-28 text-right font-semibold text-xs text-slate-600 shrink-0">
                    Bank Name:
                  </label>
                  <input
                    type="text"
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                    placeholder="Select or enter bank name..."
                    className="flex-1 px-3 py-1.5 text-xs border border-slate-300 bg-white text-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-700/30 focus:border-emerald-700 transition-all shadow-2xs"
                  />
                </div>
                <div className="md:col-span-6 flex items-center gap-3">
                  <label className="w-24 text-right font-semibold text-xs text-slate-600 shrink-0">
                    PAN No:
                  </label>
                  <input
                    type="text"
                    value={formData.pan_no}
                    onChange={(e) => setFormData({ ...formData, pan_no: e.target.value.toUpperCase() })}
                    placeholder="10-digit PAN"
                    className="flex-1 px-3 py-1.5 text-xs font-mono uppercase font-bold border border-slate-300 bg-white text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-700/30 focus:border-emerald-700 transition-all shadow-2xs"
                  />
                </div>
              </div>

              {/* Row 11: Account No, IFSC Code */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                <div className="md:col-span-6 flex items-center gap-3">
                  <label className="w-28 text-right font-semibold text-xs text-slate-600 shrink-0">
                    Account No:
                  </label>
                  <input
                    type="text"
                    value={formData.account_no}
                    onChange={(e) => setFormData({ ...formData, account_no: e.target.value })}
                    placeholder="Bank account number"
                    className="flex-1 px-3 py-1.5 text-xs font-mono border border-slate-300 bg-white text-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-700/30 focus:border-emerald-700 transition-all shadow-2xs"
                  />
                </div>
                <div className="md:col-span-6 flex items-center gap-3">
                  <label className="w-24 text-right font-semibold text-xs text-slate-600 shrink-0">
                    IFSC Code:
                  </label>
                  <input
                    type="text"
                    value={formData.ifsc_code}
                    onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value.toUpperCase() })}
                    placeholder="e.g. SBIN0001234"
                    className="flex-1 px-3 py-1.5 text-xs font-mono uppercase font-bold border border-slate-300 bg-white text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-700/30 focus:border-emerald-700 transition-all shadow-2xs"
                  />
                </div>
              </div>

              {/* Row 12: Branch, Layout */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                <div className="md:col-span-6 flex items-center gap-3">
                  <label className="w-28 text-right font-semibold text-xs text-slate-600 shrink-0">
                    Branch:
                  </label>
                  <input
                    type="text"
                    value={formData.branch}
                    onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                    placeholder="Bank branch location"
                    className="flex-1 px-3 py-1.5 text-xs border border-slate-300 bg-white text-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-700/30 focus:border-emerald-700 transition-all shadow-2xs"
                  />
                </div>
                <div className="md:col-span-6 flex items-center gap-3">
                  <label className="w-24 text-right font-semibold text-xs text-slate-600 shrink-0">
                    Layout:
                  </label>
                  <div className="flex-1 flex items-center gap-2">
                    <select
                      value={formData.layout}
                      onChange={(e) => setFormData({ ...formData, layout: e.target.value })}
                      className="flex-1 px-3 py-1.5 text-xs font-semibold border border-slate-300 bg-white text-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-700/30 focus:border-emerald-700 transition-all shadow-2xs cursor-pointer"
                    >
                      <option value="Pioneer">Pioneer</option>
                      <option value="Standard">Standard</option>
                      <option value="GST Detailed">GST Detailed</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => toast.info('Cover Layout is set to Pioneer default.')}
                      className="text-xs text-emerald-800 hover:text-emerald-950 underline shrink-0 cursor-pointer font-semibold"
                    >
                      Change Layout
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 13: Website, Cheque Layout, Print */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                <div className="md:col-span-6 flex items-center gap-3">
                  <label className="w-28 text-right font-semibold text-xs text-slate-600 shrink-0">
                    Website:
                  </label>
                  <input
                    type="text"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="www.party.com"
                    className="flex-1 px-3 py-1.5 text-xs border border-slate-300 bg-white text-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-700/30 focus:border-emerald-700 transition-all shadow-2xs"
                  />
                </div>
                <div className="md:col-span-6 flex items-center gap-3">
                  <label className="w-24 text-right font-semibold text-xs text-slate-600 shrink-0">
                    Cheque Layout:
                  </label>
                  <input
                    type="text"
                    value={formData.cheque_layout}
                    onChange={(e) => setFormData({ ...formData, cheque_layout: e.target.value })}
                    placeholder="Layout code"
                    className="w-28 px-3 py-1.5 text-xs border border-slate-300 bg-white text-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-700/30 focus:border-emerald-700 transition-all shadow-2xs"
                  />
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 ml-auto cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={printChecked}
                      onChange={(e) => setPrintChecked(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-700 focus:ring-emerald-600 border-slate-300"
                    />
                    <span>Print on Save</span>
                  </label>
                </div>
              </div>
            </div>
          </form>

          {/* ─── BOTTOM ACTION BUTTONS TOOLBAR (CRM THEME) ─────────── */}
          <div className="mt-6 pt-4 border-t border-slate-200/90 flex flex-wrap items-center justify-between gap-2.5 bg-slate-50/70 p-3 sm:p-4 rounded-xl shadow-2xs">
            {/* Primary Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSave()}
                disabled={saving}
                className="px-4 py-2 bg-[#0a3821] hover:bg-[#104e2d] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer transition-all active:scale-95 border border-[#0d3f25]"
                title="Save Contact (F10)"
              >
                <Save size={15} className="text-amber-400" />
                <span>Save (F10)</span>
              </button>

              <button
                type="button"
                onClick={handleClearNew}
                className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all active:scale-95"
                title="Clear / New (F2)"
              >
                <RotateCcw size={14} className="text-slate-600" />
                <span>Clear/New (F2)</span>
              </button>
            </div>

            {/* Navigation Controls: |< F, < P, N >, L >| */}
            <div className="flex items-center gap-1 bg-white p-1 border border-slate-200 rounded-xl shadow-2xs">
              <button
                type="button"
                onClick={() => navState.first_id && loadContact(navState.first_id)}
                disabled={!navState.first_id || navState.first_id === currentId}
                className="px-2.5 py-1.5 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-900 disabled:opacity-30 border border-slate-200 rounded-lg font-bold text-xs text-slate-700 cursor-pointer flex items-center gap-1 transition-all"
                title="First Record"
              >
                <ChevronsLeft size={14} />
                <span>F</span>
              </button>
              <button
                type="button"
                onClick={() => navState.prev_id && loadContact(navState.prev_id)}
                disabled={!navState.prev_id}
                className="px-2.5 py-1.5 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-900 disabled:opacity-30 border border-slate-200 rounded-lg font-bold text-xs text-slate-700 cursor-pointer flex items-center gap-1 transition-all"
                title="Previous Record"
              >
                <ChevronLeft size={14} />
                <span>P</span>
              </button>
              <button
                type="button"
                onClick={() => navState.next_id && loadContact(navState.next_id)}
                disabled={!navState.next_id}
                className="px-2.5 py-1.5 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-900 disabled:opacity-30 border border-slate-200 rounded-lg font-bold text-xs text-slate-700 cursor-pointer flex items-center gap-1 transition-all"
                title="Next Record"
              >
                <span>N</span>
                <ChevronRight size={14} />
              </button>
              <button
                type="button"
                onClick={() => navState.last_id && loadContact(navState.last_id)}
                disabled={!navState.last_id || navState.last_id === currentId}
                className="px-2.5 py-1.5 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-900 disabled:opacity-30 border border-slate-200 rounded-lg font-bold text-xs text-slate-700 cursor-pointer flex items-center gap-1 transition-all"
                title="Last Record"
              >
                <span>L</span>
                <ChevronsRight size={14} />
              </button>
            </div>

            {/* Utility Tools: Find, Delete, Print, SMS, Exit */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsFindModalOpen(true)}
                className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all"
                title="Find Contact (F3)"
              >
                <Search size={14} className="text-slate-600" />
                <span>Find (F3)</span>
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={!currentId || hasDeals}
                className="px-3 py-2 bg-white hover:bg-rose-50 border border-rose-200 text-rose-700 disabled:opacity-30 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all"
                title={hasDeals ? 'Cannot delete: Deals linked in register' : 'Delete Contact'}
              >
                <Trash2 size={14} />
                <span>Delete</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all"
                title="Print Contact (F9)"
              >
                <Printer size={14} className="text-slate-600" />
                <span>Print (F9)</span>
              </button>

              <button
                type="button"
                onClick={handleWhatsApp}
                className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all"
                title="Send WhatsApp or SMS"
              >
                <MessageCircle size={14} className="text-emerald-700" />
                <span>SMS</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Find Contact Modal (F3) */}
      <FindContactModal
        isOpen={isFindModalOpen}
        onClose={() => setIsFindModalOpen(false)}
        onSelect={(contactId) => loadContact(contactId)}
      />
    </div>
  );
};
export default ContactMasterPage;
