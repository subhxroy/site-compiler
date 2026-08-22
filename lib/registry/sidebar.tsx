import * as React from 'react';

export interface SidebarItem {
  id: string;
  label: string;
  href?: string;
  icon?: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}

export interface SidebarProps {
  items: SidebarItem[];
  header?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function Sidebar({ items, header, footer, className = '' }: SidebarProps) {
  return (
    <aside className={`flex h-full w-64 flex-col border-r border-[#2a2c34] bg-[#0d0e12] p-4 text-[#e1e2e5] ${className}`}>
      {header && <div className="mb-6">{header}</div>}

      <nav className="flex-1 space-y-1.5 overflow-y-auto">
        {items.map((item) => {
          const content = (
            <div className="flex items-center gap-3">
              {item.icon && <span className="w-4 h-4 text-current">{item.icon}</span>}
              <span>{item.label}</span>
            </div>
          );

          const itemClass = `flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium transition-colors cursor-pointer ${
            item.active
              ? 'bg-[#17191f] text-white border border-[#2a2c34] shadow-sm'
              : 'text-[#8a8b8d] hover:bg-[#17191f]/50 hover:text-white'
          }`;

          if (item.href) {
            return (
              <a key={item.id} href={item.href} className={itemClass}>
                {content}
              </a>
            );
          }

          return (
            <button key={item.id} onClick={item.onClick} className={itemClass}>
              {content}
            </button>
          );
        })}
      </nav>

      {footer && <div className="mt-auto pt-4 border-t border-[#2a2c34]">{footer}</div>}
    </aside>
  );
}
