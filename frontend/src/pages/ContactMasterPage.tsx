import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Save,
  RotateCcw,
  Search,
  Trash2,
  Printer,
  MessageCircle,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  AlertTriangle,
  Building2,
  CheckCircle2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { contactsApi } from '@/api/contacts';
import { Contact, PartyType } from '@/types';
import { FindContactModal } from '@/components/contact/FindContactModal';
import { formatWhatsAppUrl } from '@/lib/utils';

export const ContactMasterPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryId = searchParams.get('id');

  const [currentId, setCurrentId] = useState<number | null>(queryId ? Number(queryId) : null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isFindModalOpen, setIsFindModalOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    date: new Date().toISOString().split('T')[0],
    name: '',
    party_type: 'BUYER' as PartyType,
    contact_person_1: '',
    contact_person_2: '',
    mobile_1: '',
    mobile_2: '',
    phone_office_1: '',
    phone_office_2: '',
    address: '',
    area: '',
    city: '',
    pin_code: '',
    gst_no: '',
    pan_no: '',
    aadhar_no: '',
    email: '',
    reference_by: '',
  });

  const [hasDeals, setHasDeals] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  // Nav records state
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

  // Initialize: load contact or new code
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
        contact_person_1: contact.contact_person_1 || '',
        contact_person_2: contact.contact_person_2 || '',
        mobile_1: contact.mobile_1 || '',
        mobile_2: contact.mobile_2 || '',
        phone_office_1: contact.phone_office_1 || '',
        phone_office_2: contact.phone_office_2 || '',
        address: contact.address || '',
        area: contact.area || '',
        city: contact.city || '',
        pin_code: contact.pin_code || '',
        gst_no: contact.gst_no || '',
        pan_no: contact.pan_no || '',
        aadhar_no: contact.aadhar_no || '',
        email: contact.email || '',
        reference_by: contact.reference_by || '',
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
        contact_person_1: '',
        contact_person_2: '',
        mobile_1: '',
        mobile_2: '',
        phone_office_1: '',
        phone_office_2: '',
        address: '',
        area: '',
        city: '',
        pin_code: '',
        gst_no: '',
        pan_no: '',
        aadhar_no: '',
        email: '',
        reference_by: '',
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

  // Save handler
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
        toast.success(`Contact '${updated.name}' updated successfully!`);
        loadContact(updated.id);
      } else {
        const created = await contactsApi.createContact(formData);
        toast.success(`Contact '${created.name}' created with Code ${created.code}!`);
        loadContact(created.id);
      }
    } catch (err: any) {
      const msg = err.response?.data?.code?.[0] || err.response?.data?.name?.[0] || err.response?.data?.mobile_1?.[0] || err.response?.data?.detail || 'Failed to save contact';
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

  // WhatsApp click-to-send
  const handleWhatsApp = () => {
    const rawMobile = formData.mobile_1?.trim() || '';
    const isPlaceholder = ['9898000000', '1414141414', '9999999999', '0000000000'].includes(rawMobile);
    if (!rawMobile) {
      toast.error('No mobile number entered for WhatsApp.');
      return;
    }
    if (isPlaceholder) {
      toast.error('WhatsApp link disabled: Contact has a placeholder or missing mobile number.');
      return;
    }
    const url = formatWhatsAppUrl(
      rawMobile,
      `Namaste ${formData.name}, greetings from Jalaram Brokers.`
    );
    window.open(url, '_blank');
  };

  // Print contact detail
  const handlePrint = () => {
    window.print();
  };

  // Keyboard shortcuts (F10 Save, F2 New, F3 Find, F9 Print, Esc Exit)
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
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [formData, currentId]);

  return (
    <div className="max-w-5xl mx-auto space-y-3 pb-12">
      {/* Top Title Bar matching legacy Pioneer Systems software */}
      <div className="bg-[#1b4332] text-white rounded-t-xl px-4 py-2.5 flex items-center justify-between shadow-md border-b-2 border-amber-400">
        <div className="flex items-center gap-2">
          <Building2 size={18} className="text-amber-300" />
          <h1 className="font-bold text-base tracking-wide uppercase font-mono">
            Contact Master
          </h1>
          <span className="text-xs text-amber-200/90 font-sans ml-2">
            (પાર્ટી / મિલ માસ્ટર)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] bg-[#122e22] text-amber-300 font-mono px-2 py-0.5 rounded border border-[#2d5a44]">
            Shortcuts: [F10] Save | [F2] New | [F3] Find | [F9] Print
          </span>
          <button
            onClick={() => navigate('/contacts/view')}
            className="p-1 rounded text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
            title="Exit to Contact View"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Main Form Box matching Pioneer Desktop layout */}
      <div className="bg-[#eef2f6] border-2 border-[#1b4332] rounded-b-xl shadow-xl p-4 sm:p-6 text-slate-800">
        {/* Duplicate Warning Alert */}
        {duplicateWarning && (
          <div className="mb-4 p-3 bg-amber-50 border-l-4 border-amber-500 text-amber-800 rounded-r text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-600 shrink-0" />
              <span className="font-semibold">{duplicateWarning}</span>
            </div>
            <span className="text-[10px] text-amber-700 uppercase tracking-wider font-bold">
              Duplicate Warning
            </span>
          </div>
        )}

        {/* Has Deals Protection Alert */}
        {hasDeals && (
          <div className="mb-4 p-2.5 bg-blue-50 border-l-4 border-blue-500 text-blue-800 rounded-r text-xs flex items-center gap-2">
            <CheckCircle2 size={15} className="text-blue-600" />
            <span>
              This party has active entries in the <strong>Sauda Register</strong>. Primary details are locked from accidental deletion.
            </span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-3.5">
          {/* Row 1: *Name (teal highlighted like Pioneer), Code, Date */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            <div className="md:col-span-6 flex items-center gap-2">
              <label className="w-28 text-xs font-bold text-slate-700 text-right shrink-0">
                *Name:
              </label>
              <input
                ref={nameInputRef}
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter Party / Mill Name"
                className="flex-1 px-3 py-1.5 text-sm font-semibold border-2 border-[#047857] bg-[#a7f3d0] text-slate-900 rounded focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1b4332] uppercase shadow-xs"
                required
              />
            </div>

            <div className="md:col-span-3 flex items-center gap-2">
              <label className="w-16 text-xs font-bold text-slate-700 text-right shrink-0">
                Code:
              </label>
              <input
                type="text"
                value={formData.code}
                readOnly
                className="w-full px-2.5 py-1.5 text-xs font-mono font-bold border border-slate-300 bg-slate-200 text-slate-700 rounded select-all cursor-not-allowed"
                title="Auto-generated unique Party Code (Party ID)"
              />
            </div>

            <div className="md:col-span-3 flex items-center gap-2">
              <label className="w-14 text-xs font-bold text-slate-700 text-right shrink-0">
                Date:
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 bg-white text-slate-800 rounded focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
              />
            </div>
          </div>

          {/* Row 2: Party Type (replaces A/c Type) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            <div className="md:col-span-6 flex items-center gap-2">
              <label className="w-28 text-xs font-bold text-slate-700 text-right shrink-0">
                Party Type:
              </label>
              <select
                value={formData.party_type}
                onChange={(e) => setFormData({ ...formData, party_type: e.target.value as PartyType })}
                className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 bg-white text-slate-800 rounded focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
              >
                <option value="BUYER">Buyer / પાર્ટી (વેપારી)</option>
                <option value="COMPANY_MILL">Company-Mill / ઓઈલ મિલ (સેલર)</option>
              </select>
            </div>
          </div>

          {/* Row 3: Contact Person 1 & Contact Person 2 */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            <div className="md:col-span-6 flex items-center gap-2">
              <label className="w-28 text-xs font-bold text-slate-700 text-right shrink-0">
                Contact Person 1:
              </label>
              <input
                type="text"
                value={formData.contact_person_1}
                onChange={(e) => setFormData({ ...formData, contact_person_1: e.target.value })}
                placeholder="e.g. Lala Bhai"
                className="w-full px-3 py-1.5 text-xs border border-slate-300 bg-white text-slate-800 rounded focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
              />
            </div>

            <div className="md:col-span-6 flex items-center gap-2">
              <label className="w-28 text-xs font-bold text-slate-700 text-right shrink-0">
                Contact Person 2:
              </label>
              <input
                type="text"
                value={formData.contact_person_2}
                onChange={(e) => setFormData({ ...formData, contact_person_2: e.target.value })}
                placeholder="Optional second contact person"
                className="w-full px-3 py-1.5 text-xs border border-slate-300 bg-white text-slate-800 rounded focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
              />
            </div>
          </div>

          {/* Row 4: Mobile No 1 (For WhatsApp) & Mobile No 2 */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            <div className="md:col-span-6 flex items-center gap-2">
              <label className="w-28 text-xs font-bold text-slate-700 text-right shrink-0">
                *Mobile No 1:
              </label>
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="text"
                  value={formData.mobile_1}
                  onChange={(e) => setFormData({ ...formData, mobile_1: e.target.value })}
                  onBlur={handleMobileBlur}
                  placeholder="10 digit primary mobile"
                  className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 bg-white text-slate-800 rounded focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
                  required
                />
                {['9898000000', '1414141414', '9999999999', '0000000000'].includes(formData.mobile_1?.trim()) ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
                    ⚠️ Mobile missing
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleWhatsApp}
                    className="text-xs text-blue-700 hover:text-blue-900 font-bold underline shrink-0 cursor-pointer flex items-center gap-1"
                    title="Click to message this number on WhatsApp"
                  >
                    <MessageCircle size={13} className="text-emerald-600" />
                    For WhatsApp
                  </button>
                )}
              </div>
            </div>

            <div className="md:col-span-6 flex items-center gap-2">
              <label className="w-28 text-xs font-bold text-slate-700 text-right shrink-0">
                Mobile No 2:
              </label>
              <input
                type="text"
                value={formData.mobile_2}
                onChange={(e) => setFormData({ ...formData, mobile_2: e.target.value })}
                placeholder="Secondary mobile (optional)"
                className="w-full px-3 py-1.5 text-xs border border-slate-300 bg-white text-slate-800 rounded focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
              />
            </div>
          </div>

          {/* Row 5: Phone Off. 1 & Phone Off. 2 */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            <div className="md:col-span-6 flex items-center gap-2">
              <label className="w-28 text-xs font-bold text-slate-700 text-right shrink-0">
                Phone Off. 1:
              </label>
              <input
                type="text"
                value={formData.phone_office_1}
                onChange={(e) => setFormData({ ...formData, phone_office_1: e.target.value })}
                placeholder="Office landline / phone 1"
                className="w-full px-3 py-1.5 text-xs border border-slate-300 bg-white text-slate-800 rounded focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
              />
            </div>

            <div className="md:col-span-6 flex items-center gap-2">
              <label className="w-28 text-xs font-bold text-slate-700 text-right shrink-0">
                Phone Off. 2:
              </label>
              <input
                type="text"
                value={formData.phone_office_2}
                onChange={(e) => setFormData({ ...formData, phone_office_2: e.target.value })}
                placeholder="Office phone 2"
                className="w-full px-3 py-1.5 text-xs border border-slate-300 bg-white text-slate-800 rounded focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
              />
            </div>
          </div>

          {/* Row 6: GST No */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            <div className="md:col-span-6 flex items-center gap-2">
              <label className="w-28 text-xs font-bold text-slate-700 text-right shrink-0">
                GST No..:
              </label>
              <input
                type="text"
                value={formData.gst_no}
                onChange={(e) => setFormData({ ...formData, gst_no: e.target.value.toUpperCase() })}
                placeholder="e.g. 24AJCPS5513M1Z1"
                className="w-full px-3 py-1.5 text-xs font-mono uppercase border border-slate-300 bg-white text-slate-800 rounded focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
              />
            </div>
          </div>

          {/* Row 7: Address (multi-line) & Area */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
            <div className="md:col-span-6 flex items-start gap-2">
              <label className="w-28 text-xs font-bold text-slate-700 text-right shrink-0 pt-1.5">
                Address:
              </label>
              <textarea
                rows={2}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Shop / Mill full address..."
                className="w-full px-3 py-1.5 text-xs border border-slate-300 bg-white text-slate-800 rounded focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
              />
            </div>

            <div className="md:col-span-6 flex items-center gap-2 pt-1">
              <label className="w-28 text-xs font-bold text-slate-700 text-right shrink-0">
                Area:
              </label>
              <input
                type="text"
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                placeholder="GIDC / Market Yard / Area"
                className="w-full px-3 py-1.5 text-xs border border-slate-300 bg-white text-slate-800 rounded focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
              />
            </div>
          </div>

          {/* Row 8: City & PIN Code */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            <div className="md:col-span-6 flex items-center gap-2">
              <label className="w-28 text-xs font-bold text-slate-700 text-right shrink-0">
                City:
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="e.g. SANDESAR / KADI / AHMEDABAD"
                className="w-full px-3 py-1.5 text-xs uppercase border border-slate-300 bg-white text-slate-800 rounded focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
              />
            </div>

            <div className="md:col-span-6 flex items-center gap-2">
              <label className="w-28 text-xs font-bold text-slate-700 text-right shrink-0">
                PIN Code:
              </label>
              <input
                type="text"
                value={formData.pin_code}
                onChange={(e) => setFormData({ ...formData, pin_code: e.target.value })}
                placeholder="6-digit PIN"
                className="w-full px-3 py-1.5 text-xs border border-slate-300 bg-white text-slate-800 rounded focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
              />
            </div>
          </div>

          {/* Row 9: Adhar No. & PAN No. */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            <div className="md:col-span-6 flex items-center gap-2">
              <label className="w-28 text-xs font-bold text-slate-700 text-right shrink-0">
                Adhar No.:
              </label>
              <input
                type="text"
                value={formData.aadhar_no}
                onChange={(e) => setFormData({ ...formData, aadhar_no: e.target.value })}
                placeholder="12 digit Aadhar"
                className="w-full px-3 py-1.5 text-xs border border-slate-300 bg-white text-slate-800 rounded focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
              />
            </div>

            <div className="md:col-span-6 flex items-center gap-2">
              <label className="w-28 text-xs font-bold text-slate-700 text-right shrink-0">
                PAN No.:
              </label>
              <input
                type="text"
                value={formData.pan_no}
                onChange={(e) => setFormData({ ...formData, pan_no: e.target.value.toUpperCase() })}
                placeholder="10 digit PAN"
                className="w-full px-3 py-1.5 text-xs font-mono uppercase border border-slate-300 bg-white text-slate-800 rounded focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
              />
            </div>
          </div>

          {/* Row 10: Email1 & Reference By */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            <div className="md:col-span-6 flex items-center gap-2">
              <label className="w-28 text-xs font-bold text-slate-700 text-right shrink-0">
                Email1:
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="e.g. party@email.com"
                className="w-full px-3 py-1.5 text-xs border border-slate-300 bg-white text-slate-800 rounded focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
              />
            </div>

            <div className="md:col-span-6 flex items-center gap-2">
              <label className="w-28 text-xs font-bold text-slate-700 text-right shrink-0">
                Refrence By:
              </label>
              <input
                type="text"
                value={formData.reference_by}
                onChange={(e) => setFormData({ ...formData, reference_by: e.target.value })}
                placeholder="Referred by..."
                className="w-full px-3 py-1.5 text-xs border border-slate-300 bg-white text-slate-800 rounded focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
              />
            </div>
          </div>
        </form>

        {/* Pioneer Action Buttons Bar (matching screenshot layout) */}
        <div className="mt-6 pt-4 border-t-2 border-slate-300 flex flex-wrap items-center justify-between gap-2 bg-[#dce4ec] p-2.5 rounded-lg border">
          {/* Main action buttons: Save, Clear/New */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleSave()}
              disabled={saving}
              className="px-3 py-1.5 bg-[#1b4332] hover:bg-[#2d6a4f] text-white rounded font-bold text-xs flex items-center gap-1 shadow-sm transition-all cursor-pointer active:scale-95"
              title="Save contact record (Shortcut: F10)"
            >
              <Save size={14} className="text-amber-300" />
              <span>Save(F10)</span>
            </button>

            <button
              type="button"
              onClick={handleClearNew}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded font-bold text-xs flex items-center gap-1 shadow-sm transition-all cursor-pointer active:scale-95"
              title="Clear form and generate new code (Shortcut: F2)"
            >
              <RotateCcw size={14} className="text-sky-300" />
              <span>Clear/New(F2)</span>
            </button>
          </div>

          {/* Navigation buttons: First, Previous, Next, Last */}
          <div className="flex items-center gap-1 bg-white p-1 rounded border border-slate-300">
            <button
              type="button"
              onClick={() => navState.first_id && loadContact(navState.first_id)}
              disabled={!navState.first_id || navState.first_id === currentId}
              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-30 rounded text-[11px] font-mono font-bold text-slate-700 flex items-center gap-0.5 cursor-pointer"
              title="First Record"
            >
              <ChevronsLeft size={13} />
              <span>F</span>
            </button>

            <button
              type="button"
              onClick={() => navState.prev_id && loadContact(navState.prev_id)}
              disabled={!navState.prev_id}
              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-30 rounded text-[11px] font-mono font-bold text-slate-700 flex items-center gap-0.5 cursor-pointer"
              title="Previous Record"
            >
              <ChevronLeft size={13} />
              <span>P</span>
            </button>

            <button
              type="button"
              onClick={() => navState.next_id && loadContact(navState.next_id)}
              disabled={!navState.next_id}
              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-30 rounded text-[11px] font-mono font-bold text-slate-700 flex items-center gap-0.5 cursor-pointer"
              title="Next Record"
            >
              <span>N</span>
              <ChevronRight size={13} />
            </button>

            <button
              type="button"
              onClick={() => navState.last_id && loadContact(navState.last_id)}
              disabled={!navState.last_id || navState.last_id === currentId}
              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-30 rounded text-[11px] font-mono font-bold text-slate-700 flex items-center gap-0.5 cursor-pointer"
              title="Last Record"
            >
              <span>L</span>
              <ChevronsRight size={13} />
            </button>
          </div>

          {/* Secondary buttons: Find, Delete, Print, WhatsApp, Exit */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsFindModalOpen(true)}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold text-xs flex items-center gap-1 shadow-sm transition-all cursor-pointer active:scale-95"
              title="Find contact by name, code or mobile (Shortcut: F3)"
            >
              <Search size={14} />
              <span>Find(F3)</span>
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={!currentId || hasDeals}
              className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 disabled:opacity-30 text-white rounded font-bold text-xs flex items-center gap-1 shadow-sm transition-all cursor-pointer active:scale-95"
              title={hasDeals ? 'Cannot delete: Deals exist in Sauda Register' : 'Delete Contact'}
            >
              <Trash2 size={14} />
              <span>Delete</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-600 hover:bg-slate-700 text-white rounded font-bold text-xs flex items-center gap-1 shadow-sm transition-all cursor-pointer"
              title="Print Contact Detail (Shortcut: F9)"
            >
              <Printer size={14} />
              <span>Print(F9)</span>
            </button>

            <button
              type="button"
              onClick={handleWhatsApp}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs flex items-center gap-1 shadow-sm transition-all cursor-pointer"
              title="Send WhatsApp message"
            >
              <MessageCircle size={14} />
              <span>WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/contacts/view')}
              className="px-3 py-1.5 bg-slate-500 hover:bg-slate-600 text-white rounded font-bold text-xs flex items-center gap-1 shadow-sm transition-all cursor-pointer"
              title="Exit"
            >
              <LogOut size={14} />
              <span>Exit</span>
            </button>
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
