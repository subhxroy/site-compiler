'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/firebase/auth-context';
import { AuthModal } from '@/components/auth-modal';

export function Navbar() {
  const { user, signOutUser, loading } = useAuth();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [imgError, setImgError] = useState(false);

  const avatarUrl = user?.photoURL || user?.providerData?.[0]?.photoURL || null;

  React.useEffect(() => {
    setImgError(false);
  }, [avatarUrl, user?.uid]);

  return (
    <>
      <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-[960px]">
        <header className="px-4 py-2.5 rounded-full border border-[#363739] bg-[#07080a]/85 backdrop-blur-[48px] flex items-center justify-between shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <div className="w-4 h-4 bg-[#ff6363] rotate-45 rounded-[2px]" />
            <span className="text-[13px] font-medium text-[#ffffff] tracking-tight">SiteCompiler</span>
            <span className="hidden sm:inline font-mono text-[10px] text-[#6a6b6c] bg-[#1b1c1e] px-2 py-0.5 rounded-[6px] border border-[#2f3031]">
              v1.104
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-[13px] font-medium text-[#9c9c9d]">
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

          <div className="flex items-center gap-2">
            {!loading && user ? (
              <div className="relative">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#1b1c1e] border border-[#363739] hover:border-[#ff6363]/50 transition-all cursor-pointer"
                >
                  {avatarUrl && !imgError ? (
                    <img
                      src={avatarUrl}
                      alt="Avatar"
                      referrerPolicy="no-referrer"
                      className="w-5 h-5 rounded-full object-cover"
                      onError={() => setImgError(true)}
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#ff6363] to-[#ff8c42] text-[#07080a] text-[10px] font-bold flex items-center justify-center shadow-inner">
                      {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-xs text-white max-w-[90px] truncate font-medium">
                    {user.displayName || user.email?.split('@')[0]}
                  </span>
                </button>

                {isMenuOpen && (
                  <div className="absolute right-0 mt-2 w-52 py-2 bg-[#07080a] border border-[#363739] rounded-[12px] shadow-2xl space-y-1 text-xs z-50 raycast-key-card">
                    <div className="flex items-center gap-2.5 px-3 py-2 border-b border-[#1b1c1e]">
                      {avatarUrl && !imgError ? (
                        <img
                          src={avatarUrl}
                          alt="Avatar"
                          referrerPolicy="no-referrer"
                          className="w-8 h-8 rounded-full object-cover border border-[#363739]"
                          onError={() => setImgError(true)}
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
                      onClick={() => setIsMenuOpen(false)}
                      className="block px-3 py-2 text-[#9c9c9d] hover:text-white hover:bg-[#1b1c1e] transition-colors"
                    >
                      Export History
                    </Link>
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
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
                className="px-3 py-1.5 rounded-[8px] bg-[#1b1c1e] text-[#ffffff] text-[13px] font-medium hover:bg-[#25272a] border border-[#363739] transition-colors cursor-pointer"
              >
                Sign In
              </button>
            )}

            <Link
              href="/#export-form"
              className="px-3.5 py-1.5 rounded-[8px] bg-[#e6e6e6] text-[#111214] text-[13px] font-medium hover:bg-white transition-colors flex items-center gap-1.5 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.12)]"
            >
              <span>Export Code</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
              </svg>
            </Link>
          </div>
        </header>
      </div>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </>
  );
}
