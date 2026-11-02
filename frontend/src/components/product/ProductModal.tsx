import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '@/components/common/Modal';
import { Product, Category, Seller } from '@/types';
import { Upload, X, Plus } from 'lucide-react';
import { apiClient } from '@/api/client';
import { toast } from 'sonner';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
  initialData?: Product | null;
  categories: Category[];
  sellers: Seller[];
  onCategoryCreated?: (cat: Category) => void;
  isLoading?: boolean;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  categories,
  sellers,
  onCategoryCreated,
  isLoading = false,
}) => {
  const isEditing = !!initialData;
  const title = isEditing ? 'Edit Product' : 'Add Product';

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<number | string>('');
  const [brand, setBrand] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [priceUnit, setPriceUnit] = useState('Per Quintal');
  const [packaging, setPackaging] = useState('50 kg Bag');
  const [proteinPercent, setProteinPercent] = useState('');
  const [sellerId, setSellerId] = useState<number | string>('');
  const [isActive, setIsActive] = useState(true);

  // Image upload
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New category creation inline
  const [showNewCatInput, setShowNewCatInput] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [creatingCat, setCreatingCat] = useState(false);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setCategoryId(initialData.category);
      setBrand(initialData.brand || '');
      setDescription(initialData.description || '');
      setPrice(initialData.price !== null && initialData.price !== undefined ? String(initialData.price) : '');
      setPriceUnit(initialData.price_unit || 'Per Quintal');
      setPackaging(initialData.packaging || '50 kg Bag');
      setProteinPercent(initialData.protein_percent !== null && initialData.protein_percent !== undefined ? String(initialData.protein_percent) : '');
      setSellerId(initialData.seller || '');
      setIsActive(initialData.is_active);
      setImagePreview(initialData.image);
      setImageFile(null);
    } else {
      setName('');
      setCategoryId(categories.length > 0 ? categories[0].id : '');
      setBrand('');
      setDescription('');
      setPrice('');
      setPriceUnit('Per Quintal');
      setPackaging('50 kg Bag');
      setProteinPercent('');
      setSellerId('');
      setIsActive(true);
      setImagePreview(null);
      setImageFile(null);
    }
  }, [initialData, categories, isOpen]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image size must be under 2MB.');
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    setCreatingCat(true);
    try {
      const res = await apiClient.post<Category>('/categories/', { name: newCatName.trim() });
      toast.success(`Category "${res.data.name}" added!`);
      if (onCategoryCreated) {
        onCategoryCreated(res.data);
      }
      setCategoryId(res.data.id);
      setNewCatName('');
      setShowNewCatInput(false);
    } catch (err: any) {
      toast.error(err.response?.data?.name?.[0] || 'Failed to create category');
    } finally {
      setCreatingCat(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Product name is required.');
      return;
    }
    if (!categoryId) {
      toast.error('Category is required.');
      return;
    }

    const formData = new FormData();
    formData.append('name', name.trim());
    formData.append('category', String(categoryId));
    formData.append('brand', brand.trim());
    formData.append('description', description.trim());
    if (price) {
      formData.append('price', price);
    } else {
      formData.append('price', '');
    }
    formData.append('price_unit', priceUnit);
    formData.append('packaging', packaging);
    if (proteinPercent) {
      formData.append('protein_percent', proteinPercent);
    } else {
      formData.append('protein_percent', '');
    }
    if (sellerId) {
      formData.append('seller', String(sellerId));
    } else {
      formData.append('seller', '');
    }
    formData.append('is_active', String(isActive));

    if (imageFile) {
      formData.append('image', imageFile);
    }

    await onSubmit(formData);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle="Fill in product specifications and pricing"
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left Column: Image Upload Area (matches screenshot) */}
          <div className="md:col-span-5 flex flex-col">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Product Image
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-forest-700 rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer bg-slate-50 hover:bg-emerald-50/20 transition-all aspect-[4/3] relative overflow-hidden"
            >
              {imagePreview ? (
                <>
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover rounded-xl"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-2">
                    <span>Click to change</span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center p-3 text-slate-500">
                  <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-forest-800 mb-3 border border-slate-200">
                    <Upload size={20} />
                  </div>
                  <p className="text-sm font-semibold text-slate-800">Upload Image</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-[200px] leading-relaxed">
                    Click to upload or drag and drop JPG, PNG, WEBP (Max 2MB)
                  </p>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageChange}
              className="hidden"
            />

            {imagePreview && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setImagePreview(null);
                  setImageFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="mt-2 text-xs text-rose-600 hover:text-rose-700 flex items-center justify-center gap-1"
              >
                <X size={14} />
                <span>Remove uploaded image</span>
              </button>
            )}
          </div>

          {/* Right Column: Form Inputs (2-column layout matching screenshot) */}
          <div className="md:col-span-7 space-y-4">
            {/* Product Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Product Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Shree Vijay Kapas Khol"
                required
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-forest-800/20 focus:border-forest-700 transition-all font-medium"
              />
            </div>

            {/* Price and Unit Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Price (₹) <span className="text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="2350 (or leave blank)"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-forest-800/20 focus:border-forest-700 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Price Unit
                </label>
                <select
                  value={priceUnit}
                  onChange={(e) => setPriceUnit(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-forest-800/20 focus:border-forest-700 transition-all"
                >
                  <option value="Per Quintal">Per Quintal</option>
                  <option value="Per Ton">Per Ton</option>
                  <option value="Per Bag">Per Bag</option>
                  <option value="Per Kg">Per Kg</option>
                </select>
              </div>
            </div>

            {/* Category and Packaging Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowNewCatInput(!showNewCatInput)}
                    className="text-[11px] text-forest-800 hover:underline flex items-center gap-0.5 font-medium"
                  >
                    <Plus size={12} />
                    <span>New</span>
                  </button>
                </div>

                {showNewCatInput ? (
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      placeholder="Category name"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleCreateCategory}
                      disabled={creatingCat}
                      className="px-2 py-1 bg-forest-900 text-white rounded-lg text-xs font-semibold shrink-0"
                    >
                      {creatingCat ? '...' : 'Add'}
                    </button>
                  </div>
                ) : (
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-forest-800/20 focus:border-forest-700 transition-all"
                  >
                    <option value="" disabled>Select category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Packaging / Bag Weight
                </label>
                <input
                  type="text"
                  value={packaging}
                  onChange={(e) => setPackaging(e.target.value)}
                  placeholder="e.g. 50 kg Bag"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-forest-800/20 focus:border-forest-700 transition-all"
                />
              </div>
            </div>

            {/* Brand and Protein Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Brand Name
                </label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="e.g. Shree Vijay"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-forest-800/20 focus:border-forest-700 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Protein % <span className="text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={proteinPercent}
                  onChange={(e) => setProteinPercent(e.target.value)}
                  placeholder="e.g. 38"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-forest-800/20 focus:border-forest-700 transition-all"
                />
              </div>
            </div>

            {/* Seller / Supplier dropdown */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Seller / Supplier <span className="text-slate-400 font-normal lowercase">(optional)</span>
              </label>
              <select
                value={sellerId}
                onChange={(e) => setSellerId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-forest-800/20 focus:border-forest-700 transition-all"
              >
                <option value="">None / Open Supplier</option>
                {sellers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.company_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Description
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="High quality cotton seed oil cake, rich in protein and suitable for cattle feed."
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-forest-800/20 focus:border-forest-700 transition-all resize-none"
              />
            </div>

            {/* Status Toggle Switch matching screenshot */}
            <div className="flex items-center justify-between pt-2">
              <div>
                <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Status</span>
                <p className="text-xs text-slate-500">Enable or disable product visibility</p>
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
                  {isActive ? 'Active' : 'Inactive'}
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2 text-sm font-semibold text-white bg-forest-900 hover:bg-forest-800 rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : isEditing ? (
              'Update Product'
            ) : (
              'Save Product'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

