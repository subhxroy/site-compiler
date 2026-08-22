import * as React from 'react';

export interface NavItem {
  label: string;
  href: string;
  external?: boolean;
}

export interface NavbarProps {
  brandName?: string;
  logo?: React.ReactNode;
  items: NavItem[];
  actionButton?: React.ReactNode;
  className?: string;
}

export function Navbar({ brandName = 'SiteCompiler', logo, items, actionButton, className = '' }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <header className={`sticky top-0 z-40 w-full border-b border-[#2a2c34] bg-[#0d0e12]/80 backdrop-blur-xl ${className}`}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-3">
          {logo || <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-[#ff6363] to-[#ff8f8f]" />}
          <span className="text-base font-bold tracking-tight text-white">{brandName}</span>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {items.map((item, idx) => (
            <a
              key={idx}
              href={item.href}
              target={item.external ? '_blank' : undefined}
              rel={item.external ? 'noopener noreferrer' : undefined}
              className="text-xs font-medium text-[#8a8b8d] hover:text-white transition-colors"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Right Action */}
        <div className="hidden md:flex items-center gap-3">{actionButton}</div>

        {/* Mobile Hamburger */}
        <div className="flex md:hidden">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-[#8a8b8d] hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileMenuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#2a2c34] bg-[#111318] px-4 py-6 space-y-4">
          <div className="flex flex-col space-y-3">
            {items.map((item, idx) => (
              <a
                key={idx}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-medium text-[#8a8b8d] hover:text-white"
              >
                {item.label}
              </a>
            ))}
          </div>
          {actionButton && <div className="pt-4 border-t border-[#2a2c34]">{actionButton}</div>}
        </div>
      )}
    </header>
  );
}
