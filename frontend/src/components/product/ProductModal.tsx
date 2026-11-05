import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/common/Modal';
import { Product, Seller } from '@/types';
import { toast } from 'sonner';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
  initialData?: Product | null;
  sellers: Seller[];
  isLoading?: boolean;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  sellers,
  isLoading = false,
}) => {
  const isEditing = !!initialData;
  const title = isEditing ? 'પ્રોડક્ટ સુધારો (Edit Product)' : 'નવી પ્રોડક્ટ ઉમેરો (Add Product)';

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [priceUnit, setPriceUnit] = useState('Per Quintal');
  const [packaging, setPackaging] = useState('50 kg Bag');
  const [sellerId, setSellerId] = useState<number | string>('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setDescription(initialData.description || '');
      setPrice(initialData.price !== null && initialData.price !== undefined ? String(initialData.price) : '');
      setPriceUnit(initialData.price_unit || 'Per Quintal');
      setPackaging(initialData.packaging || '50 kg Bag');
      setSellerId(initialData.seller || '');
      setIsActive(initialData.is_active);
    } else {
      setName('');
      setDescription('');
      setPrice('');
      setPriceUnit('Per Quintal');
      setPackaging('50 kg Bag');
      setSellerId('');
      setIsActive(true);
    }
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('પ્રોડક્ટનું નામ જરૂરી છે.');
      return;
    }

    const formData = new FormData();
    formData.append('name', name.trim());
    formData.append('description', description.trim());
    if (price) {
      formData.append('price', price);
    } else {
      formData.append('price', '');
    }
    formData.append('price_unit', priceUnit);
    formData.append('packaging', packaging);
    if (sellerId) {
      formData.append('seller', String(sellerId));
    } else {
      formData.append('seller', '');
    }
    formData.append('is_active', String(isActive));

    await onSubmit(formData);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle="જલારામ બ્રોકર્સ - કપાસ ખોળ, મકાઈ ખોળ, હોમિની ફીડ, પેલેટ વિગત"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Product Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            પ્રોડક્ટનું નામ (Product Name) <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="દા.ત. શ્રી વિજય કપાસ ખોળ / Kapas Khol"
            required
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-forest-800/20 focus:border-forest-700 transition-all font-semibold text-slate-900"
          />
        </div>

        {/* Price and Unit Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              ભાવ / દર (Price ₹) <span className="text-slate-400 font-normal lowercase">(ઓપ્શનલ)</span>
            </label>
            <input
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g. 2350"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-forest-800/20 focus:border-forest-700 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              ભાવ એકમ (Price Unit)
            </label>
            <select
              value={priceUnit}
              onChange={(e) => setPriceUnit(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-forest-800/20 focus:border-forest-700 transition-all"
            >
              <option value="Per Quintal">Per Quintal (ક્વિન્ટલ દીઠ)</option>
              <option value="Per Bag">Per Bag (ગુણી દીઠ)</option>
              <option value="Per 20 Kg">Per 20 Kg (મણ દીઠ)</option>
              <option value="Per Ton">Per Ton (ટન દીઠ)</option>
              <option value="Per Kg">Per Kg (કિલો દીઠ)</option>
            </select>
          </div>
        </div>

        {/* Packaging and Supplier Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              પેકિંગ વજન (Packaging)
            </label>
            <input
              type="text"
              value={packaging}
              onChange={(e) => setPackaging(e.target.value)}
              placeholder="e.g. 50 kg Bag, 60 kg Bag"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-forest-800/20 focus:border-forest-700 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              સેલર મિલ / સપ્લાયર (Mill / Supplier)
            </label>
            <select
              value={sellerId}
              onChange={(e) => setSellerId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-forest-800/20 focus:border-forest-700 transition-all"
            >
              <option value="">-- ઓપન / મલ્ટીપલ મિલ --</option>
              {sellers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.company_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            વિગત / નોંધ (Description)
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="પ્રોડક્ટની વિગત અથવા ક્વોલિટી સ્પષ્ટીકરણ..."
            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-forest-800/20 focus:border-forest-700 transition-all resize-none"
          />
        </div>

        {/* Status Toggle */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div>
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">સ્થિતિ (Status)</span>
            <p className="text-xs text-slate-500">ટ્રેડિંગ માટે ઉપલબ્ધ છે કે નહીં</p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-forest-800 relative"></div>
            <span className="text-xs font-semibold text-slate-800">
              {isActive ? 'Active (સક્રિય)' : 'Inactive (નિષ્ક્રિય)'}
            </span>
          </label>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2 text-sm font-semibold text-white bg-forest-900 hover:bg-forest-800 rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : isEditing ? (
              'સુધારો (Update)'
            ) : (
              'સાચવો (Save)'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
