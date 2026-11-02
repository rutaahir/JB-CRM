import React from 'react';
import { Modal } from '@/components/common/Modal';
import { Seller, Buyer } from '@/types';
import { formatDate, formatWhatsAppUrl } from '@/lib/utils';
import { Phone, Mail, MessageSquare, MapPin, Calendar, Building } from 'lucide-react';

interface CompanyViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: Seller | Buyer | null;
  type: 'seller' | 'buyer';
}

export const CompanyViewModal: React.FC<CompanyViewModalProps> = ({
  isOpen,
  onClose,
  company,
  type,
}) => {
  if (!company) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={company.company_name}
      subtitle={`${type === 'seller' ? 'Seller' : 'Buyer'} Company Details`}
      maxWidth="md"
    >
      <div className="space-y-5">
        <div className="flex items-center gap-3 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
          <div className="w-12 h-12 rounded-xl bg-forest-900 text-amber-400 flex items-center justify-center font-bold text-lg">
            <Building size={22} />
          </div>
          <div>
            <h4 className="font-heading font-bold text-slate-900 text-base">{company.company_name}</h4>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wider">
              {type}
            </span>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <MapPin size={18} className="text-slate-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-slate-400 uppercase font-semibold">Address</p>
              <p className="text-slate-800 font-medium mt-0.5">{company.address}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <Phone size={18} className="text-slate-400 shrink-0" />
              <div>
                <p className="text-xs text-slate-400 uppercase font-semibold">Phone</p>
                <a
                  href={`tel:${company.phone}`}
                  className="text-forest-900 font-semibold hover:underline"
                >
                  +91 {company.phone}
                </a>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <MessageSquare size={18} className="text-emerald-600 shrink-0" />
              <div>
                <p className="text-xs text-slate-400 uppercase font-semibold">WhatsApp</p>
                <a
                  href={formatWhatsAppUrl(company.whatsapp)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-700 font-semibold hover:underline flex items-center gap-1"
                >
                  <span>+91 {company.whatsapp}</span>
                </a>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <Mail size={18} className="text-slate-400 shrink-0" />
            <div>
              <p className="text-xs text-slate-400 uppercase font-semibold">Email</p>
              <a
                href={`mailto:${company.email}`}
                className="text-forest-900 font-medium hover:underline"
              >
                {company.email}
              </a>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <Calendar size={18} className="text-slate-400 shrink-0" />
            <div>
              <p className="text-xs text-slate-400 uppercase font-semibold">Registered On</p>
              <p className="text-slate-700 font-medium">{formatDate(company.created_at)}</p>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

