import React from 'react';
import { Product } from '@/types';
import { formatDate } from '@/lib/utils';
import { Eye, Edit2, Trash2, Package, Power, Handshake } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Link } from 'react-router-dom';

interface ProductTableProps {
  products: Product[];
  onView: (p: Product) => void;
  onEdit: (p: Product) => void;
  onDelete: (p: Product) => void;
  onToggleStatus?: (p: Product) => void;
  isLoading?: boolean;
}

export const ProductTable: React.FC<ProductTableProps> = ({
  products,
  onView,
  onEdit,
  onDelete,
  onToggleStatus,
  isLoading = false,
}) => {
  const { isAdmin } = useAuth();

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-subtle overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              <th className="py-3 px-4 sm:px-6">કોમોડિટી પ્રોડક્ટ (Product Name)</th>
              <th className="py-3 px-4">સ્થિતિ (Trading Status)</th>
              <th className="py-3 px-4">સૌદા સંખ્યા (Deals Booked)</th>
              <th className="py-3 px-4">નોંધણી તારીખ (Added Date)</th>
              <th className="py-3 px-4 text-center">ક્રિયાઓ (Actions)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  <td colSpan={5} className="py-3.5 px-6">
                    <div className="h-5 bg-slate-200 rounded w-full" />
                  </td>
                </tr>
              ))
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400">
                  <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                    <Package size={24} />
                  </div>
                  <p className="text-sm font-bold text-slate-700">કોઈ પ્રોડક્ટ મળી નથી (No Products Found)</p>
                  <p className="text-xs text-slate-400 mt-1">ઉપર "નવી પ્રોડક્ટ ઉમેરો" પર ક્લિક કરી પ્રોડક્ટ ઉમેરો.</p>
                </td>
              </tr>
            ) : (
              products.map((p) => {
                const dealsCount = p.deals_count ?? 0;
                const hasDeals = dealsCount > 0;

                return (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Name */}
                    <td className="py-3 px-4 sm:px-6 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            p.is_active
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-slate-100 text-slate-400 border border-slate-200'
                          }`}
                        >
                          <Package size={17} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{p.name}</p>
                          <p className="text-[11px] text-slate-400 font-medium">ID: #{p.id}</p>
                        </div>
                      </div>
                    </td>

                    {/* Status with quick 1-click toggle */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                            p.is_active
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              p.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                            }`}
                          />
                          <span>{p.is_active ? 'Active (સક્રિય)' : 'Inactive (નિષ્ક્રિય)'}</span>
                        </span>

                        {isAdmin && onToggleStatus && (
                          <button
                            type="button"
                            onClick={() => onToggleStatus(p)}
                            title={p.is_active ? 'Mark Inactive' : 'Mark Active'}
                            className={`p-1 rounded-md text-xs border transition-colors cursor-pointer ${
                              p.is_active
                                ? 'text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100'
                                : 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                            }`}
                          >
                            <Power size={13} />
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Deals count */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {hasDeals ? (
                        <Link
                          to={`/deals?mode=register&search=${encodeURIComponent(p.name)}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0B3B24]/10 text-[#0B3B24] font-bold text-xs hover:bg-[#0B3B24]/20 transition-colors"
                          title="View associated deals in Sauda Register"
                        >
                          <Handshake size={13} />
                          <span>{dealsCount} Deals Booked</span>
                        </Link>
                      ) : (
                        <span className="text-slate-400 font-medium text-xs">No deals yet</span>
                      )}
                    </td>

                    {/* Created Date */}
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap font-medium text-xs">
                      {formatDate(p.created_at)}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => onView(p)}
                          className="p-1.5 text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
                          title="View Details"
                        >
                          <Eye size={14} />
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => onEdit(p)}
                              className="p-1.5 text-amber-700 bg-amber-50 hover:bg-amber-100 hover:text-amber-800 rounded-lg transition-colors cursor-pointer"
                              title="Edit Commodity Name / Status"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => onDelete(p)}
                              disabled={hasDeals}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                hasDeals
                                  ? 'text-slate-300 bg-slate-50 cursor-not-allowed'
                                  : 'text-rose-600 bg-rose-50 hover:bg-rose-100 hover:text-rose-700'
                              }`}
                              title={
                                hasDeals
                                  ? `Cannot delete: ${dealsCount} deal(s) exist. Deactivate instead.`
                                  : 'Delete Commodity'
                              }
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
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
  );
};
