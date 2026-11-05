import React from 'react';
import { Modal } from '@/components/common/Modal';
import { Product } from '@/types';
import { formatPrice, formatDate } from '@/lib/utils';
import { Package, Building, Layers } from 'lucide-react';

interface ProductViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

export const ProductViewModal: React.FC<ProductViewModalProps> = ({
  isOpen,
  onClose,
  product,
}) => {
  if (!product) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={product.name}
      subtitle="પ્રોડક્ટ વિગત (Product Details)"
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Pricing & Status Highlight */}
        <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 uppercase font-semibold">Trading Rate</p>
            <p className="text-xl font-heading font-extrabold text-forest-900 mt-0.5">
              {formatPrice(product.price, product.price_unit)}
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${
              product.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
            }`}
          >
            {product.is_active ? 'Active for Trading' : 'Inactive'}
          </span>
        </div>

        {/* Specifications Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
            <Layers size={18} className="text-slate-400 shrink-0" />
            <div>
              <p className="text-xs text-slate-400 uppercase font-semibold">Packaging</p>
              <p className="font-semibold text-slate-800">{product.packaging || 'Standard 50 kg'}</p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
            <Building size={18} className="text-slate-400 shrink-0" />
            <div>
              <p className="text-xs text-slate-400 uppercase font-semibold">Mill / Supplier</p>
              <p className="font-semibold text-slate-800 truncate max-w-[140px]">
                {product.seller_name || 'Open / Multi'}
              </p>
            </div>
          </div>
        </div>

        {/* Description */}
        {product.description && (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm">
            <p className="text-xs text-slate-400 uppercase font-semibold mb-1">Description / વિગત</p>
            <p className="text-slate-700 leading-relaxed">{product.description}</p>
          </div>
        )}

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <span>Added: {formatDate(product.created_at)}</span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};
