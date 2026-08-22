import * as React from 'react';

export interface DropdownMenuItem {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  destructive?: boolean;
  disabled?: boolean;
}

export interface DropdownMenuProps {
  trigger: React.ReactNode;
  items: DropdownMenuItem[];
  align?: 'left' | 'right';
  className?: string;
}

export function DropdownMenu({ trigger, items, align = 'right', className = '' }: DropdownMenuProps) {
  const [open, setOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative inline-block text-left ${className}`} ref={menuRef}>
      <div onClick={() => setOpen(!open)}>{trigger}</div>

      {open && (
        <div
          className={`absolute z-50 mt-2 w-56 rounded-xl border border-[#2a2c34] bg-[#111318] p-1.5 text-[#e1e2e5] shadow-xl backdrop-blur-md animate-in fade-in-50 zoom-in-95 duration-150 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          <div className="flex flex-col space-y-0.5">
            {items.map((item, index) => (
              <button
                key={index}
                disabled={item.disabled}
                onClick={() => {
                  if (!item.disabled) {
                    item.onClick();
                    setOpen(false);
                  }
                }}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors text-left cursor-pointer ${
                  item.destructive
                    ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
                    : 'text-[#e1e2e5] hover:bg-[#17191f] hover:text-white'
                } ${item.disabled ? 'opacity-50 pointer-events-none' : ''}`}
              >
                {item.icon && <span className="w-4 h-4 text-current">{item.icon}</span>}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
