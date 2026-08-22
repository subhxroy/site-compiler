import * as React from 'react';

export interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}

export function FormField({ label, error, required, hint, children }: FormFieldProps) {
  return (
    <div className="w-full space-y-1.5">
      <label className="block text-xs font-medium text-[#e1e2e5]">
        {label}
        {required && <span className="text-[#ff6363] ml-1">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-[11px] text-[#8a8b8d]">{hint}</p>}
      {error && <p className="text-[11px] text-red-400">{error}</p>}
    </div>
  );
}

export function Form({
  onSubmit,
  children,
  className = '',
}: {
  onSubmit: (e: React.FormEvent) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <form onSubmit={onSubmit} className={`space-y-4 ${className}`}>
      {children}
    </form>
  );
}
