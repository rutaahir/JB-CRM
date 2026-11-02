import React from 'react';
import { Eye, Edit2, Trash2, Phone, Mail, ChevronLeft, ChevronRight } from 'lucide-react';
import { Seller, Buyer } from '@/types';
import { formatWhatsAppUrl } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

interface CompanyTableProps {
  data: (Seller | Buyer)[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onView: (item: Seller | Buyer) => void;
  onEdit: (item: Seller | Buyer) => void;
  onDelete: (item: Seller | Buyer) => void;
  isLoading?: boolean;
}

export const CompanyTable: React.FC<CompanyTableProps> = ({
  data,
  totalCount,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onView,
  onEdit,
  onDelete,
  isLoading = false,
}) => {
  const { isAdmin } = useAuth();
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const startItem = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalCount);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-subtle overflow-hidden">
      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-3.5 px-4 sm:px-6">Company Name</th>
              <th className="py-3.5 px-4">Address</th>
              <th className="py-3.5 px-4">Phone</th>
              <th className="py-3.5 px-4">WhatsApp</th>
              <th className="py-3.5 px-4">Email</th>
              <th className="py-3.5 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  <td className="py-4 px-6"><div className="h-4 bg-slate-200 rounded w-40" /></td>
                  <td className="py-4 px-4"><div className="h-4 bg-slate-200 rounded w-48" /></td>
                  <td className="py-4 px-4"><div className="h-4 bg-slate-200 rounded w-24" /></td>
                  <td className="py-4 px-4"><div className="h-4 bg-slate-200 rounded w-28" /></td>
                  <td className="py-4 px-4"><div className="h-4 bg-slate-200 rounded w-36" /></td>
                  <td className="py-4 px-4 text-center"><div className="h-6 bg-slate-200 rounded w-20 mx-auto" /></td>
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center">
                    <p className="text-base font-semibold text-slate-700">No records found</p>
                    <p className="text-xs text-slate-400 mt-1">Try adjusting your search query or add a new company.</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50/80 transition-colors group"
                >
                  {/* Company Name */}
                  <td className="py-3.5 px-4 sm:px-6 font-semibold text-slate-900 whitespace-nowrap">
                    {item.company_name}
                  </td>

                  {/* Address */}
                  <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate" title={item.address}>
                    {item.address}
                  </td>

                  {/* Phone */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <a
                      href={`tel:${item.phone}`}
                      className="text-slate-700 hover:text-forest-900 font-medium inline-flex items-center gap-1.5"
                    >
                      <Phone size={13} className="text-slate-400" />
                      <span>{item.phone}</span>
                    </a>
                  </td>

                  {/* WhatsApp Button matching screenshot */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <a
                      href={formatWhatsAppUrl(item.whatsapp)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 font-medium text-xs border border-emerald-200/60 transition-colors"
                      title="Open in WhatsApp"
                    >
                      {/* WhatsApp Icon */}
                      <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.301-.15-1.78-.878-2.056-.979-.276-.1-.476-.15-.676.15-.2.301-.776.979-.952 1.18-.176.2-.352.225-.653.075-.301-.15-1.272-.469-2.423-1.496-.897-.799-1.503-1.786-1.68-2.087-.176-.301-.019-.464.132-.614.136-.135.301-.352.451-.527.151-.176.2-.301.301-.502.1-.2.05-.376-.025-.527-.075-.15-.676-1.63-.926-2.234-.244-.588-.492-.508-.676-.517l-.576-.01c-.2 0-.526.075-.802.376-.276.301-1.053 1.028-1.053 2.508s1.078 2.909 1.229 3.109c.15.2 2.122 3.24 5.14 4.544.718.31 1.279.495 1.716.634.721.229 1.378.197 1.897.12.578-.087 1.78-.727 2.03-1.43.25-.702.25-1.304.175-1.43-.075-.126-.275-.201-.576-.351z"/>
                      </svg>
                      <span>{item.whatsapp}</span>
                    </a>
                  </td>

                  {/* Email */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <a
                      href={`mailto:${item.email}`}
                      className="text-slate-600 hover:text-forest-900 inline-flex items-center gap-1.5 truncate max-w-[200px]"
                      title={item.email}
                    >
                      <Mail size={13} className="text-slate-400 shrink-0" />
                      <span className="truncate">{item.email}</span>
                    </a>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      {/* View Eye */}
                      <button
                        onClick={() => onView(item)}
                        className="p-1.5 text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
                        title="View Details"
                      >
                        <Eye size={15} />
                      </button>

                      {/* Edit Pencil (Admin only) */}
                      {isAdmin && (
                        <button
                          onClick={() => onEdit(item)}
                          className="p-1.5 text-amber-700 bg-amber-50 hover:bg-amber-100 hover:text-amber-800 rounded-lg transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 size={14} />
                        </button>
                      )}

                      {/* Delete Trash (Admin only) */}
                      {isAdmin && (
                        <button
                          onClick={() => onDelete(item)}
                          className="p-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 hover:text-rose-700 rounded-lg transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer matching screenshot */}
      <div className="px-4 sm:px-6 py-3.5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <div>
          Showing <span className="font-semibold text-slate-700">{startItem}</span> to{' '}
          <span className="font-semibold text-slate-700">{endItem}</span> of{' '}
          <span className="font-semibold text-slate-700">{totalCount}</span> results
        </div>

        <div className="flex items-center gap-4">
          {/* Page size dropdown */}
          <div className="flex items-center gap-1.5">
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-forest-800"
            >
              <option value={5}>5 per page</option>
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
            </select>
          </div>

          {/* Page buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Previous Page"
            >
              <ChevronLeft size={14} />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))
              .map((page) => (
                <button
                  key={page}
                  onClick={() => onPageChange(page)}
                  className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${
                    page === currentPage
                      ? 'bg-forest-900 text-white'
                      : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {page}
                </button>
              ))}

            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Next Page"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

