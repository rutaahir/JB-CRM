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
  category?: number | null;
  category_name?: string;
  brand?: string;
  description?: string;
  image?: string | null;
  price: string | number | null;
  price_unit: string;
  packaging: string;
  protein_percent?: string | number | null;
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
  seller?: number | null;
  seller_name: string;
  company_contact?: number | null;
  company_contact_name?: string;
  buyer?: number | null;
  buyer_name: string;
  buyer_city: string;
  buyer_contact?: number | null;
  buyer_contact_name?: string;
  product: number | null;
  product_name: string;
  product_name_display?: string;
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
  quantity_unit?: 'BAG' | 'મણ' | string;
  delivery_payment_status?: 'Pending' | 'Done' | string;
  delivery_status?: 'Pending' | 'Dispatched' | 'Delivered' | 'Completed' | 'Cancelled' | string;
  payment_status?: 'Pending' | 'Partial' | 'Paid' | string;
  is_test?: boolean;
  mill_order_number?: string;
  whatsapp_message_mill?: string;
  whatsapp_message_buyer?: string;
  side_effects?: {
    mill_order_number?: string;
    new_product_alert?: boolean;
    alert_message?: string;
    target_actual?: number;
    target_goal?: number;
    whatsapp_message_mill?: string;
    whatsapp_message_buyer?: string;
  };
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

export type PartyType = 'BUYER' | 'COMPANY_MILL';

export interface Contact {
  id: number;
  code: string;
  date: string;
  name: string;
  party_type: PartyType;
  contact_person_1: string;
  contact_person_2: string;
  mobile_1: string;
  mobile_2: string;
  phone_office_1: string;
  phone_office_2: string;
  address: string;
  area: string;
  city: string;
  pin_code: string;
  gst_no: string;
  pan_no: string;
  aadhar_no: string;
  email: string;
  reference_by: string;
  is_active: boolean;
  is_placeholder_mobile?: boolean;
  has_deals?: boolean;
  duplicate_warning?: {
    message: string;
    existing_id: number;
    existing_name: string;
    existing_code: string;
  } | null;
  created_at: string;
  updated_at?: string;
}

export interface PendingOrderExtractedRow {
  row_id: number;
  date: string;
  party_name: string;
  city: string;
  broker: string;
  product: string;
  product_id?: number | null;
  total_bag: number;
  rate: number;
  dispatch_bag: number;
  pending_bag: number;
  days_pending: number;
  status: 'Pending' | 'Dispatch Due' | 'Completed';
  contact_id?: number | null;
  contact_code?: string;
  contact_name?: string;
  is_new_party: boolean;
  match_confidence: number;
  comparison_status: 'NEW_ORDER' | 'PARTIALLY_DISPATCHED' | 'COMPLETED' | 'UNCHANGED' | 'PENDING';
  comparison_notes: string;
}

export interface PendingOrderSummary {
  total_orders: number;
  total_pending_bags: number;
  total_dispatched_bags: number;
  total_order_bags: number;
  matched_parties_count: number;
  new_parties_count: number;
  aging: {
    less_15_days: number;
    between_15_30_days: number;
    over_30_days: number;
  };
  comparison: PendingOrderComparison;
}

export interface PendingOrderComparison {
  has_previous_comparison: boolean;
  previous_statement_id?: number | null;
  previous_statement_date?: string | null;
  new_orders_count: number;
  completed_orders_count: number;
  partially_dispatched_count: number;
  unchanged_orders_count: number;
  completed_removed_orders?: PendingOrderExtractedRow[];
}

export interface PendingOrderReport {
  id: number;
  filename: string;
  company_name: string;
  company_contact_id?: number | null;
  report_date: string;
  status: string;
  uploaded_at: string;
  records?: PendingOrderExtractedRow[];
  summary?: PendingOrderSummary;
  comparison?: PendingOrderComparison;
}

export interface PendingOrderRecord {
  id: number;
  deal?: number | null;
  company_contact?: number | null;
  company_name: string;
  buyer_contact?: number | null;
  buyer_name?: string;
  party_name: string;
  city: string;
  product?: number | null;
  product_name: string;
  broker: string;
  order_date: string;
  rate: string | number;
  rate_unit: string;
  order_quantity: number;
  dispatch_quantity: number;
  pending_quantity: number;
  quantity_unit: string;
  status: 'Pending' | 'Dispatch Due' | 'Completed';
  days_pending?: number;
  created_at: string;
}


