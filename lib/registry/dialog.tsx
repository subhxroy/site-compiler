import * as React from 'react';

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function Dialog({ isOpen, onClose, title, description, children, className = '' }: DialogProps) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />

      {/* Modal Container */}
      <div
        className={`relative z-50 w-full max-w-lg rounded-2xl border border-[#2a2c34] bg-[#111318] p-6 text-[#e1e2e5] shadow-2xl animate-in zoom-in-95 duration-200 ${className}`}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-[#8a8b8d] hover:bg-[#17191f] hover:text-white transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {title && <h2 className="text-xl font-semibold text-white tracking-tight">{title}</h2>}
        {description && <p className="mt-1.5 text-sm text-[#8a8b8d]">{description}</p>}

        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}
