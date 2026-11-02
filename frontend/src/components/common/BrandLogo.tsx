import React from 'react';

interface BrandLogoProps {
  className?: string;
  iconOnly?: boolean;
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = '',
  iconOnly = false,
  variant = 'light',
  size = 'md',
}) => {
  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
    xl: 'w-14 h-14',
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
    xl: 'text-2xl',
  };

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {/* Golden Grain / Sprout Emblem matching the screenshot */}
      <div
        className={`${iconSizes[size]} rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 shadow-sm ring-1 ring-amber-300/30`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          className="w-3/5 h-3/5 text-white stroke-[2.2]"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Sprout & Grain stalks */}
          <path d="M12 22v-9" />
          <path d="M12 13a5 5 0 0 1 5-5c0 3-2 5-5 5Z" fill="currentColor" fillOpacity="0.4" />
          <path d="M12 9a5 5 0 0 0-5-5c0 3 2 5 5 5Z" fill="currentColor" fillOpacity="0.4" />
          <path d="M12 6a3 3 0 0 1 3-3c0 2-1 3-3 3Z" fill="currentColor" fillOpacity="0.7" />
        </svg>
      </div>

      {!iconOnly && (
        <div className="flex flex-col">
          <span
            className={`font-heading font-bold tracking-tight leading-tight ${
              variant === 'light' ? 'text-white' : 'text-slate-900'
            } ${textSizes[size]}`}
          >
            Jalaram Brokers
          </span>
          {size === 'xl' && (
            <span className="text-amber-400 text-xs tracking-widest font-semibold uppercase mt-0.5">
              Ahmedabad, Gujarat
            </span>
          )}
        </div>
      )}
    </div>
  );
};

