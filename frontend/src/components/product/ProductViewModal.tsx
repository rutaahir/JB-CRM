import React from 'react';
import { Modal } from '@/components/common/Modal';
import { Product } from '@/types';
import { formatDate } from '@/lib/utils';
import { Package, Handshake, Calendar, Tag, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ProductViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onEdit?: (p: Product) => void;
}

export const ProductViewModal: React.FC<ProductViewModalProps> = ({
  isOpen,
  onClose,
  product,
  onEdit,
}) => {
  if (!product) return null;
  const dealsCount = product.deals_count ?? 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={product.name}
      subtitle="કોમોડિટી પ્રોડક્ટ વિગત (Product Details)"
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Status Highlight */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                product.is_active
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              <Package size={24} />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase font-semibold">Commodity Item</p>
              <p className="text-base font-heading font-bold text-slate-900 mt-0.5">
                {product.name}
              </p>
            </div>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold ${
              product.is_active
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                : 'bg-slate-200 text-slate-700'
            }`}
          >
            {product.is_active ? 'Active for Trading' : 'Inactive'}
          </span>
        </div>

        {/* Specifications Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
            <Handshake size={18} className="text-emerald-700 shrink-0" />
            <div>
              <p className="text-xs text-slate-400 uppercase font-semibold">Deals Recorded</p>
              <p className="font-bold text-slate-900">{dealsCount} Deals</p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
            <Tag size={18} className="text-slate-400 shrink-0" />
            <div>
              <p className="text-xs text-slate-400 uppercase font-semibold">Product ID</p>
              <p className="font-bold text-slate-900">#{product.id}</p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3 col-span-2">
            <Calendar size={18} className="text-slate-400 shrink-0" />
            <div>
              <p className="text-xs text-slate-400 uppercase font-semibold">Added On</p>
              <p className="font-semibold text-slate-800">{formatDate(product.created_at)}</p>
            </div>
          </div>
        </div>

        {dealsCount > 0 && (
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-emerald-900 font-medium">
              <ShieldCheck size={16} className="text-emerald-700" />
              <span>This product is actively traded in historical records.</span>
            </div>
            <Link
              to={`/deals?mode=register&search=${encodeURIComponent(product.name)}`}
              onClick={onClose}
              className="text-emerald-800 font-bold hover:underline"
            >
              View in Register →
            </Link>
          </div>
        )}

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Close (બંધ કરો)
          </button>
          {onEdit && (
            <button
              onClick={() => {
                onClose();
                onEdit(product);
              }}
              className="px-4 py-2 text-xs font-bold text-white bg-[#0B3B24] hover:bg-[#124b30] rounded-xl transition-colors cursor-pointer"
            >
              Edit Product (સુધારો)
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};
