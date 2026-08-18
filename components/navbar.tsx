'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/firebase/auth-context';
import { AuthModal } from '@/components/auth-modal';

export function Navbar() {
  const { user, signOutUser, loading } = useAuth();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);

  const avatarUrl = user?.photoURL || user?.providerData?.[0]?.photoURL || null;
  const hasImgError = !!avatarUrl && failedAvatarUrl === avatarUrl;

  return (
    <>
      <div className="fixed top-3 sm:top-5 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-1.25rem)] sm:w-[calc(100%-2rem)] max-w-[960px]">
        <header className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-full border border-[#363739] bg-[#07080a]/90 backdrop-blur-[48px] flex items-center justify-between shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          <Link href="/" className="flex items-center gap-2 sm:gap-3 hover:opacity-90 transition-opacity shrink-0">
            <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 bg-[#ff6363] rotate-45 rounded-[2px]" />
            <span className="text-xs sm:text-[13px] font-medium text-[#ffffff] tracking-tight">SiteCompiler</span>
            <span className="hidden md:inline font-mono text-[10px] text-[#6a6b6c] bg-[#1b1c1e] px-2 py-0.5 rounded-[6px] border border-[#2f3031]">
              v1.104
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-5 lg:gap-6 text-[13px] font-medium text-[#9c9c9d]">
            <Link href="/features" className="hover:text-white transition-colors">
              Features
            </Link>
            <Link href="/pricing" className="hover:text-white transition-colors">
              Pricing
            </Link>
            <Link href="/framer-export" className="hover:text-white transition-colors">
              Exports
            </Link>
            <Link href="/history" className="hover:text-white transition-colors">
              Saved History
            </Link>
            <Link href="/blog" className="hover:text-white transition-colors">
              Blog
            </Link>
            <Link href="/docs" className="hover:text-white transition-colors">
              Docs
            </Link>
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {!loading && user ? (
              <div className="relative">
                <button
                  onClick={() => {
                    setIsUserMenuOpen(!isUserMenuOpen);
                    setIsMobileNavOpen(false);
                  }}
                  className="flex items-center gap-1.5 sm:gap-2 p-1 sm:px-2.5 sm:py-1 rounded-full bg-[#1b1c1e] border border-[#363739] hover:border-[#ff6363]/50 transition-all cursor-pointer"
                  title={user.displayName || user.email || 'User Account'}
                >
                  {avatarUrl && !hasImgError ? (
                    <img
                      key={avatarUrl}
                      src={avatarUrl}
                      alt="Avatar"
                      referrerPolicy="no-referrer"
                      className="w-5 h-5 rounded-full object-cover shrink-0"
                      onError={() => setFailedAvatarUrl(avatarUrl)}
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#ff6363] to-[#ff8c42] text-[#07080a] text-[10px] font-bold flex items-center justify-center shadow-inner shrink-0">
                      {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-xs text-white max-w-[65px] sm:max-w-[90px] truncate font-medium hidden xs:inline">
                    {user.displayName || user.email?.split('@')[0]}
                  </span>
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-52 py-2 bg-[#07080a] border border-[#363739] rounded-[12px] shadow-2xl space-y-1 text-xs z-50 raycast-key-card">
                    <div className="flex items-center gap-2.5 px-3 py-2 border-b border-[#1b1c1e]">
                      {avatarUrl && !hasImgError ? (
                        <img
                          key={avatarUrl}
                          src={avatarUrl}
                          alt="Avatar"
                          referrerPolicy="no-referrer"
                          className="w-8 h-8 rounded-full object-cover border border-[#363739]"
                          onError={() => setFailedAvatarUrl(avatarUrl)}
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#ff6363] to-[#ff8c42] text-[#07080a] text-xs font-bold flex items-center justify-center shadow-inner shrink-0">
                          {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="overflow-hidden">
                        <div className="text-white font-medium truncate">{user.displayName || 'User'}</div>
                        <div className="text-[10px] text-[#6a6b6c] truncate">{user.email}</div>
                      </div>
                    </div>
                    <Link
                      href="/history"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="block px-3 py-2 text-[#9c9c9d] hover:text-white hover:bg-[#1b1c1e] transition-colors"
                    >
                      Export History
                    </Link>
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        signOutUser();
                      }}
                      className="w-full text-left px-3 py-2 text-red-400 hover:bg-[#1b1c1e] transition-colors cursor-pointer"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setIsAuthOpen(true)}
                className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-[8px] bg-[#1b1c1e] text-[#ffffff] text-xs sm:text-[13px] font-medium hover:bg-[#25272a] border border-[#363739] transition-colors cursor-pointer shrink-0"
              >
                Sign In
              </button>
            )}

            <Link
              href="/#export-form"
              className="px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-[8px] bg-[#e6e6e6] text-[#111214] text-xs sm:text-[13px] font-medium hover:bg-white transition-colors flex items-center gap-1 sm:gap-1.5 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.12)] shrink-0"
            >
              <span className="hidden xs:inline">Export Code</span>
              <span className="xs:hidden">Export</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
              </svg>
            </Link>

            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => {
                setIsMobileNavOpen(!isMobileNavOpen);
                setIsUserMenuOpen(false);
              }}
              className="md:hidden p-1.5 rounded-[8px] text-[#9c9c9d] hover:text-white hover:bg-[#1b1c1e] border border-[#2f3031] transition-colors cursor-pointer"
              aria-label="Toggle Menu"
            >
              {isMobileNavOpen ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </header>

        {/* Mobile Navigation Dropdown Menu */}
        {isMobileNavOpen && (
          <div className="md:hidden mt-2 p-3 bg-[#07080a]/95 border border-[#363739] rounded-2xl shadow-2xl backdrop-blur-2xl space-y-2 raycast-key-card animate-fadeIn">
            <div className="grid grid-cols-2 gap-1.5 text-xs font-medium">
              <Link
                href="/features"
                onClick={() => setIsMobileNavOpen(false)}
                className="px-3 py-2 rounded-lg bg-[#111214] text-[#9c9c9d] hover:text-white hover:bg-[#1b1c1e] transition-colors"
              >
                Features
              </Link>
              <Link
                href="/pricing"
                onClick={() => setIsMobileNavOpen(false)}
                className="px-3 py-2 rounded-lg bg-[#111214] text-[#9c9c9d] hover:text-white hover:bg-[#1b1c1e] transition-colors"
              >
                Pricing
              </Link>
              <Link
                href="/framer-export"
                onClick={() => setIsMobileNavOpen(false)}
                className="px-3 py-2 rounded-lg bg-[#111214] text-[#9c9c9d] hover:text-white hover:bg-[#1b1c1e] transition-colors"
              >
                Exports
              </Link>
              <Link
                href="/history"
                onClick={() => setIsMobileNavOpen(false)}
                className="px-3 py-2 rounded-lg bg-[#111214] text-[#9c9c9d] hover:text-white hover:bg-[#1b1c1e] transition-colors"
              >
                Saved History
              </Link>
              <Link
                href="/blog"
                onClick={() => setIsMobileNavOpen(false)}
                className="px-3 py-2 rounded-lg bg-[#111214] text-[#9c9c9d] hover:text-white hover:bg-[#1b1c1e] transition-colors"
              >
                Blog
              </Link>
              <Link
                href="/docs"
                onClick={() => setIsMobileNavOpen(false)}
                className="px-3 py-2 rounded-lg bg-[#111214] text-[#9c9c9d] hover:text-white hover:bg-[#1b1c1e] transition-colors"
              >
                Docs
              </Link>
            </div>
          </div>
        )}
      </div>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </>
  );
}
