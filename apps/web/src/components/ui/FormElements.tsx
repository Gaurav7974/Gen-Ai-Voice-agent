import React from 'react';
import { clsx } from 'clsx';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-[#0F0E0C] mb-2">
            {label}
            {props.required && <span className="text-[#f5622e]">*</span>}
          </label>
        )}
        <select
          ref={ref}
          className={clsx(
            'w-full px-4 py-2 rounded-lg border transition-colors',
            error
              ? 'border-red-500 focus:ring-2 focus:ring-red-500 focus:border-transparent'
              : 'border-[#E8E4DC] focus:ring-2 focus:ring-[#f5622e] focus:border-transparent',
            'bg-white text-[#0F0E0C]',
            'disabled:bg-[#F8F7F4] disabled:cursor-not-allowed disabled:text-[#6B6860]',
            className
          )}
          {...props}
        >
          <option value="">Select an option</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-[#0F0E0C] mb-2">
            {label}
            {props.required && <span className="text-[#f5622e]">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          className={clsx(
            'w-full px-4 py-2 rounded-lg border transition-colors resize-none',
            error
              ? 'border-red-500 focus:ring-2 focus:ring-red-500 focus:border-transparent'
              : 'border-[#E8E4DC] focus:ring-2 focus:ring-[#f5622e] focus:border-transparent',
            'bg-white text-[#0F0E0C] placeholder-[#6B6860]',
            'disabled:bg-[#F8F7F4] disabled:cursor-not-allowed disabled:text-[#6B6860]',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

interface ToggleProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Toggle = React.forwardRef<HTMLInputElement, ToggleProps>(
  ({ label, className, ...props }, ref) => {
    return (
      <div className="flex items-center gap-3">
        <input
          ref={ref}
          type="checkbox"
          className={clsx(
            'w-5 h-5 rounded cursor-pointer accent-[#f5622e] focus:ring-2 focus:ring-[#f5622e]',
            className
          )}
          {...props}
        />
        {label && <label className="text-sm text-[#0F0E0C] cursor-pointer">{label}</label>}
      </div>
    );
  }
);

Toggle.displayName = 'Toggle';

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg';
  fullPage?: boolean;
}

export const Loader: React.FC<LoaderProps> = ({ size = 'md', fullPage = false }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  const spinner = (
    <svg
      className={`${sizeClasses[size]} animate-spin text-[#f5622e]`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-80 z-50">
        {spinner}
      </div>
    );
  }

  return <div className="flex items-center justify-center">{spinner}</div>;
};

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
}

const alertVariants = {
  info: 'bg-blue-50 border-blue-300 text-blue-800',
  success: 'bg-green-50 border-green-300 text-green-800',
  warning: 'bg-yellow-50 border-yellow-300 text-yellow-800',
  error: 'bg-red-50 border-red-300 text-red-800',
};

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ variant = 'info', title, onClose, className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx(
          'p-4 rounded-lg border',
          alertVariants[variant],
          className
        )}
        {...props}
      >
        <div className="flex items-start justify-between">
          <div>
            {title && <h4 className="font-medium">{title}</h4>}
            <div className="text-sm">{children}</div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="ml-2 font-medium hover:opacity-75 transition-opacity"
            >
              ×
            </button>
          )}
        </div>
      </div>
    );
  }
);

Alert.displayName = 'Alert';
