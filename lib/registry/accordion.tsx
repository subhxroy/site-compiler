import * as React from 'react';

interface AccordionItemProps {
  title: string;
  children: React.ReactNode;
  isOpen?: boolean;
  onToggle?: () => void;
  className?: string;
}

export function AccordionItem({ title, children, isOpen = false, onToggle, className = '' }: AccordionItemProps) {
  const [open, setOpen] = React.useState(isOpen);

  const handleToggle = () => {
    if (onToggle) {
      onToggle();
    } else {
      setOpen(!open);
    }
  };

  const isExpanded = onToggle ? isOpen : open;

  return (
    <div className={`border-b border-[#2a2c34] last:border-b-0 py-3 ${className}`}>
      <button
        onClick={handleToggle}
        className="flex w-full items-center justify-between py-2 text-left text-sm font-medium text-white transition-all hover:text-[#ff6363] cursor-pointer"
      >
        <span>{title}</span>
        <svg
          className={`h-4 w-4 text-[#8a8b8d] transition-transform duration-200 ${isExpanded ? 'rotate-180 text-[#ff6363]' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isExpanded && <div className="pt-2 pb-3 text-sm text-[#8a8b8d] leading-relaxed animate-in fade-in-50 duration-200">{children}</div>}
    </div>
  );
}

export function Accordion({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`w-full divide-y divide-[#2a2c34] rounded-xl border border-[#2a2c34] bg-[#111318] p-4 ${className}`}>{children}</div>;
}
