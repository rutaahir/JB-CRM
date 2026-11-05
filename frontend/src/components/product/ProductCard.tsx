import React from 'react';
import { Product } from '@/types';
import { formatPrice } from '@/lib/utils';
import { Eye, Edit2, Trash2, Package } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface ProductCardProps {
  product: Product;
  onView: (p: Product) => void;
  onEdit: (p: Product) => void;
  onDelete: (p: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onView,
  onEdit,
  onDelete,
}) => {
  const { isAdmin } = useAuth();

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-subtle hover:shadow-card transition-all duration-200 p-4 flex flex-col justify-between group">
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="w-10 h-10 rounded-xl bg-forest-50 text-forest-800 flex items-center justify-center shrink-0">
            <Package size={20} />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onView(product)}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="View Details"
            >
              <Eye size={15} />
            </button>
            {isAdmin && (
              <>
                <button
                  onClick={() => onEdit(product)}
                  className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                  title="Edit Product"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => onDelete(product)}
                  className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  title="Delete Product"
                >
                  <Trash2 size={14} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Product Name */}
        <h4 className="font-heading font-bold text-slate-900 text-sm line-clamp-1 group-hover:text-forest-900 transition-colors">
          {product.name}
        </h4>

        {/* Supplier / Packaging */}
        <p className="text-xs text-slate-500 mt-1 truncate">
          {product.seller_name ? `મિલ: ${product.seller_name}` : 'ઓપન સપ્લાય'}
        </p>

        {/* Price */}
        <div className="mt-3">
          <span
            className={`font-heading font-bold text-sm ${
              product.price ? 'text-emerald-700' : 'text-amber-600'
            }`}
          >
            {formatPrice(product.price, product.price_unit)}
          </span>
        </div>
      </div>

      {/* Footer Badges */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-semibold ${
            product.is_active
              ? 'bg-emerald-50 text-emerald-700'
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

        {product.packaging && (
          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium text-[11px]">
            {product.packaging}
          </span>
        )}
      </div>
    </div>
  );
};
