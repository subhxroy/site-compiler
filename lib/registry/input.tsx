import * as React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', type = 'text', error, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          type={type}
          className={`flex h-10 w-full rounded-lg border border-[#2a2c34] bg-[#17191f] px-3 py-2 text-sm text-[#e1e2e5] ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[#6a6b6c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6363] focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-all ${
            error ? 'border-red-500 focus-visible:ring-red-500' : ''
          } ${className}`}
          ref={ref}
          {...props}
        />
        {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';
