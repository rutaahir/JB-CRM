export type UserRole = 'ADMIN' | 'STAFF';

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Seller {
  id: number;
  company_name: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  gstin?: string;
  pan?: string;
  created_at: string;
  updated_at?: string;
}

export interface Buyer {
  id: number;
  company_name: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  credit_days?: number;
  gstin?: string;
  pan?: string;
  created_at: string;
  updated_at?: string;
}

export interface Category {
  id: number;
  name: string;
  product_count?: number;
  created_at?: string;
}

export interface Product {
  id: number;
  name: string;
  category: number;
  category_name?: string;
  brand: string;
  description: string;
  image: string | null;
  price: string | number | null;
  price_unit: string;
  packaging: string;
  protein_percent: string | number | null;
  seller: number | null;
  seller_name?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface DashboardStats {
  stats: {
    total_sellers: number;
    total_buyers: number;
    total_products: number;
    total_staff: number;
    active_staff: number;
    sellers_growth: string;
    buyers_growth: string;
    products_growth: string;
    staff_active_percentage: string;
    total_deals?: number;
    total_volume?: number;
    total_brokerage?: number;
    total_bags?: number;
    total_balance?: number;
    total_recovered?: number;
  };
  recent_sellers: Array<{
    id: number;
    company_name: string;
    phone: string;
    email: string;
    created_at: string;
  }>;
  recent_buyers: Array<{
    id: number;
    company_name: string;
    phone: string;
    email: string;
    created_at: string;
  }>;
  recent_products: Array<{
    id: number;
    name: string;
    category__name: string;
    price: string | number | null;
    price_unit: string;
    packaging: string;
    created_at: string;
  }>;
  growth_chart: Array<{
    month: string;
    sellers: number;
    buyers: number;
    products: number;
  }>;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface BrokeragePayment {
  id: number;
  deal: number;
  amount: string | number;
  payment_date: string;
  paid_by: 'SELLER' | 'BUYER';
  payment_mode: string;
  reference_number: string;
  collected_by: string;
  notes: string;
  created_at: string;
}

export interface Deal {
  id: number;
  deal_number: string;
  date: string;
  seller: number | null;
  seller_name: string;
  buyer: number | null;
  buyer_name: string;
  buyer_city: string;
  product: number | null;
  product_name: string;
  packaging: string;
  quantity: number;
  rate: string | number;
  rate_unit: string;
  gross_amount: string | number;
  brokerage_type: 'PER_UNIT' | 'PERCENTAGE';
  brokerage_rate: string | number;
  brokerage_from: 'SELLER' | 'BUYER' | 'BOTH';
  brokerage_total: string | number;
  brokerage_received: string | number;
  brokerage_status: 'UNPAID' | 'PARTIAL' | 'PAID';
  brokerage_payments?: BrokeragePayment[];
  statement?: number | null;
  status: 'BOOKED' | 'DISPATCHED' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED';
  delivery_terms: string;
  payment_terms: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentReceipt {
  id: number;
  recovery: number;
  amount: string | number;
  deductions_amount?: string | number;
  deduction_reason?: string;
  payment_date: string;
  payment_mode: 'RTGS' | 'NEFT' | 'CHEQUE' | 'UPI' | 'CASH' | 'ADJUSTMENT';
  reference_number: string;
  collected_by: string;
  notes: string;
  created_at: string;
}

export interface RecoveryRecord {
  id: number;
  deal: number | null;
  seller: number | null;
  seller_name: string;
  buyer: number | null;
  buyer_name: string;
  buyer_city: string;
  buyer_phone: string;
  bill_number: string;
  bill_date: string;
  due_days: number;
  due_date: string | null;
  billed_amount: string | number;
  balance_amount: string | number;
  status: 'PENDING' | 'PARTIAL' | 'PAID';
  assigned_staff: string;
  notes: string;
  statement?: number | null;
  last_reminder_sent_at?: string | null;
  reminder_count?: number;
  payments?: PaymentReceipt[];
  overdue_days?: number;
  is_overdue?: boolean;
  created_at: string;
  updated_at: string;
}

export interface StatementColumn {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  bold?: boolean;
  badge?: string;
  format?: string;
  color?: string;
}

export interface ExtractedRecord {
  bill_number: string;
  bill_date: string;
  buyer_name: string;
  matched_buyer_id?: number | null;
  matched_buyer_name?: string;
  match_confidence?: number;
  city?: string;
  item_desc?: string;
  pkg?: string | number;
  qty?: string | number;
  rate?: string | number;
  pending_amount: string | number;
  billed_amount?: string | number;
  due_days?: number;
  assigned_staff?: string;
  [key: string]: any;
}

export interface StatementUploadResponse {
  success: boolean;
  statement_id: number;
  file_hash?: string;
  is_duplicate?: boolean;
  duplicate_notice?: string;
  seller_id?: number | null;
  seller_name: string;
  detected_company: string;
  statement_type: string;
  columns: StatementColumn[];
  filename: string;
  records_count: number;
  total_amount: number;
  printed_grand_total: number;
  records: ExtractedRecord[];
  raw_text: string;
  message: string;
}

export interface UploadedStatementHistory {
  id: number;
  filename: string;
  file_size: number;
  file_hash?: string;
  statement_type: string;
  seller_name: string;
  status: string;
  uploaded_at: string;
  summary?: any;
}

export interface PartyAlias {
  id: number;
  raw_name: string;
  buyer_id?: number | null;
  buyer_name?: string;
  created_at: string;
}
