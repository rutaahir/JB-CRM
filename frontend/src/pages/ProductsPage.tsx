import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, LayoutGrid, Table as TableIcon } from 'lucide-react';
import { apiClient } from '@/api/client';
import { Product, Seller, PaginatedResponse } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { ProductCard } from '@/components/product/ProductCard';
import { ProductTable } from '@/components/product/ProductTable';
import { ProductModal } from '@/components/product/ProductModal';
import { ProductViewModal } from '@/components/product/ProductViewModal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { toast } from 'sonner';

export const ProductsPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const [searchParams] = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);

  // Filters & View mode
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [loading, setLoading] = useState(true);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [viewProduct, setViewProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchSellers = async () => {
    try {
      const res = await apiClient.get<PaginatedResponse<Seller>>('/sellers/?page_size=100');
      setSellers(res.data.results || []);
    } catch (err) {
      console.error('Failed to load sellers:', err);
    }
  };

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page_size', '100');

      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }
      if (statusFilter === 'Active') {
        params.append('is_active', 'true');
      } else if (statusFilter === 'Inactive') {
        params.append('is_active', 'false');
      }

      const res = await apiClient.get<PaginatedResponse<Product>>(`/products/?${params.toString()}`);
      setProducts(res.data.results);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    fetchSellers();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts();
  };

  const handleSaveProduct = async (formData: FormData) => {
    try {
      setActionLoading(true);
      if (selectedProduct) {
        await apiClient.put(`/products/${selectedProduct.id}/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success(`Product updated successfully!`);
      } else {
        await apiClient.post('/products/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success(`Product added successfully!`);
      }
      setIsModalOpen(false);
      setSelectedProduct(null);
      fetchProducts();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to save product');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;
    try {
      setActionLoading(true);
      await apiClient.delete(`/products/${productToDelete.id}/`);
      toast.success(`Product "${productToDelete.name}" deleted.`);
      setProductToDelete(null);
      fetchProducts();
    } catch (err) {
      toast.error('Failed to delete product.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-slate-900">
            પ્રોડક્ટ માસ્ટર (Products)
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            જલારામ બ્રોકર્સ - કપાસ ખોળ, મકાઈ ખોળ, હોમિની ફીડ, પેલેટ
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => {
              setSelectedProduct(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2.5 bg-[#0B3B24] hover:bg-[#14532D] text-white rounded-xl text-xs font-semibold shadow-sm flex items-center justify-center gap-2 transition-all self-start sm:self-auto cursor-pointer"
          >
            <Plus size={16} />
            <span>પ્રોડક્ટ ઉમેરો (Add Product)</span>
          </button>
        )}
      </div>

      {/* Filter and Control Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search input */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="શોધો (દા.ત. Kapas, Maize, Khol, Pellet)..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-forest-800/20 focus:border-forest-700 shadow-subtle transition-all"
          />
        </form>

        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-forest-800/20 shadow-subtle"
          >
            <option value="All">બધી સ્થિતિ (All Status)</option>
            <option value="Active">સક્રિય (Active)</option>
            <option value="Inactive">નિષ્ક્રિય (Inactive)</option>
          </select>

          {/* Grid / Table Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/60 shadow-subtle">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-[#0B3B24] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Table View"
            >
              <TableIcon size={15} />
              <span className="hidden sm:inline">Table</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-[#0B3B24] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Grid View"
            >
              <LayoutGrid size={15} />
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
            <p className="text-base font-semibold text-slate-800">કોઈ પ્રોડક્ટ મળી નથી</p>
            <p className="text-xs text-slate-500 mt-1">ઉપર "પ્રોડક્ટ ઉમેરો" પર ક્લિક કરો.</p>
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
        sellers={sellers}
        isLoading={actionLoading}
      />

      {/* View Product Modal */}
      <ProductViewModal
        isOpen={!!viewProduct}
        onClose={() => setViewProduct(null)}
        product={viewProduct}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!productToDelete}
        onClose={() => setProductToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="પ્રોડક્ટ ડિલીટ કરો"
        message={`શું તમે "${productToDelete?.name}" પ્રોડક્ટ ડિલીટ કરવા માંગો છો?`}
        isLoading={actionLoading}
      />
    </div>
  );
};

export default ProductsPage;
