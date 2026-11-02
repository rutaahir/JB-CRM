import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Modal } from '@/components/common/Modal';
import { Seller, Buyer } from '@/types';
import { cleanPhoneNumber } from '@/lib/utils';

const phoneRegex = /^\d{10}$/;

const companySchema = z.object({
  company_name: z.string().min(2, 'Company name is required'),
  address: z.string().min(5, 'Address is required'),
  phone: z.string().refine((val) => phoneRegex.test(cleanPhoneNumber(val)), {
    message: 'Must be a valid 10-digit phone number',
  }),
  whatsapp: z.string().refine((val) => phoneRegex.test(cleanPhoneNumber(val)), {
    message: 'Must be a valid 10-digit phone number',
  }),
  email: z.string().email('Enter a valid email address'),
  sameAsPhone: z.boolean().optional(),
});

type CompanyFormData = z.infer<typeof companySchema>;

interface CompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<CompanyFormData, 'sameAsPhone'>) => Promise<void>;
  type: 'seller' | 'buyer';
  initialData?: Seller | Buyer | null;
  isLoading?: boolean;
}

export const CompanyModal: React.FC<CompanyModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  type,
  initialData,
  isLoading = false,
}) => {
  const isEditing = !!initialData;
  const title = isEditing
    ? `Edit ${type === 'seller' ? 'Seller' : 'Buyer'}`
    : `Add New ${type === 'seller' ? 'Seller' : 'Buyer'}`;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      company_name: '',
      address: '',
      phone: '',
      whatsapp: '',
      email: '',
      sameAsPhone: false,
    },
  });

  const phoneValue = watch('phone');
  const sameAsPhone = watch('sameAsPhone');

  useEffect(() => {
    if (sameAsPhone && phoneValue) {
      setValue('whatsapp', phoneValue, { shouldValidate: true });
    }
  }, [sameAsPhone, phoneValue, setValue]);

  useEffect(() => {
    if (initialData) {
      reset({
        company_name: initialData.company_name,
        address: initialData.address,
        phone: initialData.phone,
        whatsapp: initialData.whatsapp,
        email: initialData.email,
        sameAsPhone: initialData.phone === initialData.whatsapp,
      });
    } else {
      reset({
        company_name: '',
        address: '',
        phone: '',
        whatsapp: '',
        email: '',
        sameAsPhone: true,
      });
    }
  }, [initialData, reset, isOpen]);

  const handleFormSubmit = async (data: CompanyFormData) => {
    const { sameAsPhone: _, ...payload } = data;
    payload.phone = cleanPhoneNumber(payload.phone);
    payload.whatsapp = cleanPhoneNumber(payload.whatsapp);
    await onSubmit(payload);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={`Enter company details for this ${type}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        {/* Company Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Company Name <span className="text-rose-500">*</span>
          </label>
          <input
            {...register('company_name')}
            type="text"
            placeholder="e.g. Shree Patel Cotton Industries"
            className={`w-full px-3.5 py-2.5 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none transition-all ${
              errors.company_name
                ? 'bg-rose-50/30 border border-rose-300 text-slate-800 focus:ring-2 focus:ring-rose-400/20 focus:border-rose-500'
                : 'bg-slate-50 border border-slate-200 text-slate-800 focus:ring-2 focus:ring-forest-800/20 focus:border-forest-700'
            }`}
          />
          {errors.company_name && (
            <p className="text-xs text-rose-600 mt-1">{errors.company_name.message}</p>
          )}
        </div>

        {/* Address */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Company Address <span className="text-rose-500">*</span>
          </label>
          <textarea
            {...register('address')}
            rows={2}
            placeholder="e.g. Plot 12, GIDC Naroda, Ahmedabad, Gujarat"
            className={`w-full px-3.5 py-2 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none transition-all resize-none ${
              errors.address
                ? 'bg-rose-50/30 border border-rose-300 text-slate-800 focus:ring-2 focus:ring-rose-400/20 focus:border-rose-500'
                : 'bg-slate-50 border border-slate-200 text-slate-800 focus:ring-2 focus:ring-forest-800/20 focus:border-forest-700'
            }`}
          />
          {errors.address && (
            <p className="text-xs text-rose-600 mt-1">{errors.address.message}</p>
          )}
        </div>

        {/* Phone Number */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Phone Number (10 Digits) <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">
              +91
            </span>
            <input
              {...register('phone')}
              type="tel"
              maxLength={10}
              placeholder="9876543210"
              className={`w-full pl-12 pr-4 py-2.5 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none transition-all ${
                errors.phone
                  ? 'bg-rose-50/30 border border-rose-300 text-slate-800 focus:ring-2 focus:ring-rose-400/20 focus:border-rose-500'
                  : 'bg-slate-50 border border-slate-200 text-slate-800 focus:ring-2 focus:ring-forest-800/20 focus:border-forest-700'
              }`}
            />
          </div>
          {errors.phone && (
            <p className="text-xs text-rose-600 mt-1">{errors.phone.message}</p>
          )}
        </div>

        {/* WhatsApp Number with "Same as phone" checkbox */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              WhatsApp Number <span className="text-rose-500">*</span>
            </label>
            <label className="flex items-center gap-1.5 text-xs text-forest-800 cursor-pointer font-medium">
              <input
                type="checkbox"
                {...register('sameAsPhone')}
                className="rounded border-slate-300 text-forest-800 focus:ring-forest-700"
              />
              <span>Same as phone</span>
            </label>
          </div>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">
              +91
            </span>
            <input
              {...register('whatsapp')}
              type="tel"
              maxLength={10}
              disabled={sameAsPhone}
              placeholder="9876543210"
              className={`w-full pl-12 pr-4 py-2.5 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none transition-all disabled:bg-slate-100 disabled:text-slate-500 ${
                errors.whatsapp
                  ? 'bg-rose-50/30 border border-rose-300 text-slate-800 focus:ring-2 focus:ring-rose-400/20 focus:border-rose-500'
                  : 'bg-slate-50 border border-slate-200 text-slate-800 focus:ring-2 focus:ring-forest-800/20 focus:border-forest-700'
              }`}
            />
          </div>
          {errors.whatsapp && (
            <p className="text-xs text-rose-600 mt-1">{errors.whatsapp.message}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Email Address <span className="text-rose-500">*</span>
          </label>
          <input
            {...register('email')}
            type="email"
            placeholder="e.g. contact@patelcotton.com"
            className={`w-full px-3.5 py-2.5 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none transition-all ${
              errors.email
                ? 'bg-rose-50/30 border border-rose-300 text-slate-800 focus:ring-2 focus:ring-rose-400/20 focus:border-rose-500'
                : 'bg-slate-50 border border-slate-200 text-slate-800 focus:ring-2 focus:ring-forest-800/20 focus:border-forest-700'
            }`}
          />
          {errors.email && (
            <p className="text-xs text-rose-600 mt-1">{errors.email.message}</p>
          )}
        </div>

        {/* Action Buttons */}
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
            className="px-5 py-2 text-sm font-semibold text-white bg-forest-900 hover:bg-forest-800 rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : isEditing ? (
              'Update Company'
            ) : (
              'Save Company'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

