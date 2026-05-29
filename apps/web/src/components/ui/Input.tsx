import React from 'react';
import { clsx } from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, icon, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-[#0F0E0C] mb-2">
            {label}
            {props.required && <span className="text-[#f5622e]">*</span>}
          </label>
        )}
        <div className="relative">
          {icon && <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#6B6860]">{icon}</div>}
          <input
            ref={ref}
            className={clsx(
              'w-full px-4 py-2 rounded-lg border transition-colors',
              icon ? 'pl-10' : '',
              error
                ? 'border-red-500 focus:ring-2 focus:ring-red-500 focus:border-transparent'
                : 'border-[#E8E4DC] focus:ring-2 focus:ring-[#f5622e] focus:border-transparent',
              'bg-white text-[#0F0E0C] placeholder-[#6B6860]',
              'disabled:bg-[#F8F7F4] disabled:cursor-not-allowed disabled:text-[#6B6860]',
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        {helperText && !error && <p className="mt-1 text-sm text-[#6B6860]">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'accent';
  size?: 'sm' | 'md';
  children: React.ReactNode;
}

const badgeVariants = {
  default: 'bg-[#FEF0EB] text-[#f5622e]',
  success: 'bg-green-50 text-green-700',
  warning: 'bg-yellow-50 text-yellow-700',
  error: 'bg-red-50 text-red-700',
  accent: 'bg-blue-50 text-blue-700',
};

const badgeSizes = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'default', size = 'md', className, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={clsx(
          'inline-block font-medium rounded-full',
          badgeVariants[variant],
          badgeSizes[size],
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

interface TagProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  onRemove?: () => void;
  icon?: React.ReactNode;
}

export const Tag = React.forwardRef<HTMLDivElement, TagProps>(
  ({ label, onRemove, icon, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx(
          'inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FEF0EB] text-[#f5622e] text-sm',
          className
        )}
        {...props}
      >
        {icon && <span className="text-xs">{icon}</span>}
        <span>{label}</span>
        {onRemove && (
          <button
            onClick={onRemove}
            className="ml-1 hover:text-[#e04a1a] transition-colors"
            aria-label={`Remove ${label}`}
          >
            ×
          </button>
        )}
      </div>
    );
  }
);

Tag.displayName = 'Tag';
