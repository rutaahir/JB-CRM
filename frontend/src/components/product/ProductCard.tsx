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
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-subtle hover:shadow-card transition-all duration-200 overflow-hidden flex flex-col group">
      {/* Product Image Container */}
      <div className="relative aspect-[16/10] w-full bg-slate-100 overflow-hidden">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50">
            <Package size={36} className="text-slate-300 mb-1" />
            <span className="text-xs">No image uploaded</span>
          </div>
        )}

        {/* Action Bar on hover */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity bg-white/95 backdrop-blur-md p-1 rounded-xl shadow-md border border-slate-200/60">
          <button
            onClick={() => onView(product)}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="View Details"
          >
            <Eye size={14} />
          </button>
          {isAdmin && (
            <>
              <button
                onClick={() => onEdit(product)}
                className="p-1.5 text-amber-700 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                title="Edit Product"
              >
                <Edit2 size={13} />
              </button>
              <button
                onClick={() => onDelete(product)}
                className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                title="Delete Product"
              >
                <Trash2 size={13} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Product Name */}
          <h4 className="font-heading font-bold text-slate-900 text-sm line-clamp-1 group-hover:text-forest-900 transition-colors">
            {product.name}
          </h4>

          {/* Category */}
          <p className="text-xs text-slate-500 mt-0.5 truncate">
            {product.category_name || 'Uncategorized'}
            {product.brand && ` • ${product.brand}`}
          </p>

          {/* Price matching screenshot */}
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

        {/* Footer Badges matching screenshot */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          {/* Status Badge */}
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

          {/* Packaging Badge */}
          {product.packaging && (
            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium text-[11px]">
              {product.packaging}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

