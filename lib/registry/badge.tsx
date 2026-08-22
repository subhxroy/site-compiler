import * as React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';
}

export function Badge({ className = '', variant = 'default', ...props }: BadgeProps) {
  const base = 'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2';

  const variants: Record<string, string> = {
    default: 'border-transparent bg-[#ff6363] text-white',
    secondary: 'border-transparent bg-[#17191f] text-[#e1e2e5] border border-[#2a2c34]',
    destructive: 'border-transparent bg-red-500/20 text-red-400 border border-red-500/30',
    outline: 'text-[#e1e2e5] border-[#2a2c34]',
    success: 'border-transparent bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    warning: 'border-transparent bg-amber-500/20 text-amber-300 border border-amber-500/30',
  };

  return <div className={`${base} ${variants[variant] || variants.default} ${className}`} {...props} />;
}
