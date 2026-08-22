import * as React from 'react';

export interface PopoverProps {
  trigger: React.ReactNode;
  content: React.ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
}

export function Popover({ trigger, content, align = 'center', className = '' }: PopoverProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const popoverRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const alignments: Record<string, string> = {
    left: 'left-0',
    right: 'right-0',
    center: 'left-1/2 -translate-x-1/2',
  };

  return (
    <div className={`relative inline-block ${className}`} ref={popoverRef}>
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>

      {isOpen && (
        <div
          className={`absolute z-50 mt-2 w-72 rounded-xl border border-[#2a2c34] bg-[#111318] p-4 text-[#e1e2e5] shadow-xl backdrop-blur-md animate-in fade-in-50 zoom-in-95 duration-150 ${
            alignments[align] || alignments.center
          }`}
        >
          {content}
        </div>
      )}
    </div>
  );
}
