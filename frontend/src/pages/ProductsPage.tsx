import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, LayoutGrid, Table as TableIcon, Filter } from 'lucide-react';
import { apiClient } from '@/api/client';
import { Product, Category, Seller, PaginatedResponse } from '@/types';
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  // Filters & View mode
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [loading, setLoading] = useState(true);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [viewProduct, setViewProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchCategoriesAndSellers = async () => {
    try {
      const [catRes, selRes] = await Promise.all([
        apiClient.get<Category[]>('/categories/'),
        apiClient.get<PaginatedResponse<Seller>>('/sellers/?page_size=100'),
      ]);
      setCategories(catRes.data);
      setSellers(selRes.data.results || []);
    } catch (err) {
      console.error('Failed to load categories/sellers:', err);
    }
  };

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page_size', '100'); // Load all active products for responsive category filtering

      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }
      if (selectedCategory !== 'All') {
        const cat = categories.find((c) => c.name === selectedCategory);
        if (cat) params.append('category', String(cat.id));
      }
      if (statusFilter === 'Active') {
        params.append('is_active', 'true');
      } else if (statusFilter === 'Inactive') {
        params.append('is_active', 'false');
      }

      const res = await apiClient.get<PaginatedResponse<Product>>(`/products/?${params.toString()}`);
      setProducts(res.data.results);
      setTotalCount(res.data.count);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, statusFilter, searchQuery, categories]);

  useEffect(() => {
    fetchCategoriesAndSellers();
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

  const categoryPills = ['All', ...categories.map((c) => c.name)];

  return (
    <div className="space-y-6">
      {/* Top Header matching screenshot */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-slate-900">Products</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage cattle feed and oil cake products</p>
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
            <span>Add Product</span>
          </button>
        )}
      </div>

      {/* Filter and Control Bar matching screenshot */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search input */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-forest-800/20 focus:border-forest-700 shadow-subtle transition-all"
          />
        </form>

        {/* Dropdowns and View Toggle matching screenshot */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-forest-800/20 shadow-subtle"
          >
            <option value="All">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-forest-800/20 shadow-subtle"
          >
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>

          {/* Grid / Table Toggle Buttons matching screenshot */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/60 shadow-subtle">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                viewMode === 'grid'
                  ? 'bg-[#0B3B24] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Grid View"
            >
              <LayoutGrid size={15} />
              <span className="hidden sm:inline">Grid</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                viewMode === 'table'
                  ? 'bg-[#0B3B24] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Table View"
            >
              <TableIcon size={15} />
              <span className="hidden sm:inline">Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* Pill Tabs for Categories matching screenshot */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {categoryPills.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              selectedCategory === cat
                ? 'bg-[#0B3B24] text-white shadow-sm font-semibold'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Products Display (Grid View or Table View) */}
      {viewMode === 'grid' ? (
        loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4 animate-pulse">
                <div className="aspect-[16/10] bg-slate-200 rounded-xl mb-3" />
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-slate-200 rounded w-1/2 mb-4" />
                <div className="h-5 bg-slate-200 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-subtle">
            <p className="text-base font-semibold text-slate-800">No products found</p>
            <p className="text-xs text-slate-500 mt-1">Try choosing a different category or add a new product.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
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
        categories={categories}
        sellers={sellers}
        onCategoryCreated={(newCat) => setCategories((prev) => [...prev, newCat])}
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
        title="Delete Product"
        message={`Are you sure you want to delete "${productToDelete?.name}"?`}
        isLoading={actionLoading}
      />
    </div>
  );
};

