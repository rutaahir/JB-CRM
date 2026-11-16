import React from 'react';
import { Product } from '@/types';
import { formatDate } from '@/lib/utils';
import { Eye, Edit2, Trash2, Package, Handshake, Power } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Link } from 'react-router-dom';

interface ProductCardProps {
  product: Product;
  onView: (p: Product) => void;
  onEdit: (p: Product) => void;
  onDelete: (p: Product) => void;
  onToggleStatus?: (p: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onView,
  onEdit,
  onDelete,
  onToggleStatus,
}) => {
  const { isAdmin } = useAuth();
  const dealsCount = product.deals_count ?? 0;
  const hasDeals = dealsCount > 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-subtle hover:shadow-card transition-all duration-200 p-4 flex flex-col justify-between group">
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              product.is_active
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-slate-100 text-slate-400 border border-slate-200'
            }`}
          >
            <Package size={20} />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onView(product)}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="View Details"
            >
              <Eye size={14} />
            </button>
            {isAdmin && (
              <>
                <button
                  onClick={() => onEdit(product)}
                  className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                  title="Edit Product"
                >
                  <Edit2 size={13} />
                </button>
                <button
                  onClick={() => onDelete(product)}
                  disabled={hasDeals}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    hasDeals
                      ? 'text-slate-300 bg-slate-50 cursor-not-allowed'
                      : 'text-rose-500 hover:text-rose-700 hover:bg-rose-50'
                  }`}
                  title={
                    hasDeals
                      ? `Cannot delete: ${dealsCount} deal(s) exist. Deactivate instead.`
                      : 'Delete Product'
                  }
                >
                  <Trash2 size={13} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Product Name */}
        <h4 className="font-heading font-bold text-slate-900 text-sm line-clamp-2 group-hover:text-forest-900 transition-colors">
          {product.name}
        </h4>

        {/* Deals Count */}
        <div className="mt-2.5">
          {hasDeals ? (
            <Link
              to={`/deals?mode=register&search=${encodeURIComponent(product.name)}`}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#0B3B24]/10 text-[#0B3B24] font-bold text-[11px] hover:bg-[#0B3B24]/20 transition-colors"
            >
              <Handshake size={12} />
              <span>{dealsCount} Deals Booked</span>
            </Link>
          ) : (
            <span className="text-[11px] text-slate-400 font-medium">No deals yet</span>
          )}
        </div>
      </div>

      {/* Footer Badges */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
            product.is_active
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-slate-100 text-slate-500'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              product.is_active ? 'bg-emerald-500' : 'bg-slate-400'
            }`}
          />
          <span>{product.is_active ? 'Active' : 'Inactive'}</span>
        </span>

        {isAdmin && onToggleStatus && (
          <button
            type="button"
            onClick={() => onToggleStatus(product)}
            title={product.is_active ? 'Deactivate' : 'Activate'}
            className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
          >
            <Power size={11} />
            <span>{product.is_active ? 'Disable' : 'Enable'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
