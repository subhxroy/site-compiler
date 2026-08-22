import * as React from 'react';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({ currentPage, totalPages, onPageChange, className = '' }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className={`flex items-center justify-center space-x-2 ${className}`}>
      <button
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        className="rounded-lg border border-[#2a2c34] bg-[#17191f] px-3 py-1.5 text-xs text-[#8a8b8d] hover:text-white disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
      >
        Previous
      </button>

      <div className="flex items-center space-x-1">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`h-8 w-8 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              p === currentPage
                ? 'bg-[#ff6363] text-white'
                : 'border border-[#2a2c34] bg-[#17191f] text-[#8a8b8d] hover:text-white'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      <button
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className="rounded-lg border border-[#2a2c34] bg-[#17191f] px-3 py-1.5 text-xs text-[#8a8b8d] hover:text-white disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
      >
        Next
      </button>
    </div>
  );
}
