import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PhoneCall,
  Plus,
  Search,
  Filter,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Flame,
  MessageCircle,
  FileSpreadsheet,
  UserCheck,
  UserPlus,
  RefreshCw,
  X,
  PhoneForwarded,
  History,
  Building2,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { leadsApi, LeadItem, LeadStats } from '@/api/leads';
import { cn, formatWhatsAppUrl } from '@/lib/utils';

export const LeadsPage: React.FC = () => {
  const navigate = useNavigate();

  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [stats, setStats] = useState<LeadStats>({
    total_leads: 0,
    today_due: 0,
    overdue: 0,
    converted: 0,
    hot_leads: 0,
  });
  const [loading, setLoading] = useState(false);

  // Filter state
  const [activeTab, setActiveTab] = useState<'ALL' | 'TODAY' | 'OVERDUE' | 'HOT' | 'CONVERTED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [staffFilter, setStaffFilter] = useState('ALL');
  const [productFilter, setProductFilter] = useState('ALL');

  // Modals state
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [isLogCallModalOpen, setIsLogCallModalOpen] = useState(false);
  const [selectedLeadForCall, setSelectedLeadForCall] = useState<LeadItem | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedLeadForHistory, setSelectedLeadForHistory] = useState<LeadItem | null>(null);

  // New Lead Form state
  const [leadFormData, setLeadFormData] = useState({
    party_name: '',
    mobile_number: '',
    city_village: '',
    interested_product: 'Kapas Khol',
    lead_source: 'Phone Call',
    assigned_staff_name: 'Admin',
    status: 'New Lead',
    priority: 'WARM' as 'HOT' | 'WARM' | 'COLD',
    next_followup_date: new Date().toISOString().split('T')[0],
    discussed_rate: '',
    expected_quantity: '',
    remarks: '',
  });
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  // Log Call Form state
  const [callLogData, setCallLogData] = useState({
    call_result: 'Interested',
    rate_discussed: '',
    remarks: '',
    next_followup_date: new Date().toISOString().split('T')[0],
    staff_name: 'Admin',
  });

  const staffList = [
    'Admin',
    'Rahul Patel',
    'Priya Shah',
    'Neha Joshi',
    'Suresh Verma',
    'Kavita Dave',
  ];

  const productList = [
    'Kapas Khol',
    'Makai Khol',
    'Hominy Feed',
    'Pellet',
    'Mix Cattlefeed',
    'Wheat Bran',
  ];

  useEffect(() => {
    fetchLeads();
    fetchStats();
  }, [activeTab, statusFilter, staffFilter, productFilter]);

  const fetchStats = async () => {
    try {
      const data = await leadsApi.getStats();
      setStats(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (activeTab === 'TODAY') params.filter_type = 'TODAY';
      else if (activeTab === 'OVERDUE') params.filter_type = 'OVERDUE';
      else if (activeTab === 'HOT') params.priority = 'HOT';
      else if (activeTab === 'CONVERTED') params.status = 'Converted to Customer';

      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (staffFilter !== 'ALL') params.assigned_staff = staffFilter;
      if (productFilter !== 'ALL') params.interested_product = productFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const data = await leadsApi.getLeads(params);
      setLeads(data);
    } catch (e) {
      toast.error('Failed to load leads list');
    } finally {
      setLoading(false);
    }
  };

  const handleMobileBlur = async () => {
    if (!leadFormData.mobile_number || leadFormData.mobile_number.trim().length < 6) {
      setDuplicateWarning(null);
      return;
    }
    try {
      const res = await leadsApi.checkDuplicate(leadFormData.mobile_number.trim());
      if (res.is_duplicate) {
        setDuplicateWarning(res.message);
      } else {
        setDuplicateWarning(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadFormData.party_name.trim()) {
      toast.error('Party / Trader Name is required!');
      return;
    }
    if (!leadFormData.mobile_number.trim()) {
      toast.error('Mobile Number is required!');
      return;
    }

    try {
      await leadsApi.createLead({
        ...leadFormData,
        discussed_rate: leadFormData.discussed_rate ? Number(leadFormData.discussed_rate) : null,
      });
      toast.success(`Lead for '${leadFormData.party_name}' created successfully!`);
      setIsNewLeadModalOpen(false);
      setLeadFormData({
        party_name: '',
        mobile_number: '',
        city_village: '',
        interested_product: 'Kapas Khol',
        lead_source: 'Phone Call',
        assigned_staff_name: 'Admin',
        status: 'New Lead',
        priority: 'WARM',
        next_followup_date: new Date().toISOString().split('T')[0],
        discussed_rate: '',
        expected_quantity: '',
        remarks: '',
      });
      setDuplicateWarning(null);
      fetchLeads();
      fetchStats();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to create lead');
    }
  };

  const handleConvertToCustomer = async (lead: LeadItem) => {
    if (!window.confirm(`Convert '${lead.party_name}' into Customer Master? (Auto-generates Code in Contact Master)`)) {
      return;
    }
    try {
      const res = await leadsApi.convertToCustomer(lead.id);
      toast.success(res.message);
      fetchLeads();
      fetchStats();
      if (window.confirm('Do you want to open Contact Master for this new party now?')) {
        navigate(`/contacts/master?id=${res.contact_id}`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to convert lead');
    }
  };

  const handleOpenLogCall = (lead: LeadItem) => {
    setSelectedLeadForCall(lead);
    setCallLogData({
      call_result: 'Interested',
      rate_discussed: lead.discussed_rate ? String(lead.discussed_rate) : '',
      remarks: '',
      next_followup_date: lead.next_followup_date || new Date().toISOString().split('T')[0],
      staff_name: lead.assigned_staff_name || 'Admin',
    });
    setIsLogCallModalOpen(true);
  };

  const handleSaveCallLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadForCall) return;

    try {
      await leadsApi.logCall(selectedLeadForCall.id, callLogData);
      toast.success(`Call logged for '${selectedLeadForCall.party_name}'!`);
      setIsLogCallModalOpen(false);
      fetchLeads();
      fetchStats();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to record call');
    }
  };

  const handleWhatsAppLead = (lead: LeadItem) => {
    if (!lead.mobile_number) {
      toast.error('No mobile number available for WhatsApp.');
      return;
    }
    const msg =
      `*JALARAM BROKERS (અમદાવાદ)*\n` +
      `નમસ્તે ${lead.party_name},\n` +
      `આજના ${lead.interested_product || 'પશુ આહાર / કપાસ ખોળ'} ના બજાર ભાવ અને ડિલિવરી માટે સંપર્ક કર્યો છે.\n` +
      (lead.discussed_rate ? `ઓફર ભાવ: ₹${lead.discussed_rate}\n` : '') +
      `જરૂરિયાત જણાવશો જી. આભાર.`;
    window.open(formatWhatsAppUrl(lead.mobile_number, msg), '_blank');
  };

  const handleDeleteLead = async (lead: LeadItem) => {
    if (!window.confirm(`Are you sure you want to delete lead '${lead.party_name}' (${lead.lead_id})?`)) {
      return;
    }
    try {
      await leadsApi.deleteLead(lead.id);
      toast.success('Lead deleted successfully');
      fetchLeads();
      fetchStats();
    } catch (e) {
      toast.error('Failed to delete lead');
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12">
      {/* ─── HEADER BAR ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white px-5 py-4 rounded-xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <PhoneCall className="text-[#1b4332]" size={22} />
            Lead Management & Smart Follow-up (લીડ મેનેજમેન્ટ)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Module 7: Daily Autopilot Telecalling, Call History, Automatic Reminders & 1-Click Customer Conversion
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => leadsApi.exportExcel({
              status: statusFilter !== 'ALL' ? statusFilter : undefined,
              assigned_staff: staffFilter !== 'ALL' ? staffFilter : undefined,
              interested_product: productFilter !== 'ALL' ? productFilter : undefined,
              search: searchQuery,
            })}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-300 transition-colors cursor-pointer"
            title="Export Leads to Excel"
          >
            <FileSpreadsheet size={15} className="text-emerald-700" />
            <span>Excel Export</span>
          </button>

          <button
            type="button"
            onClick={() => setIsNewLeadModalOpen(true)}
            className="px-4 py-2 bg-[#1b4332] hover:bg-[#2d6a4f] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
          >
            <Plus size={15} className="text-amber-300" />
            <span>New Lead Entry (નવી લીડ)</span>
          </button>
        </div>
      </div>

      {/* ─── KPI STATS CARDS ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div
          onClick={() => setActiveTab('ALL')}
          className={cn(
            'bg-white p-3.5 rounded-xl border transition-all cursor-pointer shadow-xs',
            activeTab === 'ALL' ? 'border-[#1b4332] ring-2 ring-[#1b4332]/20' : 'border-slate-200'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">Total Leads (તમામ લીડ)</span>
            <PhoneCall size={16} className="text-[#1b4332]" />
          </div>
          <div className="text-2xl font-black text-slate-800 mt-1.5">{stats.total_leads}</div>
          <span className="text-[10px] text-slate-400">All registered inquiries</span>
        </div>

        <div
          onClick={() => setActiveTab('TODAY')}
          className={cn(
            'bg-white p-3.5 rounded-xl border transition-all cursor-pointer shadow-xs',
            activeTab === 'TODAY' ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-200'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-700 font-bold">Today's Due (આજના ફોન)</span>
            <Clock size={16} className="text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700 mt-1.5">{stats.today_due}</div>
          <span className="text-[10px] text-amber-600/80 font-medium">Follow-up due today</span>
        </div>

        <div
          onClick={() => setActiveTab('OVERDUE')}
          className={cn(
            'bg-white p-3.5 rounded-xl border transition-all cursor-pointer shadow-xs',
            activeTab === 'OVERDUE' ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-slate-200'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-rose-700 font-bold">Overdue (બાકી રહી ગયેલા)</span>
            <AlertTriangle size={16} className="text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-700 mt-1.5">{stats.overdue}</div>
          <span className="text-[10px] text-rose-600/80 font-medium">Passed follow-up date</span>
        </div>

        <div
          onClick={() => setActiveTab('HOT')}
          className={cn(
            'bg-white p-3.5 rounded-xl border transition-all cursor-pointer shadow-xs',
            activeTab === 'HOT' ? 'border-orange-500 ring-2 ring-orange-500/20' : 'border-slate-200'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-orange-700 font-bold">Hot Leads (તાત્કાલિક)</span>
            <Flame size={16} className="text-orange-500" />
          </div>
          <div className="text-2xl font-black text-orange-600 mt-1.5">{stats.hot_leads}</div>
          <span className="text-[10px] text-orange-600/80 font-medium">High purchase probability</span>
        </div>

        <div
          onClick={() => setActiveTab('CONVERTED')}
          className={cn(
            'bg-white p-3.5 rounded-xl border transition-all cursor-pointer shadow-xs',
            activeTab === 'CONVERTED' ? 'border-emerald-600 ring-2 ring-emerald-600/20' : 'border-slate-200'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-emerald-800 font-bold">Converted (ગ્રાહક બન્યા)</span>
            <UserCheck size={16} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-1.5">{stats.converted}</div>
          <span className="text-[10px] text-emerald-600/80 font-medium">Moved to Contact Master</span>
        </div>
      </div>

      {/* ─── FILTERS & SEARCH ROW ───────────────────────────────────── */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setActiveTab('ALL')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer',
              activeTab === 'ALL' ? 'bg-[#1b4332] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            )}
          >
            All Leads
          </button>
          <button
            onClick={() => setActiveTab('TODAY')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1',
              activeTab === 'TODAY' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            )}
          >
            <Clock size={13} />
            Today's Follow-up
          </button>
          <button
            onClick={() => setActiveTab('OVERDUE')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1',
              activeTab === 'OVERDUE' ? 'bg-rose-700 text-white' : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
            )}
          >
            <AlertTriangle size={13} />
            Overdue
          </button>
          <button
            onClick={() => setActiveTab('HOT')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1',
              activeTab === 'HOT' ? 'bg-orange-600 text-white' : 'bg-orange-50 text-orange-800 hover:bg-orange-100'
            )}
          >
            <Flame size={13} />
            Hot Leads
          </button>
          <button
            onClick={() => setActiveTab('CONVERTED')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1',
              activeTab === 'CONVERTED' ? 'bg-emerald-700 text-white' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            )}
          >
            <UserCheck size={13} />
            Converted
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search box */}
          <div className="relative w-56">
            <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchLeads()}
              placeholder="Search name, mobile, city..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
            />
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
          >
            <option value="ALL">All Status</option>
            <option value="New Lead">New Lead</option>
            <option value="Interested">Interested</option>
            <option value="Rate Given">Rate Given</option>
            <option value="Follow-up Pending">Follow-up Pending</option>
            <option value="Converted to Customer">Converted to Customer</option>
            <option value="Not Interested">Not Interested</option>
          </select>

          {/* Staff filter */}
          <select
            value={staffFilter}
            onChange={(e) => setStaffFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
          >
            <option value="ALL">All Staff</option>
            {staffList.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Product filter */}
          <select
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
          >
            <option value="ALL">All Products</option>
            {productList.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          <button
            onClick={fetchLeads}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg border border-slate-300 cursor-pointer"
            title="Refresh Leads"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ─── LEADS TABLE ────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#f8fafc] text-slate-700 font-bold border-b border-slate-200 select-none">
                <th className="py-2.5 px-3">Lead ID</th>
                <th className="py-2.5 px-3">Party / Trader Name</th>
                <th className="py-2.5 px-3">Mobile & City</th>
                <th className="py-2.5 px-3">Product & Qty</th>
                <th className="py-2.5 px-3">Assigned Staff</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Priority</th>
                <th className="py-2.5 px-3">Next Follow-up</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <RefreshCw className="animate-spin inline mr-2" size={16} /> Loading leads...
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No leads found matching current filters.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => {
                  const isOverdue =
                    lead.next_followup_date &&
                    new Date(lead.next_followup_date) < new Date(new Date().toDateString()) &&
                    lead.status !== 'Converted to Customer' &&
                    lead.status !== 'Not Interested';

                  return (
                    <tr
                      key={lead.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-600">
                        {lead.lead_id}
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">{lead.party_name}</div>
                        {lead.converted_contact_code && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 mt-0.5">
                            <CheckCircle2 size={10} />
                            Customer: {lead.converted_contact_code}
                          </span>
                        )}
                        {lead.remarks && (
                          <div className="text-[11px] text-slate-500 truncate max-w-xs mt-0.5">
                            {lead.remarks}
                          </div>
                        )}
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-800">{lead.mobile_number}</div>
                        <div className="text-[11px] text-slate-500">{lead.city_village || '—'}</div>
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-800">{lead.interested_product || '—'}</div>
                        <div className="text-[11px] text-slate-500">
                          {lead.expected_quantity ? `Qty: ${lead.expected_quantity}` : ''}
                          {lead.discussed_rate ? ` @ ₹${lead.discussed_rate}` : ''}
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-medium text-[11px]">
                          {lead.assigned_staff_name || 'Admin'}
                        </span>
                      </td>

                      <td className="py-2.5 px-3">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded text-[11px] font-bold inline-block',
                            lead.status === 'Converted to Customer'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : lead.status === 'Rate Given'
                              ? 'bg-blue-100 text-blue-800 border border-blue-300'
                              : lead.status === 'Interested'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : lead.status === 'Not Interested'
                              ? 'bg-slate-100 text-slate-600'
                              : 'bg-purple-100 text-purple-800 border border-purple-300'
                          )}
                        >
                          {lead.status}
                        </span>
                      </td>

                      <td className="py-2.5 px-3">
                        <span
                          className={cn(
                            'px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
                            lead.priority === 'HOT'
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : lead.priority === 'WARM'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-slate-100 text-slate-700'
                          )}
                        >
                          {lead.priority}
                        </span>
                      </td>

                      <td className="py-2.5 px-3">
                        <div
                          className={cn(
                            'font-semibold text-xs flex items-center gap-1',
                            isOverdue ? 'text-rose-600 font-bold' : 'text-slate-700'
                          )}
                        >
                          {isOverdue && <AlertTriangle size={12} className="text-rose-600 shrink-0" />}
                          <span>{lead.next_followup_date || '—'}</span>
                        </div>
                        {isOverdue && (
                          <span className="text-[10px] text-rose-600 font-bold uppercase">
                            Overdue
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Log Call Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenLogCall(lead)}
                            className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded border border-blue-300 cursor-pointer"
                            title="Log Call / Follow-up"
                          >
                            <PhoneForwarded size={13} />
                          </button>

                          {/* WhatsApp button */}
                          <button
                            type="button"
                            onClick={() => handleWhatsAppLead(lead)}
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded border border-emerald-300 cursor-pointer"
                            title="Message on WhatsApp"
                          >
                            <MessageCircle size={13} />
                          </button>

                          {/* Convert to Customer Button */}
                          {lead.status !== 'Converted to Customer' ? (
                            <button
                              type="button"
                              onClick={() => handleConvertToCustomer(lead)}
                              className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded text-[11px] flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95"
                              title="1-Click Convert to Customer Master"
                            >
                              <UserCheck size={12} />
                              <span>Convert</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => navigate(`/deals?mode=entry`)}
                              className="px-2 py-1 bg-[#1b4332] hover:bg-[#2d6a4f] text-white font-bold rounded text-[11px] flex items-center gap-1 cursor-pointer"
                              title="Create Sauda Deal for this Party"
                            >
                              <span>Deal</span>
                            </button>
                          )}

                          {/* Call History */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedLeadForHistory(lead);
                              setIsHistoryModalOpen(true);
                            }}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-300 cursor-pointer"
                            title="View Call History"
                          >
                            <History size={13} />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDeleteLead(lead)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                            title="Delete Lead"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── NEW LEAD ENTRY MODAL ───────────────────────────────────── */}
      {isNewLeadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-[#1b4332] text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus size={18} className="text-amber-300" />
                <h3 className="font-bold text-sm">New Lead Entry (નવી લીડ નોંધણી)</h3>
              </div>
              <button
                onClick={() => setIsNewLeadModalOpen(false)}
                className="p-1 rounded text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="p-5 space-y-3.5 overflow-y-auto flex-1">
              {duplicateWarning && (
                <div className="p-3 bg-amber-50 border border-amber-400 text-amber-900 rounded-lg text-xs flex items-center gap-2">
                  <AlertTriangle size={16} className="text-amber-700 shrink-0" />
                  <span className="font-semibold">{duplicateWarning}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Party / Trader Name (વેપારીનું નામ)*
                  </label>
                  <input
                    type="text"
                    value={leadFormData.party_name}
                    onChange={(e) => setLeadFormData({ ...leadFormData, party_name: e.target.value })}
                    placeholder="e.g. ABC Traders / Patel Cattle Feed"
                    className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mobile Number (મોબાઇલ)*
                  </label>
                  <input
                    type="text"
                    value={leadFormData.mobile_number}
                    onChange={(e) => setLeadFormData({ ...leadFormData, mobile_number: e.target.value })}
                    onBlur={handleMobileBlur}
                    placeholder="10 digit mobile"
                    className="w-full px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Village / City (ગામ / શહેર)
                  </label>
                  <input
                    type="text"
                    value={leadFormData.city_village}
                    onChange={(e) => setLeadFormData({ ...leadFormData, city_village: e.target.value })}
                    placeholder="e.g. Ahmedabad, Kadi, Anand"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Interested Product (કયો પ્રોડક્ટ જોઈએ છે?)
                  </label>
                  <select
                    value={leadFormData.interested_product}
                    onChange={(e) => setLeadFormData({ ...leadFormData, interested_product: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
                  >
                    {productList.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Lead Source (ક્યાંથી આવી?)
                  </label>
                  <select
                    value={leadFormData.lead_source}
                    onChange={(e) => setLeadFormData({ ...leadFormData, lead_source: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
                  >
                    <option value="Phone Call">Phone Call / ફોન</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Reference">Reference / રેફરન્સ</option>
                    <option value="Field Visit">Field Visit / રૂબરૂ</option>
                    <option value="Other">Other / અન્ય</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Assigned Staff (સંભાળનાર)
                  </label>
                  <select
                    value={leadFormData.assigned_staff_name}
                    onChange={(e) => setLeadFormData({ ...leadFormData, assigned_staff_name: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
                  >
                    {staffList.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Priority (પ્રાથમિકતા)
                  </label>
                  <select
                    value={leadFormData.priority}
                    onChange={(e) => setLeadFormData({ ...leadFormData, priority: e.target.value as any })}
                    className="w-full px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
                  >
                    <option value="HOT">🔥 Hot (અતિ મહત્વનું)</option>
                    <option value="WARM">⚡ Warm (સામાન્ય)</option>
                    <option value="COLD">❄ Cold (ઓછું મહત્વનું)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Status (સ્થિતિ)
                  </label>
                  <select
                    value={leadFormData.status}
                    onChange={(e) => setLeadFormData({ ...leadFormData, status: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
                  >
                    <option value="New Lead">New Lead / નવી ઇન્ક્વાયરી</option>
                    <option value="Interested">Interested / રસ ધરાવે છે</option>
                    <option value="Rate Given">Rate Given / ભાવ આપ્યો</option>
                    <option value="Follow-up Pending">Follow-up Pending</option>
                    <option value="Converted to Customer">Converted to Customer</option>
                    <option value="Not Interested">Not Interested</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Next Follow-up Date
                  </label>
                  <input
                    type="date"
                    value={leadFormData.next_followup_date}
                    onChange={(e) => setLeadFormData({ ...leadFormData, next_followup_date: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Discussed Rate (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={leadFormData.discussed_rate}
                    onChange={(e) => setLeadFormData({ ...leadFormData, discussed_rate: e.target.value })}
                    placeholder="e.g. 1250"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Expected Quantity (સંભાવિત જથ્થો)
                </label>
                <input
                  type="text"
                  value={leadFormData.expected_quantity}
                  onChange={(e) => setLeadFormData({ ...leadFormData, expected_quantity: e.target.value })}
                  placeholder="e.g. 100 મણ / 200 BAG"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Remarks / છેલ્લી વાતચીત
                </label>
                <textarea
                  rows={2}
                  value={leadFormData.remarks}
                  onChange={(e) => setLeadFormData({ ...leadFormData, remarks: e.target.value })}
                  placeholder="ગ્રાહક સાથે થયેલી વાતચીત નોંધો..."
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewLeadModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1b4332] hover:bg-[#2d6a4f] text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer active:scale-95"
                >
                  Save Lead (લીડ સેવ કરો)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── LOG CALL / FOLLOW-UP MODAL ─────────────────────────────── */}
      {isLogCallModalOpen && selectedLeadForCall && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-[#1b4332] text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PhoneForwarded size={17} className="text-amber-300" />
                <h3 className="font-bold text-sm">
                  Log Call: {selectedLeadForCall.party_name}
                </h3>
              </div>
              <button
                onClick={() => setIsLogCallModalOpen(false)}
                className="p-1 rounded text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCallLog} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Call Result (વાતચીતનું પરિણામ)*
                </label>
                <select
                  value={callLogData.call_result}
                  onChange={(e) => setCallLogData({ ...callLogData, call_result: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
                >
                  <option value="Interested">Interested / રસ ધરાવે છે</option>
                  <option value="Rate Given">Rate Given / રેટ આપ્યો</option>
                  <option value="Call Back">Call Back / ફરી ફોન કરવો</option>
                  <option value="Converted">Converted to Deal / સોદો થયો</option>
                  <option value="Not Interested">Not Interested / રસ નથી</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Rate Discussed (ચર્ચા કરેલ ભાવ)
                </label>
                <input
                  type="text"
                  value={callLogData.rate_discussed}
                  onChange={(e) => setCallLogData({ ...callLogData, rate_discussed: e.target.value })}
                  placeholder="e.g. ₹1,250 / BAG"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Next Follow-up Date (ફરી ફોન કરવાની તારીખ)
                </label>
                <input
                  type="date"
                  value={callLogData.next_followup_date}
                  onChange={(e) => setCallLogData({ ...callLogData, next_followup_date: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Staff Member
                </label>
                <select
                  value={callLogData.staff_name}
                  onChange={(e) => setCallLogData({ ...callLogData, staff_name: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
                >
                  {staffList.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Discussion Remarks (વાતચીતની વિગત)
                </label>
                <textarea
                  rows={3}
                  value={callLogData.remarks}
                  onChange={(e) => setCallLogData({ ...callLogData, remarks: e.target.value })}
                  placeholder="વેપારીએ શું કહ્યું તે અહીં લખો..."
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsLogCallModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1b4332] hover:bg-[#2d6a4f] text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer active:scale-95"
                >
                  Save Call Log (સેવ કરો)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── CALL HISTORY MODAL ─────────────────────────────────────── */}
      {isHistoryModalOpen && selectedLeadForHistory && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-[#1b4332] text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History size={17} className="text-amber-300" />
                <h3 className="font-bold text-sm">
                  Call History: {selectedLeadForHistory.party_name}
                </h3>
              </div>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="p-1 rounded text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 flex-1 text-xs">
              {!selectedLeadForHistory.call_history || selectedLeadForHistory.call_history.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  No previous call records logged for this lead.
                </div>
              ) : (
                selectedLeadForHistory.call_history.map((call) => (
                  <div key={call.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                    <div className="flex items-center justify-between text-slate-500 text-[11px]">
                      <span>{new Date(call.call_date).toLocaleString()}</span>
                      <span className="font-bold text-slate-700">{call.staff_name || 'Staff'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{call.call_result}</span>
                      {call.rate_discussed && (
                        <span className="text-[11px] font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          Rate: {call.rate_discussed}
                        </span>
                      )}
                    </div>
                    {call.remarks && (
                      <p className="text-slate-700 text-xs mt-1 bg-white p-2 rounded border border-slate-200/60">
                        {call.remarks}
                      </p>
                    )}
                    {call.next_followup_date && (
                      <div className="text-[11px] text-amber-700 font-semibold pt-1">
                        Next Follow-up set to: {call.next_followup_date}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="px-4 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
