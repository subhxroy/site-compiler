import * as React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'glow';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'default', size = 'default', isLoading = false, children, disabled, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none';

    const variants: Record<string, string> = {
      default: 'bg-[#ff6363] text-white hover:bg-[#ff7575] active:scale-[0.98] shadow-md shadow-[#ff6363]/20',
      destructive: 'bg-red-500 text-white hover:bg-red-600 active:scale-[0.98]',
      outline: 'border border-[#2a2c34] bg-transparent hover:bg-[#17191f] text-[#e1e2e5]',
      secondary: 'bg-[#17191f] text-[#e1e2e5] hover:bg-[#20232a] border border-[#2a2c34]',
      ghost: 'hover:bg-[#17191f] text-[#8a8b8d] hover:text-[#e1e2e5]',
      link: 'text-[#ff6363] underline-offset-4 hover:underline p-0 h-auto',
      glow: 'bg-gradient-to-r from-[#ff6363] to-[#ff8f8f] text-white shadow-[0_0_20px_rgba(255,99,99,0.35)] hover:shadow-[0_0_30px_rgba(255,99,99,0.5)]',
    };

    const sizes: Record<string, string> = {
      default: 'h-10 px-4 py-2',
      sm: 'h-8 rounded-md px-3 text-xs',
      lg: 'h-12 rounded-xl px-8 text-base font-semibold',
      icon: 'h-10 w-10 p-0',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variants[variant] || variants.default} ${sizes[size] || sizes.default} ${className}`}
        {...props}
      >
        {isLoading ? (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : null}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
