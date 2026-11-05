import React, { useState, useEffect, useRef } from 'react';
import { Search, X, User, Phone, MapPin, Building2, ArrowRight } from 'lucide-react';
import { Contact } from '@/types';
import { contactsApi } from '@/api/contacts';

interface FindContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (contactId: number) => void;
}

export const FindContactModal: React.FC<FindContactModalProps> = ({
  isOpen,
  onClose,
  onSelect,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setResults([]);
      setTimeout(() => inputRef.current?.focus(), 100);
      loadInitial();
    }
  }, [isOpen]);

  const loadInitial = async () => {
    try {
      setLoading(true);
      const res = await contactsApi.getContacts({ page_size: 20 });
      setResults(res.results);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (val: string) => {
    setSearchTerm(val);
    try {
      setLoading(true);
      const res = await contactsApi.getContacts({ search: val, page_size: 20 });
      setResults(res.results);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-[#1e4a36] text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search size={18} className="text-amber-300" />
            <h3 className="font-bold text-sm tracking-wide">Find Contact (F3) / પાર્ટી શોધો</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search input */}
        <div className="p-4 bg-slate-100 border-b border-slate-200">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Type Name, Code, Mobile No, or City..."
              className="w-full pl-10 pr-4 py-2 bg-white text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4a36] shadow-inner"
            />
          </div>
          <div className="text-[11px] text-slate-500 mt-1.5 flex justify-between">
            <span>Press Esc to close • Click any contact to jump directly into Contact Master</span>
            <span>{results.length} found</span>
          </div>
        </div>

        {/* Results list */}
        <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500">Searching contacts...</div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">No contacts matching search.</div>
          ) : (
            results.map((c) => (
              <div
                key={c.id}
                onClick={() => {
                  onSelect(c.id);
                  onClose();
                }}
                className="p-3 hover:bg-amber-50/70 transition-colors cursor-pointer flex items-center justify-between group"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 bg-slate-200 text-slate-800 rounded">
                      {c.code}
                    </span>
                    <span className="font-semibold text-slate-900 text-sm">{c.name}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        c.party_type === 'COMPANY_MILL'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {c.party_type === 'COMPANY_MILL' ? 'Company-Mill' : 'Buyer'}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-600 pt-1">
                    {c.mobile_1 && (
                      <span className="flex items-center gap-1">
                        <Phone size={12} className="text-slate-400" />
                        {c.mobile_1}
                      </span>
                    )}
                    {c.city && (
                      <span className="flex items-center gap-1">
                        <MapPin size={12} className="text-slate-400" />
                        {c.city}
                      </span>
                    )}
                    {c.contact_person_1 && (
                      <span className="flex items-center gap-1 text-slate-500">
                        <User size={12} className="text-slate-400" />
                        {c.contact_person_1}
                      </span>
                    )}
                  </div>
                </div>

                <div className="opacity-0 group-hover:opacity-100 transition-opacity pr-2 text-slate-400 group-hover:text-[#1e4a36]">
                  <ArrowRight size={18} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
