import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '@/components/common/Modal';
import { Product } from '@/types';
import { toast } from 'sonner';
import { Sparkles, Check, Package } from 'lucide-react';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; is_active: boolean }) => Promise<void>;
  initialData?: Product | null;
  isLoading?: boolean;
}

const COMMON_COMMODITIES = [
  'કપાસ ખોળ (Kapas Khol)',
  'મકાઈ ખોળ (Makai Khol)',
  'હોમિની ફીડ (Hominy Feed)',
  'પેલેટ 10mm (Pellet 10mm)',
  'પેલેટ 8mm (Pellet 8mm)',
  'મિક્સ કેટલફીડ (Mix Cattle Feed)',
  'ઘઉંનું ભુસુ (Wheat Bran)',
  'સોયા ડી.ઓ.સી. (Soyabean DOC)',
  'રાયડા ખોળ (Mustard DOC)',
  'બિનોલા (Cottonseed)',
];

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isLoading = false,
}) => {
  const isEditing = !!initialData;
  const title = isEditing ? 'પ્રોડક્ટ સુધારો (Edit Commodity)' : 'નવી પ્રોડક્ટ ઉમેરો (Add Commodity)';
  const inputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setIsActive(initialData.is_active);
    } else {
      setName('');
      setIsActive(true);
    }
  }, [initialData, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('પ્રોડક્ટનું નામ દાખલ કરો (Please enter product name).');
      return;
    }

    await onSubmit({
      name: trimmed,
      is_active: isActive,
    });
  };

  const handleSelectSuggestion = (suggested: string) => {
    setName(suggested);
    inputRef.current?.focus();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle="જલારામ બ્રોકર્સ - કેટલ ફીડ અને ઓઇલ કેક પ્રોડક્ટ માસ્ટર"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Commodity / Product Name */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            પ્રોડક્ટનું નામ (Commodity / Item Name) <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="દા.ત. શ્રી વિજય કપાસ ખોળ / Kapas Khol"
              required
              disabled={isLoading}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-[#0B3B24]/20 focus:border-[#0B3B24] transition-all"
            />
          </div>
          <p className="text-[11px] text-slate-500">
            સૌદા એન્ટ્રી (F6), પેન્ડિંગ ઓર્ડર અને ટાર્ગેટમાં આ નામ દેખાશે.
          </p>
        </div>

        {/* Quick Suggestion Chips */}
        {!isEditing && (
          <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
              <Sparkles size={14} className="text-emerald-700" />
              <span>વારંવાર વપરાતી કોમોડિટીઝ (Quick Suggestions):</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_COMMODITIES.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => handleSelectSuggestion(item)}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg bg-white border border-emerald-200 text-emerald-900 hover:bg-emerald-100 hover:border-emerald-300 transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                >
                  <span>{item}</span>
                  {name === item && <Check size={12} className="text-emerald-700" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Status Toggle */}
        <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
          <div>
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              સ્થિતિ (Trading Status)
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">
              સક્રિય હોય ત્યારે જ સૌદા નોંધણી (Sauda Entry F6) માં દેખાશે.
            </p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="sr-only peer"
              disabled={isLoading}
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0B3B24] relative shadow-inner" />
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded ${
                isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
              }`}
            >
              {isActive ? 'Active (સક્રિય)' : 'Inactive (નિષ્ક્રિય)'}
            </span>
          </label>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
          >
            રદ કરો (Cancel)
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-5 py-2 text-xs font-bold text-white bg-[#0B3B24] hover:bg-[#124b30] rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            {isLoading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>સાચવી રહ્યું છે...</span>
              </>
            ) : (
              <>
                <Package size={14} />
                <span>{isEditing ? 'સુધારો (Update Product)' : 'સાચવો (Save Product)'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
