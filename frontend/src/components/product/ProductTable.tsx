import React from 'react';
import { Product } from '@/types';
import { formatPrice } from '@/lib/utils';
import { Eye, Edit2, Trash2, Package } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface ProductTableProps {
  products: Product[];
  onView: (p: Product) => void;
  onEdit: (p: Product) => void;
  onDelete: (p: Product) => void;
  isLoading?: boolean;
}

export const ProductTable: React.FC<ProductTableProps> = ({
  products,
  onView,
  onEdit,
  onDelete,
  isLoading = false,
}) => {
  const { isAdmin } = useAuth();

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-subtle overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-3.5 px-4 sm:px-6">Product Name</th>
              <th className="py-3.5 px-4">Price / Rate</th>
              <th className="py-3.5 px-4">Packaging</th>
              <th className="py-3.5 px-4">Mill / Supplier</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  <td colSpan={6} className="py-4 px-6">
                    <div className="h-5 bg-slate-200 rounded w-full" />
                  </td>
                </tr>
              ))
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  <p className="text-base font-semibold text-slate-700">કોઈ પ્રોડક્ટ મળી નથી</p>
                  <p className="text-xs text-slate-400 mt-1">ઉપર "Add Product" પર ક્લિક કરી નવી પ્રોડક્ટ ઉમેરો.</p>
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 sm:px-6 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-forest-50 text-forest-800 flex items-center justify-center shrink-0">
                        <Package size={17} />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{p.name}</p>
                        {p.description && (
                          <p className="text-xs text-slate-400 truncate max-w-[250px]">{p.description}</p>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-4 font-semibold text-forest-900 whitespace-nowrap">
                    {formatPrice(p.price, p.price_unit)}
                  </td>

                  <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{p.packaging || '50 kg Bag'}</td>

                  <td className="py-3 px-4 text-slate-600 whitespace-nowrap truncate max-w-[180px]">
                    {p.seller_name || 'ઓપન / મલ્ટી'}
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        p.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${p.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      <span>{p.is_active ? 'Active' : 'Inactive'}</span>
                    </span>
                  </td>

                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        onClick={() => onView(p)}
                        className="p-1.5 text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
                        title="View Details"
                      >
                        <Eye size={15} />
                      </button>
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => onEdit(p)}
                            className="p-1.5 text-amber-700 bg-amber-50 hover:bg-amber-100 hover:text-amber-800 rounded-lg transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => onDelete(p)}
                            className="p-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 hover:text-rose-700 rounded-lg transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
