import React, { useEffect } from 'react';
import { clsx } from 'clsx';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnBackdrop?: boolean;
}

const sizes = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  actions,
  size = 'md',
  closeOnBackdrop = true,
}) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" />

      {/* Modal */}
      <div
        className={clsx(
          'relative bg-white rounded-xl shadow-xl max-w-full w-full mx-4',
          sizes[size],
          'animate-scale-in'
        )}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between p-6 border-b border-[#E8E4DC]">
            <h2 className="text-xl font-semibold text-[#0F0E0C]">{title}</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-[#FEF0EB] rounded-lg transition-colors"
              aria-label="Close"
            >
              <svg className="w-6 h-6 text-[#0F0E0C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {children}
        </div>

        {/* Footer */}
        {actions && (
          <div className="flex gap-3 justify-end p-6 border-t border-[#E8E4DC]">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDangerous = false,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      size="sm"
      closeOnBackdrop={false}
      actions={
        <>
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-[#E8E4DC] text-[#0F0E0C] hover:bg-[#FEF0EB] transition-colors font-medium"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={clsx(
              'px-4 py-2 rounded-lg text-white font-medium transition-colors',
              isDangerous
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-[#f5622e] hover:bg-[#e04a1a]'
            )}
          >
            {confirmText}
          </button>
        </>
      }
    >
      <p className="text-[#6B6860]">{message}</p>
    </Modal>
  );
};

export default Modal;
