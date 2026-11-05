import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Users2,
  Search,
  Plus,
  FileSpreadsheet,
  Phone,
  MessageCircle,
  MapPin,
  ExternalLink,
  ShieldCheck,
  Building2,
  Filter,
} from 'lucide-react';
import { contactsApi } from '@/api/contacts';
import { Contact, PartyType } from '@/types';
import { formatWhatsAppUrl } from '@/lib/utils';
import { toast } from 'sonner';

export const ContactViewPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [partyTypeFilter, setPartyTypeFilter] = useState<'ALL' | PartyType>('ALL');

  const { data: contactsData, isLoading, refetch } = useQuery({
    queryKey: ['contacts-view', searchTerm, partyTypeFilter],
    queryFn: () =>
      contactsApi.getContacts({
        search: searchTerm || undefined,
        party_type: partyTypeFilter !== 'ALL' ? partyTypeFilter : undefined,
        page_size: 1000,
      }),
  });

  const contacts = contactsData?.results || [];

  // Export to Excel / CSV
  const handleExportExcel = () => {
    if (!contacts.length) {
      toast.error('No contacts to export.');
      return;
    }

    const headers = [
      'Code',
      'Date',
      'Name',
      'Party Type',
      'Contact Person 1',
      'Mobile 1',
      'Mobile 2',
      'Phone Office',
      'City',
      'Area',
      'Address',
      'GST No',
      'PAN No',
      'Email',
    ];

    const rows = contacts.map((c) => [
      `"${c.code}"`,
      `"${c.date || ''}"`,
      `"${(c.name || '').replace(/"/g, '""')}"`,
      `"${c.party_type === 'COMPANY_MILL' ? 'Company-Mill' : 'Buyer'}"`,
      `"${(c.contact_person_1 || '').replace(/"/g, '""')}"`,
      `"${c.mobile_1 || ''}"`,
      `"${c.mobile_2 || ''}"`,
      `"${c.phone_office_1 || ''}"`,
      `"${(c.city || '').replace(/"/g, '""')}"`,
      `"${(c.area || '').replace(/"/g, '""')}"`,
      `"${(c.address || '').replace(/"/g, '""')}"`,
      `"${c.gst_no || ''}"`,
      `"${c.pan_no || ''}"`,
      `"${c.email || ''}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Contact_Master_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Contacts exported to Excel (UTF-8 BOM) successfully!');
  };

  const handleWhatsApp = (contact: Contact) => {
    if (contact.is_placeholder_mobile || !contact.mobile_1) {
      toast.error('Cannot send WhatsApp: Mobile number is a placeholder or missing.');
      return;
    }
    const url = formatWhatsAppUrl(
      contact.mobile_1,
      `Namaste ${contact.name}, greetings from Jalaram Brokers.`
    );
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#1b4332] text-amber-300 rounded-xl shadow-xs">
              <Users2 size={22} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold font-heading text-slate-900 tracking-tight">
                Contact View
              </h1>
              <p className="text-xs text-slate-500">
                Contact Master Register • Searchable directory of Buyers & Mills (One Party ID)
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-300"
            title="Download full contacts list as Excel/CSV"
          >
            <FileSpreadsheet size={15} className="text-emerald-700" />
            <span>Export to Excel</span>
          </button>

          <button
            onClick={() => navigate('/contacts/master')}
            className="px-4 py-2 bg-[#1b4332] hover:bg-[#2d6a4f] text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            title="Open Contact Master to add a new contact (F2)"
          >
            <Plus size={15} className="text-amber-300" />
            <span>New Contact (F2)</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
        <div className="relative w-full sm:w-96">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Code, Name, Mobile, City..."
            className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1b4332] focus:bg-white"
          />
        </div>

        {/* Type Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 w-full sm:w-auto">
          <button
            onClick={() => setPartyTypeFilter('ALL')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              partyTypeFilter === 'ALL'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({contactsData?.count || contacts.length})
          </button>
          <button
            onClick={() => setPartyTypeFilter('BUYER')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              partyTypeFilter === 'BUYER'
                ? 'bg-[#1b4332] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Buyers / પાર્ટી
          </button>
          <button
            onClick={() => setPartyTypeFilter('COMPANY_MILL')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              partyTypeFilter === 'COMPANY_MILL'
                ? 'bg-[#1b4332] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Company-Mill / ઓઈલ મિલ
          </button>
        </div>
      </div>

      {/* Contacts Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/90 text-slate-700 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200">
                <th className="py-2.5 px-3.5 w-20">Code</th>
                <th className="py-2.5 px-3.5">Name</th>
                <th className="py-2.5 px-3">Party Type</th>
                <th className="py-2.5 px-3">Contact Person</th>
                <th className="py-2.5 px-3.5">Mobile No 1</th>
                <th className="py-2.5 px-3">City / Area</th>
                <th className="py-2.5 px-3">GST No</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    Loading contacts...
                  </td>
                </tr>
              ) : contacts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No contacts found. Click <strong>+ New Contact</strong> to add one.
                  </td>
                </tr>
              ) : (
                contacts.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-amber-50/50 transition-colors group"
                  >
                    <td className="py-2.5 px-3.5 font-mono font-bold text-slate-800">
                      <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-700">
                        {c.code}
                      </span>
                    </td>

                    <td className="py-2.5 px-3.5 font-semibold text-slate-900">
                      <button
                        onClick={() => navigate(`/contacts/master?id=${c.id}`)}
                        className="text-left hover:text-[#1b4332] hover:underline cursor-pointer flex items-center gap-1.5"
                        title="Click to open in Contact Master"
                      >
                        <span>{c.name}</span>
                        <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 text-slate-400" />
                      </button>
                    </td>

                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${
                          c.party_type === 'COMPANY_MILL'
                            ? 'bg-purple-100 text-purple-700 border border-purple-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {c.party_type === 'COMPANY_MILL' ? 'Company-Mill' : 'Buyer'}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-slate-600">
                      {c.contact_person_1 || '-'}
                    </td>

                    <td className="py-2.5 px-3.5 font-mono text-slate-700">
                      {c.is_placeholder_mobile ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400 line-through text-xs">{c.mobile_1}</span>
                          <span className="px-1.5 py-0.5 text-[10px] bg-amber-100 text-amber-800 rounded font-semibold whitespace-nowrap">
                            Mobile missing
                          </span>
                        </div>
                      ) : c.mobile_1 ? (
                        <div className="flex items-center gap-1.5">
                          <span>{c.mobile_1}</span>
                          <button
                            onClick={() => handleWhatsApp(c)}
                            className="text-emerald-600 hover:text-emerald-700 p-0.5 rounded cursor-pointer"
                            title="Chat on WhatsApp"
                          >
                            <MessageCircle size={13} />
                          </button>
                        </div>
                      ) : (
                        <span className="px-1.5 py-0.5 text-[10px] bg-rose-100 text-rose-700 rounded font-semibold whitespace-nowrap">
                          Mobile missing
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-slate-600">
                      {c.city ? (
                        <span className="flex items-center gap-1">
                          <MapPin size={11} className="text-slate-400" />
                          {c.city}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>

                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                      {c.gst_no || '-'}
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => navigate(`/contacts/master?id=${c.id}`)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-[#1b4332] hover:text-white text-slate-700 rounded text-[11px] font-semibold transition-all cursor-pointer"
                        title="Edit in Contact Master"
                      >
                        Edit
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
  );
};
