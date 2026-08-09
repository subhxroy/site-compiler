'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth, UserExportRecord } from '@/lib/firebase/auth-context';
import { getApiUrl } from '@/lib/api-config';
import { AuthModal } from '@/components/auth-modal';

export default function ExportHistoryPage() {
  const { user, loading, getUserExports } = useAuth();
  const [exports, setExports] = useState<UserExportRecord[]>([]);
  const [fetching, setFetching] = useState(true);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFetching(true);
      getUserExports()
        .then((records) => setExports(records))
        .finally(() => setFetching(false));
    } else {
      setFetching(false);
    }
  }, [user, getUserExports]);

  return (
    <main className="pt-28 pb-24">
      <div className="max-w-[1000px] mx-auto px-6 space-y-10">
        
        {/* Page Header */}
        <div className="space-y-3 border-b border-[#1b1c1e] pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[6px] bg-[#1b1c1e] border border-[#2f3031] text-[11px] font-mono text-[#ff6363] uppercase tracking-wider">
            Firebase Account Cockpit
          </div>
          <h1 className="text-3xl sm:text-4xl font-normal text-white">Your Saved Site Exports</h1>
          <p className="text-sm text-[#9c9c9d]">
            View and download your previously compiled websites linked to your Firebase account.
          </p>
        </div>

        {/* Content Section */}
        {loading || fetching ? (
          <div className="raycast-key-card p-12 text-center text-xs text-[#9c9c9d] font-mono animate-pulse">
            Loading your saved compilation history from Firebase Firestore…
          </div>
        ) : !user ? (
          <div className="raycast-key-card p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#1b1c1e] border border-[#2f3031] text-[#ff6363] flex items-center justify-center mx-auto text-xl font-mono">
              ⚡
            </div>
            <h2 className="text-xl font-medium text-white">Sign in to save export history</h2>
            <p className="text-xs text-[#9c9c9d] max-w-sm mx-auto">
              Create an account or sign in with Google to automatically save your website crawls, ZIP downloads, and code configurations.
            </p>
            <button
              onClick={() => setIsAuthOpen(true)}
              className="raycast-button-primary px-6 py-2.5 text-xs font-medium cursor-pointer"
            >
              Sign In / Create Account
            </button>
          </div>
        ) : exports.length === 0 ? (
          <div className="raycast-key-card p-12 text-center space-y-4">
            <div className="w-10 h-10 rounded-full bg-[#1b1c1e] text-[#9c9c9d] flex items-center justify-center mx-auto">
              📦
            </div>
            <h2 className="text-lg font-medium text-white">No exports saved yet</h2>
            <p className="text-xs text-[#9c9c9d]">
              Export your first website using SiteCompiler and it will automatically appear here in your account dashboard.
            </p>
            <Link
              href="/"
              className="inline-block raycast-button-primary px-5 py-2 text-xs font-medium"
            >
              Start New Export
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {exports.map((rec) => (
              <div
                key={rec.id || rec.jobId}
                className="raycast-key-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white text-sm truncate">
                      {rec.title || rec.url}
                    </span>
                    <span className="font-mono text-[10px] text-[#ff6363] bg-[#ff6363]/10 px-2 py-0.5 rounded uppercase border border-[#ff6363]/20">
                      {rec.format}
                    </span>
                  </div>
                  <div className="text-xs text-[#6a6b6c] truncate">{rec.url}</div>
                  <div className="font-mono text-[10px] text-[#6a6b6c]">
                    Job ID: {rec.jobId} · {new Date(rec.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-none">
                  {rec.zipSizeKb && (
                    <span className="font-mono text-xs text-[#9c9c9d]">{rec.zipSizeKb} KB</span>
                  )}
                  <a
                    href={getApiUrl(`/api/job/${rec.jobId}/download`)}
                    className="raycast-button-primary px-4 py-2 text-xs flex items-center gap-1.5"
                  >
                    <span>Download ZIP</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </main>
  );
}
