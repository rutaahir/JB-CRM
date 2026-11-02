import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function cleanPhoneNumber(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  return digits;
}

export function formatWhatsAppUrl(number: string): string {
  const cleaned = cleanPhoneNumber(number);
  return `https://wa.me/91${cleaned}`;
}

export function formatDate(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

export function formatRelativeTime(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} mins ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  return formatDate(dateString);
}

export function formatPrice(price: string | number | null | undefined, unit?: string): string {
  if (price === null || price === undefined || price === '' || Number(price) === 0) {
    return 'Price on request';
  }
  const numericPrice = Number(price);
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0
  }).format(numericPrice);

  if (unit) {
    const cleanUnit = unit.toLowerCase().startsWith('per ') ? unit.slice(4) : unit;
    return `₹ ${formatted} / ${cleanUnit}`;
  }
  return `₹ ${formatted}`;
}

const FIELD_LABELS: Record<string, string> = {
  seller: 'Seller / Mill (વેચનાર કંપની)',
  seller_name: 'Seller Name',
  buyer: 'Buyer / Party (ખરીદનાર વેપારી)',
  buyer_name: 'Buyer Name',
  buyer_city: 'Buyer City / Station',
  product: 'Product / Commodity (માલ/પ્રોડક્ટ)',
  product_name: 'Product Name',
  packaging: 'Packaging',
  quantity: 'Quantity (ગુણી/જથ્થો)',
  rate: 'Rate per bag (ભાવ)',
  deal_number: 'Sauda Number',
  gross_amount: 'Gross Amount',
  brokerage_rate: 'Brokerage Rate',
  brokerage_total: 'Brokerage Amount',
  phone: 'Phone number',
  whatsapp: 'WhatsApp number',
  email: 'Email address',
  password: 'Password',
  company_name: 'Company name',
  name: 'Name',
  date: 'Deal Date',
  bill_number: 'Bill Number',
  amount: 'Amount',
  due_date: 'Due Date',
  detail: 'Error',
  non_field_errors: 'Validation Error',
};

export function getApiErrorMessage(error: any, fallbackMessage = 'An unexpected error occurred'): string {
  if (!error) return fallbackMessage;

  const data = error.response?.data;
  if (!data) {
    if (error.message === 'Network Error') {
      return 'Network connection failed. Please check if backend server is running.';
    }
    return error.message || fallbackMessage;
  }

  if (typeof data === 'string') {
    return data;
  }

  if (typeof data.detail === 'string') {
    return data.detail;
  }
  if (typeof data.message === 'string') {
    return data.message;
  }
  if (typeof data.error === 'string') {
    return data.error;
  }

  if (Array.isArray(data) && data.length > 0) {
    return typeof data[0] === 'string' ? data[0] : JSON.stringify(data[0]);
  }

  if (typeof data === 'object') {
    const entries = Object.entries(data);
    if (entries.length > 0) {
      const messages = entries.map(([field, msgs]) => {
        const fieldName =
          FIELD_LABELS[field] ||
          field.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        let text = '';
        if (Array.isArray(msgs)) {
          text = msgs.join(', ');
        } else if (typeof msgs === 'string') {
          text = msgs;
        } else {
          text = JSON.stringify(msgs);
        }
        if (field === 'non_field_errors' || field === 'detail' || field === 'error') {
          return text;
        }
        return `${fieldName}: ${text}`;
      });
      return messages.join(' • ');
    }
  }

  return fallbackMessage;
}

