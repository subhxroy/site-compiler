import * as React from 'react';

export interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  side?: 'left' | 'right';
  children: React.ReactNode;
  className?: string;
}

export function Sheet({ isOpen, onClose, title, side = 'right', children, className = '' }: SheetProps) {
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sideAnimation = side === 'right' ? 'slide-in-from-right' : 'slide-in-from-left';
  const sidePosition = side === 'right' ? 'right-0' : 'left-0';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200" onClick={onClose} />

      {/* Sheet panel */}
      <div
        className={`absolute inset-y-0 ${sidePosition} flex max-w-full pl-10 animate-in ${sideAnimation} duration-300`}
      >
        <div className={`w-screen max-w-md border-l border-[#2a2c34] bg-[#111318] p-6 text-[#e1e2e5] shadow-2xl flex flex-col ${className}`}>
          <div className="flex items-center justify-between pb-4 border-b border-[#2a2c34]">
            {title && <h3 className="text-base font-semibold text-white">{title}</h3>}
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-[#8a8b8d] hover:bg-[#17191f] hover:text-white transition-colors cursor-pointer"
            >
              ×
            </button>
          </div>

          <div className="mt-4 flex-1 overflow-y-auto">{children}</div>
        </div>
      </div>
    </div>
  );
}
