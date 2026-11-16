import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, LayoutGrid, Table as TableIcon, Package, CheckCircle2, XCircle, Handshake, Sparkles } from 'lucide-react';
import { productsApi } from '@/api/products';
import { Product } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { ProductCard } from '@/components/product/ProductCard';
import { ProductTable } from '@/components/product/ProductTable';
import { ProductModal } from '@/components/product/ProductModal';
import { ProductViewModal } from '@/components/product/ProductViewModal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { toast } from 'sonner';

export const ProductsPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & View mode
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');

  // Quick inline add input
  const [quickAddName, setQuickAddName] = useState('');
  const [quickAddLoading, setQuickAddLoading] = useState(false);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [viewProduct, setViewProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch products from API
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const params: { search?: string; is_active?: boolean } = {};
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      if (statusFilter === 'Active') {
        params.is_active = true;
      } else if (statusFilter === 'Inactive') {
        params.is_active = false;
      }

      const list = await productsApi.getProducts(params);
      setProducts(list);
    } catch (err) {
      console.error('Failed to load products:', err);
      toast.error('પ્રોડક્ટ્સ લોડ કરવામાં નિષ્ફળતા (Failed to load products).');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Keyboard shortcut F2 for new product
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        setSelectedProduct(null);
        setIsModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Sync search query with URL params
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSearchParams({ search: searchQuery.trim() });
    } else {
      setSearchParams({});
    }
    fetchProducts();
  };

  // Quick inline product addition
  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = quickAddName.trim();
    if (!trimmed) {
      toast.error('કૃપા કરીને પ્રોડક્ટનું નામ દાખલ કરો.');
      return;
    }

    try {
      setQuickAddLoading(true);
      await productsApi.createProduct({ name: trimmed, is_active: true });
      toast.success(`પ્રોડક્ટ '${trimmed}' સફળતાપૂર્વક ઉમેરાઈ ગઈ!`);
      setQuickAddName('');
      fetchProducts();
    } catch (err: any) {
      const msg =
        err.response?.data?.name?.[0] ||
        err.response?.data?.detail ||
        'પ્રોડક્ટ ઉમેરવામાં ભૂલ આવી (Failed to add product).';
      toast.error(msg);
    } finally {
      setQuickAddLoading(false);
    }
  };

  // Modal Save (Add / Update)
  const handleSaveProduct = async (data: { name: string; is_active: boolean }) => {
    try {
      setActionLoading(true);
      if (selectedProduct) {
        await productsApi.updateProduct(selectedProduct.id, data);
        toast.success(`પ્રોડક્ટ '${data.name}' સફળતાપૂર્વક સુધારી!`);
      } else {
        await productsApi.createProduct(data);
        toast.success(`નવી પ્રોડક્ટ '${data.name}' સફળતાપૂર્વક ઉમેરાઈ ગઈ!`);
      }
      setIsModalOpen(false);
      setSelectedProduct(null);
      fetchProducts();
    } catch (err: any) {
      const msg =
        err.response?.data?.name?.[0] ||
        err.response?.data?.detail ||
        'પ્રોડક્ટ સાચવવામાં ભૂલ આવી (Failed to save product).';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle active/inactive
  const handleToggleStatus = async (product: Product) => {
    try {
      const updated = await productsApi.toggleProductActive(product.id, !product.is_active);
      toast.success(
        `પ્રોડક્ટ '${updated.name}' હવે ${updated.is_active ? 'Active (સક્રિય)' : 'Inactive (નિષ્ક્રિય)'} છે.`
      );
      setProducts((prev) =>
        prev.map((p) => (p.id === updated.id ? { ...p, is_active: updated.is_active } : p))
      );
    } catch (err: any) {
      toast.error('સ્થિતિ બદલવામાં નિષ્ફળતા (Failed to update status).');
    }
  };

  // Delete product
  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;
    try {
      setActionLoading(true);
      await productsApi.deleteProduct(productToDelete.id);
      toast.success(`પ્રોડક્ટ "${productToDelete.name}" ડિલીટ થઈ ગઈ.`);
      setProductToDelete(null);
      fetchProducts();
    } catch (err: any) {
      const msg =
        err.response?.data?.detail || 'પ્રોડક્ટ ડિલીટ કરવામાં નિષ્ફળતા (Failed to delete product).';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Compute stats for header badges
  const stats = useMemo(() => {
    const total = products.length;
    const active = products.filter((p) => p.is_active).length;
    const inactive = total - active;
    const totalDeals = products.reduce((acc, p) => acc + (p.deals_count || 0), 0);
    return { total, active, inactive, totalDeals };
  }, [products]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold font-heading text-slate-900">
              પ્રોડક્ટ માસ્ટર (Product Master)
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#0B3B24]/10 text-[#0B3B24] border border-[#0B3B24]/20">
              {products.length} Items
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            જલારામ બ્રોકર્સ - કપાસ ખોળ, મકાઈ ખોળ, હોમિની ફીડ, પેલેટ, મિક્સ ફીડ વગેરે કોમોડિટીઝ
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => {
              setSelectedProduct(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2.5 bg-[#0B3B24] hover:bg-[#124b30] text-white rounded-xl text-xs font-bold shadow-sm flex items-center justify-center gap-2 transition-all self-start sm:self-auto cursor-pointer"
          >
            <Plus size={16} />
            <span>નવી પ્રોડક્ટ ઉમેરો (+ Add Product)</span>
            <span className="text-[10px] bg-black/25 px-1.5 py-0.5 rounded text-amber-300 font-mono">
              F2
            </span>
          </button>
        )}
      </div>

      {/* KPI Stats Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
            <Package size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">કુલ પ્રોડક્ટ્સ (Total)</p>
            <p className="text-xl font-black text-slate-900">{stats.total}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-emerald-100 bg-emerald-50/20 p-4 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-emerald-800 uppercase">સક્રિય (Active for Deals)</p>
            <p className="text-xl font-black text-emerald-900">{stats.active}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
            <XCircle size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">નિષ્ક્રિય (Inactive)</p>
            <p className="text-xl font-black text-slate-600">{stats.inactive}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#0B3B24]/10 bg-[#0B3B24]/5 p-4 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-[#0B3B24]/10 text-[#0B3B24] flex items-center justify-center shrink-0">
            <Handshake size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#0B3B24] uppercase">કુલ સોદા (Booked Deals)</p>
            <p className="text-xl font-black text-[#0B3B24]">{stats.totalDeals}</p>
          </div>
        </div>
      </div>

      {/* Inline Quick Add Commodity Bar (Ultra Fast for Office Staff) */}
      {isAdmin && (
        <form
          onSubmit={handleQuickAdd}
          className="p-3.5 bg-gradient-to-r from-emerald-50/70 via-white to-slate-50 border border-emerald-200/80 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shadow-2xs"
        >
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 shrink-0">
            <Sparkles size={16} className="text-emerald-700" />
            <span>ઝડપી ઉમેરો (Quick Add):</span>
          </div>
          <input
            type="text"
            value={quickAddName}
            onChange={(e) => setQuickAddName(e.target.value)}
            placeholder="કોમોડિટી નામ લખો (દા.ત. શ્યામ સુપર પેલેટ, રાયડા ખોળ)..."
            disabled={quickAddLoading}
            className="flex-1 px-3.5 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B3B24]/20 focus:border-[#0B3B24] transition-all shadow-inner"
          />
          <button
            type="submit"
            disabled={quickAddLoading || !quickAddName.trim()}
            className="px-4 py-2 bg-[#0B3B24] hover:bg-[#124b30] text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0"
          >
            {quickAddLoading ? (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Plus size={14} />
            )}
            <span>ઉમેરો (Add)</span>
          </button>
        </form>
      )}

      {/* Filter and Control Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search input */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="શોધો (દા.ત. Kapas, Maize, Khol, Pellet)..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B3B24]/20 focus:border-[#0B3B24] shadow-2xs transition-all"
          />
        </form>

        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0B3B24]/20 shadow-2xs"
          >
            <option value="All">બધી સ્થિતિ (All Status: {products.length})</option>
            <option value="Active">સક્રિય (Active)</option>
            <option value="Inactive">નિષ્ક્રિય (Inactive)</option>
          </select>

          {/* Grid / Table Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 shadow-2xs">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-[#0B3B24] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Table View"
            >
              <TableIcon size={14} />
              <span className="hidden sm:inline">Table</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-[#0B3B24] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Grid View"
            >
              <LayoutGrid size={14} />
              <span className="hidden sm:inline">Grid</span>
            </button>
          </div>
        </div>
      </div>

      {/* Products Display */}
      {viewMode === 'grid' ? (
        loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4 animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-slate-200 rounded w-1/2 mb-4" />
                <div className="h-5 bg-slate-200 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-subtle">
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
              <Package size={24} />
            </div>
            <p className="text-base font-bold text-slate-800">કોઈ પ્રોડક્ટ મળી નથી</p>
            <p className="text-xs text-slate-500 mt-1">ઉપર "નવી પ્રોડક્ટ ઉમેરો" પર ક્લિક કરો.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onView={(p) => setViewProduct(p)}
                onEdit={(p) => {
                  setSelectedProduct(p);
                  setIsModalOpen(true);
                }}
                onDelete={(p) => setProductToDelete(p)}
                onToggleStatus={handleToggleStatus}
              />
            ))}
          </div>
        )
      ) : (
        <ProductTable
          products={products}
          onView={(p) => setViewProduct(p)}
          onEdit={(p) => {
            setSelectedProduct(p);
            setIsModalOpen(true);
          }}
          onDelete={(p) => setProductToDelete(p)}
          onToggleStatus={handleToggleStatus}
          isLoading={loading}
        />
      )}

      {/* Add / Edit Product Modal */}
      <ProductModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedProduct(null);
        }}
        onSubmit={handleSaveProduct}
        initialData={selectedProduct}
        isLoading={actionLoading}
      />

      {/* View Product Modal */}
      <ProductViewModal
        isOpen={!!viewProduct}
        onClose={() => setViewProduct(null)}
        product={viewProduct}
        onEdit={(p) => {
          setSelectedProduct(p);
          setIsModalOpen(true);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!productToDelete}
        onClose={() => setProductToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="પ્રોડક્ટ ડિલીટ કરો (Delete Product)"
        message={`શું તમે "${productToDelete?.name}" પ્રોડક્ટ ડિલીટ કરવા માંગો છો? આ ક્રિયા રદ થઈ શકશે નહીં.`}
        isLoading={actionLoading}
      />
    </div>
  );
};

export default ProductsPage;
