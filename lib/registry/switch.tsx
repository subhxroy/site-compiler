import * as React from 'react';

export interface SwitchProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
  className?: string;
}

export function Switch({
  checked = false,
  onCheckedChange,
  disabled = false,
  label,
  description,
  className = '',
}: SwitchProps) {
  const [isChecked, setIsChecked] = React.useState(checked);

  React.useEffect(() => {
    setIsChecked(checked);
  }, [checked]);

  const toggle = () => {
    if (disabled) return;
    const next = !isChecked;
    setIsChecked(next);
    onCheckedChange?.(next);
  };

  return (
    <div className={`flex items-start gap-3 select-none ${className}`}>
      <button
        type="button"
        role="switch"
        aria-checked={isChecked}
        disabled={disabled}
        onClick={toggle}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6363] disabled:cursor-not-allowed disabled:opacity-50 ${
          isChecked ? 'bg-[#ff6363]' : 'bg-[#2a2c34]'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
            isChecked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
      {(label || description) && (
        <div className="flex flex-col cursor-pointer" onClick={toggle}>
          {label && <span className="text-xs font-medium text-[#e1e2e5]">{label}</span>}
          {description && <span className="text-[11px] text-[#8a8b8d]">{description}</span>}
        </div>
      )}
    </div>
  );
}
