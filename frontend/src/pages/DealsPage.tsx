import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Handshake,
  Plus,
  Search,
  Filter,
  Trash2,
  Printer,
  Download,
  MessageCircle,
  AlertCircle,
  CheckCircle2,
  X,
  Settings,
  Calendar,
  Building2,
  User,
  Package,
  Hash,
  ExternalLink,
  Copy,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { toast } from 'sonner';
import { dealsApi } from '@/api/deals';
import { contactsApi } from '@/api/contacts';
import { apiClient } from '@/api/client';
import { Deal, Contact, Product } from '@/types';
import { cn, formatWhatsAppUrl } from '@/lib/utils';

interface SearchableContactSelectProps {
  contacts: Contact[];
  value: string;
  onChange: (id: string) => void;
  placeholder: string;
  dataTestId?: string;
}

const SearchableContactSelect: React.FC<SearchableContactSelectProps> = ({
  contacts,
  value,
  onChange,
  placeholder,
  dataTestId,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedContact = contacts.find((c) => c.id.toString() === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = contacts.filter((c) => {
    const q = query.toLowerCase();
    return (
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.code && c.code.toLowerCase().includes(q)) ||
      (c.city && c.city.toLowerCase().includes(q))
    );
  });

  return (
    <div ref={wrapperRef} data-testid={dataTestId} className="relative w-full">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 bg-white text-slate-800 rounded flex items-center justify-between cursor-pointer focus-within:ring-1 focus-within:ring-[#1b4332]"
      >
        <span className={selectedContact ? 'text-slate-900 font-bold' : 'text-slate-400'}>
          {selectedContact
            ? `${selectedContact.code} - ${selectedContact.name} ${selectedContact.city ? `(${selectedContact.city})` : ''}`
            : placeholder}
        </span>
        <span className="text-[10px] text-slate-400">▼</span>
      </div>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-xl overflow-hidden max-h-60 flex flex-col">
          <div className="p-2 border-b border-slate-200 bg-slate-50 flex items-center gap-1.5">
            <Search size={13} className="text-slate-400 shrink-0" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type code, name or station to filter..."
              className="w-full text-xs bg-transparent border-none outline-none font-medium text-slate-800 placeholder-slate-400"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-slate-400 hover:text-slate-600 text-xs px-1"
              >
                ✕
              </button>
            )}
          </div>
          <div className="overflow-y-auto divide-y divide-slate-100 flex-1">
            {filtered.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-400">No matching contacts found</div>
            ) : (
              filtered.map((c) => (
                <div
                  key={c.id}
                  data-testid={`option-${c.code}`}
                  onClick={() => {
                    onChange(c.id.toString());
                    setIsOpen(false);
                    setQuery('');
                  }}
                  className={cn(
                    'px-3 py-2 text-xs cursor-pointer hover:bg-emerald-50 flex items-center justify-between transition-colors',
                    c.id.toString() === value ? 'bg-emerald-50/80 font-bold text-emerald-900' : 'text-slate-800'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                      {c.code}
                    </span>
                    <span>{c.name}</span>
                  </div>
                  {c.city && <span className="text-[10px] text-slate-400 font-normal">{c.city}</span>}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const DealsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const modeParam = searchParams.get('mode');

  // Tab state: 'ENTRY' (F6) or 'REGISTER' (F7)
  const [activeTab, setActiveTab] = useState<'ENTRY' | 'REGISTER'>(
    modeParam === 'entry' ? 'ENTRY' : 'REGISTER'
  );

  useEffect(() => {
    if (modeParam === 'entry') {
      setActiveTab('ENTRY');
    } else {
      setActiveTab('REGISTER');
    }
  }, [modeParam]);

  // Sauda Register filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterParty, setFilterParty] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [filterProduct, setFilterProduct] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // Manage Products Modal
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [newProductName, setNewProductName] = useState('');

  // Success summary modal after saving a deal
  const [savedDealSummary, setSavedDealSummary] = useState<any | null>(null);

  // Form state for Sauda Entry (Single Delivery / Payment field)
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    buyer_contact_id: '',
    company_contact_id: '',
    product_id: '',
    rate: '',
    rate_unit: 'BAG' as 'BAG' | 'મણ',
    quantity: '',
    quantity_unit: 'BAG' as 'BAG' | 'મણ',
    delivery_payment_status: 'Pending',
  });

  const [saving, setSaving] = useState(false);

  // Fetch contacts (Party Master)
  const { data: contactsData } = useQuery({
    queryKey: ['contacts-dropdown-deals'],
    queryFn: () => contactsApi.getContacts({ page_size: 500, is_active: true }),
  });

  const millContacts = contactsData?.results?.filter((c) => c.party_type === 'COMPANY_MILL') || [];
  const buyerContacts = contactsData?.results?.filter((c) => c.party_type === 'BUYER') || [];

  // Fetch products
  const { data: productsData, refetch: refetchProducts } = useQuery({
    queryKey: ['products-list'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/products/');
      return Array.isArray(res.data) ? res.data : (res.data.results as Product[]);
    },
  });

  const products = productsData || [];
  const activeProducts = products.filter((p) => p.is_active);

  // Fetch deals for Sauda Register
  const { data: dealsData, isLoading: dealsLoading, refetch: refetchDeals } = useQuery({
    queryKey: [
      'deals-register',
      filterParty,
      filterCompany,
      filterProduct,
      filterStatus,
      filterDateFrom,
      filterDateTo,
      searchTerm,
    ],
    queryFn: () =>
      dealsApi.getDeals({
        buyer_contact: filterParty || undefined,
        company_contact: filterCompany || undefined,
        product: filterProduct || undefined,
        status: filterStatus !== 'ALL' ? filterStatus : undefined,
        date_from: filterDateFrom || undefined,
        date_to: filterDateTo || undefined,
        search: searchTerm || undefined,
      }),
  });

  const dealsList: Deal[] = Array.isArray(dealsData) ? dealsData : (dealsData?.results as Deal[]) || [];

  // Delete deal mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => dealsApi.deleteDeal(id),
    onSuccess: () => {
      toast.success('Sauda deal deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['deals-register'] });
    },
    onError: () => toast.error('Failed to delete deal'),
  });

  // Keyboard shortcut listener: F6 = Entry, F7 = Register, F10 = Save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F6') {
        e.preventDefault();
        setActiveTab('ENTRY');
        setSearchParams({ mode: 'entry' });
      } else if (e.key === 'F7') {
        e.preventDefault();
        setActiveTab('REGISTER');
        setSearchParams({ mode: 'register' });
      } else if (e.key === 'F10' && activeTab === 'ENTRY') {
        e.preventDefault();
        handleSubmitSauda();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, formData]);

  // Form submission handler
  const handleSubmitSauda = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!formData.buyer_contact_id) {
      toast.error('Please select a Buyer (Contact)!');
      return;
    }
    if (!formData.company_contact_id) {
      toast.error('Please select a Company / Mill (Contact)!');
      return;
    }
    if (!formData.product_id) {
      toast.error('Please select a Product!');
      return;
    }
    const rateNum = parseFloat(formData.rate);
    if (isNaN(rateNum) || rateNum <= 0) {
      toast.error('Please enter a valid Rate greater than 0!');
      return;
    }
    const qtyNum = parseInt(formData.quantity);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      toast.error('Please enter a valid Quantity greater than 0!');
      return;
    }

    try {
      setSaving(true);
      const buyerObj = buyerContacts.find((c) => c.id.toString() === formData.buyer_contact_id);
      const millObj = millContacts.find((c) => c.id.toString() === formData.company_contact_id);
      const productObj = products.find((p) => p.id.toString() === formData.product_id);

      const payload: Partial<Deal> = {
        date: formData.date,
        buyer_contact: parseInt(formData.buyer_contact_id),
        buyer_name: buyerObj ? buyerObj.name : '',
        buyer_city: buyerObj ? (buyerObj.city || '') : '',
        company_contact: parseInt(formData.company_contact_id),
        seller_name: millObj ? millObj.name : '',
        product: parseInt(formData.product_id),
        product_name: productObj ? productObj.name : '',
        rate: rateNum,
        rate_unit: formData.rate_unit,
        quantity: qtyNum,
        quantity_unit: formData.quantity_unit,
        delivery_payment_status: formData.delivery_payment_status,
        delivery_status: formData.delivery_payment_status,
        payment_status: formData.delivery_payment_status,
        status: (formData.delivery_payment_status === 'Pending' ? 'BOOKED' : 'DELIVERED') as any,
      };

      const res = await dealsApi.createDeal(payload);
      toast.success(`Sauda #${res.deal_number} saved successfully!`);

      // Refresh queries
      queryClient.invalidateQueries({ queryKey: ['deals-register'] });
      queryClient.invalidateQueries({ queryKey: ['deals-stats'] });

      // Show success summary
      const sideEffects = (res as any).side_effects || {};
      setSavedDealSummary({
        deal: res,
        buyer: buyerObj,
        mill: millObj,
        product: productObj,
        mill_order_number: sideEffects.mill_order_number || res.mill_order_number || `MO-${res.deal_number}`,
        new_product_alert: sideEffects.new_product_alert,
        alert_message: sideEffects.alert_message,
        target_actual: sideEffects.target_actual,
        target_goal: sideEffects.target_goal,
        whatsapp_message_mill: sideEffects.whatsapp_message_mill || res.whatsapp_message_mill,
        whatsapp_message_buyer: sideEffects.whatsapp_message_buyer || res.whatsapp_message_buyer,
      });

      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        buyer_contact_id: '',
        company_contact_id: '',
        product_id: '',
        rate: '',
        rate_unit: 'BAG',
        quantity: '',
        quantity_unit: 'BAG',
        delivery_payment_status: 'Pending',
      });
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.response?.data?.message || 'Failed to save deal';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // Add Product handler
  const handleAddProduct = async () => {
    if (!newProductName.trim()) {
      toast.error('Please enter a product name');
      return;
    }
    try {
      await apiClient.post('/products/', { name: newProductName.trim(), is_active: true });
      toast.success(`Product '${newProductName.trim()}' added successfully!`);
      setNewProductName('');
      refetchProducts();
    } catch (err: any) {
      toast.error(err.response?.data?.name?.[0] || 'Failed to add product');
    }
  };

  // Toggle Product Active status
  const handleToggleProduct = async (prod: Product) => {
    try {
      await apiClient.patch(`/products/${prod.id}/`, { is_active: !prod.is_active });
      toast.success(`Product '${prod.name}' updated!`);
      refetchProducts();
    } catch (err: any) {
      toast.error('Failed to update product status');
    }
  };

  // Export Excel handler
  const handleExportExcel = () => {
    dealsApi.exportExcel({
      buyer_contact: filterParty,
      company_contact: filterCompany,
      product: filterProduct,
      status: filterStatus !== 'ALL' ? filterStatus : undefined,
      date_from: filterDateFrom,
      date_to: filterDateTo,
      search: searchTerm,
    });
    toast.success('Downloading Sauda Register Excel (UTF-8 BOM)...');
  };

  return (
    <div className="space-y-4">
      {/* Page Title & Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white px-5 py-3.5 rounded-xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Handshake className="text-[#1b4332]" size={22} />
            Sauda Management (Deal Entry & Register)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Module 3: Automatic Mill Order, Pending Order, Product Mapping & Target Tracking
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            onClick={() => {
              setActiveTab('ENTRY');
              setSearchParams({ mode: 'entry' });
            }}
            className={cn(
              'px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer',
              activeTab === 'ENTRY'
                ? 'bg-[#1b4332] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            )}
          >
            <Plus size={14} />
            Sauda Entry <span className="opacity-80 text-[10px] ml-0.5">(F6)</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('REGISTER');
              setSearchParams({ mode: 'register' });
            }}
            className={cn(
              'px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer',
              activeTab === 'REGISTER'
                ? 'bg-[#1b4332] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            )}
          >
            <Calendar size={14} />
            Sauda Register <span className="opacity-80 text-[10px] ml-0.5">(F7)</span>
          </button>
        </div>
      </div>

      {/* TAB 1: SAUDA ENTRY (F6) */}
      {activeTab === 'ENTRY' && (
        <div className="max-w-4xl mx-auto">
          <form
            onSubmit={handleSubmitSauda}
            className="bg-white rounded-xl border border-slate-300 shadow-sm overflow-hidden"
          >
            {/* Header banner */}
            <div className="bg-[#1b4332] text-white px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-wide">NEW SAUDA DEAL ENTRY</span>
                <span className="text-[11px] bg-emerald-800/80 px-2 py-0.5 rounded text-emerald-100 font-semibold border border-emerald-700">
                  Shortcut: F10 to Save
                </span>
              </div>
              <div className="text-xs text-emerald-100 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Database Saving
              </div>
            </div>

            <div className="p-6 space-y-4 bg-slate-50/50">
              {/* Row 1: Deal Date & Deal Number (Auto) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <label className="w-32 text-xs font-bold text-slate-700 text-right shrink-0">
                    *Deal Date:
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 bg-white text-slate-800 rounded focus:ring-1 focus:ring-[#1b4332] focus:outline-none"
                    required
                  />
                </div>

                <div className="flex items-center gap-3">
                  <label className="w-32 text-xs font-bold text-slate-700 text-right shrink-0">
                    Deal Number:
                  </label>
                  <input
                    type="text"
                    value="[Auto-generated on Save: SD-YYYYMMDD-XXXX]"
                    disabled
                    className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-100 border border-slate-300 text-slate-500 rounded cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Row 2: Buyer (Contact Type BUYER) - Searchable Dropdown */}
              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center gap-3">
                  <label className="w-32 text-xs font-bold text-slate-700 text-right shrink-0">
                    *Buyer (Party):
                  </label>
                  <div className="w-full">
                    <SearchableContactSelect
                      dataTestId="buyer-select"
                      contacts={buyerContacts}
                      value={formData.buyer_contact_id}
                      onChange={(id) => setFormData({ ...formData, buyer_contact_id: id })}
                      placeholder="-- Select or type to search Buyer from Party Master --"
                    />
                  </div>
                </div>
              </div>

              {/* Row 3: Company / Mill (Contact Type COMPANY_MILL) - Searchable Dropdown */}
              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center gap-3">
                  <label className="w-32 text-xs font-bold text-slate-700 text-right shrink-0">
                    *Company / Mill:
                  </label>
                  <div className="w-full">
                    <SearchableContactSelect
                      dataTestId="mill-select"
                      contacts={millContacts}
                      value={formData.company_contact_id}
                      onChange={(id) => setFormData({ ...formData, company_contact_id: id })}
                      placeholder="-- Select or type to search Mill / Company --"
                    />
                  </div>
                </div>
              </div>

              {/* Row 4: Product with Manage Products link */}
              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center gap-3">
                  <label className="w-32 text-xs font-bold text-slate-700 text-right shrink-0">
                    *Product:
                  </label>
                  <div className="w-full flex items-center gap-2">
                    <select
                      data-testid="product-select"
                      value={formData.product_id}
                      onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                      className="flex-1 px-3 py-1.5 text-xs font-semibold border border-slate-300 bg-white text-slate-800 rounded focus:ring-1 focus:ring-[#1b4332] focus:outline-none"
                      required
                    >
                      <option value="">-- Select Commodity Product --</option>
                      {activeProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setIsProductModalOpen(true)}
                      className="px-2.5 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded shrink-0 flex items-center gap-1"
                      title="Add, edit or deactivate commodity products"
                    >
                      <Settings size={13} />
                      Manage Products
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 5: Rate + Rate Unit & Quantity + Quantity Unit */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Rate */}
                <div className="flex items-center gap-3">
                  <label className="w-32 text-xs font-bold text-slate-700 text-right shrink-0">
                    *Rate (₹):
                  </label>
                  <div className="flex-1 flex items-center gap-1.5">
                    <input
                      data-testid="rate-input"
                      type="number"
                      step="0.01"
                      value={formData.rate}
                      onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                      placeholder="e.g. 1250"
                      className="w-full px-3 py-1.5 text-xs font-bold border border-slate-300 bg-white text-slate-800 rounded focus:ring-1 focus:ring-[#1b4332] focus:outline-none"
                      required
                    />
                    <select
                      value={formData.rate_unit}
                      onChange={(e) => setFormData({ ...formData, rate_unit: e.target.value as any })}
                      className="w-28 px-2 py-1.5 text-xs font-bold border border-slate-300 bg-white text-slate-800 rounded focus:ring-1 focus:ring-[#1b4332] focus:outline-none shrink-0"
                    >
                      <option value="BAG">₹ / BAG</option>
                      <option value="મણ">₹ / મણ</option>
                    </select>
                  </div>
                </div>

                {/* Quantity */}
                <div className="flex items-center gap-3">
                  <label className="w-32 text-xs font-bold text-slate-700 text-right shrink-0">
                    *Quantity:
                  </label>
                  <div className="flex-1 flex items-center gap-1.5">
                    <input
                      data-testid="quantity-input"
                      type="number"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      placeholder="e.g. 100"
                      className="w-full px-3 py-1.5 text-xs font-bold border border-slate-300 bg-white text-slate-800 rounded focus:ring-1 focus:ring-[#1b4332] focus:outline-none"
                      required
                    />
                    <select
                      data-testid="quantity-unit-select"
                      value={formData.quantity_unit}
                      onChange={(e) => setFormData({ ...formData, quantity_unit: e.target.value as any })}
                      className="w-28 px-2 py-1.5 text-xs font-bold border border-slate-300 bg-white text-slate-800 rounded focus:ring-1 focus:ring-[#1b4332] focus:outline-none shrink-0"
                    >
                      <option value="BAG">BAG</option>
                      <option value="મણ">મણ</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Row 6: Delivery / Payment Status (Single field per spec) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <label className="w-32 text-xs font-bold text-slate-700 text-right shrink-0">
                    Delivery / Payment:
                  </label>
                  <select
                    value={formData.delivery_payment_status}
                    onChange={(e) => setFormData({ ...formData, delivery_payment_status: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 bg-white text-slate-800 rounded focus:ring-1 focus:ring-[#1b4332] focus:outline-none"
                  >
                    <option value="Pending">Pending (Default)</option>
                    <option value="Done">Done</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Form Action Buttons */}
            <div className="px-6 py-4 bg-slate-100/90 border-t border-slate-300 flex items-center justify-between">
              <div className="text-xs text-slate-500 font-medium">
                Automatic: Mill Order + Pending Order + Product Mapping + Target Actual
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      date: new Date().toISOString().split('T')[0],
                      buyer_contact_id: '',
                      company_contact_id: '',
                      product_id: '',
                      rate: '',
                      rate_unit: 'BAG',
                      quantity: '',
                      quantity_unit: 'BAG',
                      delivery_payment_status: 'Pending',
                    })
                  }
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white border border-slate-300 rounded shadow-xs"
                >
                  Clear Form
                </button>
                <button
                  data-testid="save-deal-btn"
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 text-xs font-bold text-white bg-[#1b4332] hover:bg-[#143427] rounded shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={14} />
                  )}
                  Save Sauda Deal (F10)
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: SAUDA REGISTER (F7) */}
      {activeTab === 'REGISTER' && (
        <div className="space-y-4">
          {/* Register Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                <SlidersHorizontal size={16} className="text-[#1b4332]" />
                Filter Sauda Register:
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportExcel}
                  className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                  title="Export Sauda Register to CSV with UTF-8 BOM"
                >
                  <Download size={14} />
                  Export Excel (UTF-8 BOM)
                </button>
                <button
                  onClick={() => {
                    setFilterParty('');
                    setFilterCompany('');
                    setFilterProduct('');
                    setFilterStatus('ALL');
                    setFilterDateFrom('');
                    setFilterDateTo('');
                    setSearchTerm('');
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold border border-slate-200"
                >
                  Reset Filters
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Buyer / Party Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Buyer Party:</label>
                <select
                  value={filterParty}
                  onChange={(e) => setFilterParty(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800 focus:outline-none focus:border-emerald-600"
                >
                  <option value="">All Buyers</option>
                  {buyerContacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Company / Mill Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Company / Mill:</label>
                <select
                  value={filterCompany}
                  onChange={(e) => setFilterCompany(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800 focus:outline-none focus:border-emerald-600"
                >
                  <option value="">All Mills / Companies</option>
                  {millContacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Product Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Product:</label>
                <select
                  value={filterProduct}
                  onChange={(e) => setFilterProduct(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800 focus:outline-none focus:border-emerald-600"
                >
                  <option value="">All Products</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Status:</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800 focus:outline-none focus:border-emerald-600"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="BOOKED">Booked</option>
                  <option value="Dispatched">Dispatched</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              {/* Search text */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Search Keyword:</label>
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Sauda #, party, city..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sauda Register Table */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-3">Sauda # & Date</th>
                    <th className="py-3 px-3">Company / Mill</th>
                    <th className="py-3 px-3">Buyer Party (Station)</th>
                    <th className="py-3 px-3">Product</th>
                    <th className="py-3 px-3 text-right">Qty</th>
                    <th className="py-3 px-3 text-right">Rate</th>
                    <th className="py-3 px-3 text-right">Gross Amount</th>
                    <th className="py-3 px-3 text-center">Mill Order #</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-center">WhatsApp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dealsLoading ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        <div className="w-8 h-8 border-3 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin mx-auto mb-2" />
                        Loading Sauda Register...
                      </td>
                    </tr>
                  ) : dealsList.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        No Sauda Deals match your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    dealsList.map((deal) => {
                      const cName =
                        deal.company_contact_name ||
                        (deal as any).company_contact?.name ||
                        deal.seller_name ||
                        '-';
                      const bName =
                        deal.buyer_contact_name ||
                        (deal as any).buyer_contact?.name ||
                        deal.buyer_name ||
                        '-';
                      const bCity = deal.buyer_city ? ` (${deal.buyer_city})` : '';
                      const pName = deal.product_name_display || deal.product_name || '-';
                      const moNum = deal.mill_order_number || `MO-${deal.deal_number}`;
                      const statusVal = deal.delivery_payment_status || deal.delivery_status || deal.status || 'Pending';
                      const unitsMatch = deal.rate_unit === deal.quantity_unit;
                      const hasGross = unitsMatch && deal.gross_amount !== null && deal.gross_amount !== undefined && !isNaN(Number(deal.gross_amount));

                      return (
                        <tr key={deal.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-3 font-bold text-slate-900 whitespace-nowrap">
                            <span className="text-[#1b4332]">{deal.deal_number}</span>
                            <div className="text-[10px] text-slate-400 font-normal">{deal.date}</div>
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-800">{cName}</td>
                          <td className="py-3 px-3 font-semibold text-slate-800">
                            {bName}
                            <span className="text-slate-400 font-normal">{bCity}</span>
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-700">{pName}</td>
                          <td className="py-3 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                            {deal.quantity} {deal.quantity_unit || 'BAG'}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                            ₹{deal.rate} / {deal.rate_unit || 'BAG'}
                          </td>
                          <td className="py-3 px-3 text-right font-bold whitespace-nowrap">
                            {hasGross ? (
                              <span className="text-emerald-800">
                                ₹{Number(deal.gross_amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200" title="Units differ - rate not multiplied per client rule">
                                Mixed units
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                              {moNum}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <span
                              className={cn(
                                'px-2 py-0.5 rounded text-[10px] font-bold',
                                statusVal === 'Done' || statusVal === 'Completed' || statusVal === 'DELIVERED'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-amber-100 text-amber-800 border border-amber-300'
                              )}
                            >
                              {statusVal}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <button
                              onClick={() => {
                                const msg =
                                  deal.whatsapp_message_buyer ||
                                  `*JALARAM BROKERS - SAUDA CONFIRMATION*\nSauda No: ${deal.deal_number}\nDate: ${deal.date}\nProduct: ${pName}\nQty: ${deal.quantity} ${deal.quantity_unit || 'BAG'}\nRate: ₹${deal.rate} / ${deal.rate_unit || 'BAG'}`;
                                const phone = (deal as any).buyer_contact?.mobile_1 || '';
                                if (!phone) {
                                  navigator.clipboard.writeText(msg);
                                  toast.success('WhatsApp text copied to clipboard!');
                                } else {
                                  window.open(formatWhatsAppUrl(phone, msg), '_blank');
                                }
                              }}
                              className="text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1 font-bold text-[11px]"
                              title="Send or copy WhatsApp Confirmation"
                            >
                              <MessageCircle size={14} className="text-emerald-600" />
                              Send
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table footer count */}
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 font-semibold">
              <div>Total Deals Displayed: {dealsList.length}</div>
              <div>Jalaram Brokers CRM • Sauda Register</div>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS SUMMARY MODAL (Appears after saving a deal) */}
      {savedDealSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="bg-[#1b4332] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="text-emerald-400" size={24} />
                <div>
                  <h3 className="font-bold text-base">Sauda Deal Saved Successfully!</h3>
                  <p className="text-xs text-emerald-100">
                    Deal No: {savedDealSummary.deal.deal_number} • Date: {savedDealSummary.deal.date}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSavedDealSummary(null)}
                className="text-white/80 hover:text-white p-1 rounded-md"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 overflow-y-auto">
              {/* Alert if New Product Bought for the first time */}
              {savedDealSummary.new_product_alert && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-2.5">
                  <AlertCircle size={18} className="text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-amber-900">
                      ★ NEW PRODUCT ALERT (Module 6 Product Auto-Mapping)
                    </h4>
                    <p className="text-xs text-amber-800 mt-0.5">
                      {savedDealSummary.alert_message ||
                        `Buyer '${savedDealSummary.buyer?.name}' bought '${savedDealSummary.product?.name}' for the FIRST time!`}
                    </p>
                    <p className="text-[11px] text-amber-700 mt-1">
                      Per Rule 4: Target is NOT auto-set for new products. Target remains Manual.
                    </p>
                  </div>
                </div>
              )}

              {/* Automatic side effects checklist */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Automatic Records Created / Updated:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-800">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    <span>
                      <strong>Mill Order:</strong> {savedDealSummary.mill_order_number}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-800">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    <span>
                      <strong>Pending Order:</strong> {savedDealSummary.deal.quantity}{' '}
                      {savedDealSummary.deal.quantity_unit} Pending
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-800">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    <span>
                      <strong>Order Register:</strong> Row added to Sauda Register
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-800">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    <span>
                      <strong>Target Actual:</strong> {savedDealSummary.target_actual || savedDealSummary.deal.quantity} /{' '}
                      {savedDealSummary.target_goal || 0} {savedDealSummary.deal.quantity_unit || 'BAG'}
                    </span>
                  </div>
                </div>
              </div>

              {/* WhatsApp Message Preview */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">
                    Ready WhatsApp Message for Mill / Supplier:
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(savedDealSummary.whatsapp_message_mill);
                      toast.success('Mill WhatsApp message copied to clipboard!');
                    }}
                    className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer"
                  >
                    <Copy size={12} /> Copy Mill Text
                  </button>
                </div>
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {savedDealSummary.whatsapp_message_mill}
                </div>

                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs font-bold text-slate-700">
                    Ready WhatsApp Message for Buyer:
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(savedDealSummary.whatsapp_message_buyer);
                      toast.success('Buyer WhatsApp message copied to clipboard!');
                    }}
                    className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer"
                  >
                    <Copy size={12} /> Copy Buyer Text
                  </button>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {savedDealSummary.whatsapp_message_buyer}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
              <button
                data-testid="modal-view-register-btn"
                onClick={() => {
                  setSavedDealSummary(null);
                  setActiveTab('REGISTER');
                  setSearchParams({ mode: 'register' });
                }}
                className="px-4 py-2 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-lg border border-emerald-300"
              >
                View in Sauda Register (F7)
              </button>
              <button
                onClick={() => setSavedDealSummary(null)}
                className="px-5 py-2 text-xs font-bold text-white bg-[#1b4332] hover:bg-[#143427] rounded-lg shadow-xs"
              >
                Done (Enter Next Sauda)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANAGE PRODUCTS MODAL (Inside Sauda Entry per Item 6) */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-[#1b4332] text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings size={18} />
                <h3 className="font-bold text-sm">Manage Commodity Products</h3>
              </div>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="text-white/80 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              {/* Quick Add Product */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Add New Commodity Product:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newProductName}
                    onChange={(e) => setNewProductName(e.target.value)}
                    placeholder="Product Name (e.g. Kapas Khol)"
                    className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-[#1b4332] focus:outline-none"
                  />
                  <button
                    onClick={handleAddProduct}
                    className="px-3.5 py-1.5 bg-[#1b4332] hover:bg-[#143427] text-white text-xs font-bold rounded shadow-xs shrink-0"
                  >
                    Add Product
                  </button>
                </div>
              </div>

              {/* Product List */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">
                  All Commodity Products ({products.length}):
                </label>
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg">
                  {products.map((p) => (
                    <div
                      key={p.id}
                      className="px-3 py-2 flex items-center justify-between text-xs hover:bg-slate-50"
                    >
                      <span className={cn('font-semibold', p.is_active ? 'text-slate-900' : 'text-slate-400 line-through')}>
                        {p.name}
                      </span>
                      <button
                        onClick={() => handleToggleProduct(p)}
                        className={cn(
                          'px-2 py-0.5 rounded text-[10px] font-bold border transition-colors',
                          p.is_active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                        )}
                      >
                        {p.is_active ? 'Active' : 'Deactivated'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="px-4 py-1.5 bg-slate-800 text-white rounded text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default DealsPage;
