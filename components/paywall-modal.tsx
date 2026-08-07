'use client';

import React, { useState } from 'react';
import { getApiUrl } from '@/lib/api-config';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  url: string;
  pageCount: number;
  amount: number;
  userEmail?: string;
  onPaymentSubmitted: () => void;
}

export function PaywallModal({
  isOpen,
  onClose,
  jobId,
  url,
  pageCount,
  amount,
  userEmail,
  onPaymentSubmitted,
}: PaywallModalProps) {
  const [senderAccount, setSenderAccount] = useState('');
  const [utrNumber, setUtrNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const upiId = process.env.NEXT_PUBLIC_UPI_ID || 'subhankarroy@upi';
  const upiString = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=SiteCompiler&am=${amount}&cu=INR`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiString)}`;

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!senderAccount.trim() || !utrNumber.trim()) {
      setError('Please provide both Account Name and UTR/Transaction ID');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const res = await fetch(getApiUrl('/api/export/payment'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          url,
          pageCount,
          amount,
          senderAccount: senderAccount.trim(),
          utrNumber: utrNumber.trim(),
          userEmail,
        }),
      });

      const data = await res.json();
      if (res.ok && data.status === 'ok') {
        onPaymentSubmitted();
        onClose();
      } else {
        setError(data.error || 'Failed to submit payment verification');
      }
    } catch (err: any) {
      setError('Network error submitting payment verification');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-[#0a0b0d] border border-[#2f3031] rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl text-left">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#6a6b6c] hover:text-white transition-colors cursor-pointer"
        >
          ✕
        </button>

        {/* Header */}
        <div className="space-y-1.5 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ff6363]/10 border border-[#ff6363]/30 text-[11px] font-mono text-[#ff6363] uppercase tracking-wider">
            <span>⚡ Server Cost Paywall</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Unlock Export Download</h2>
          <p className="text-xs text-[#9c9c9d] leading-relaxed">
            Minimal charge required strictly for backend server hosting & Playwright browser rendering.
          </p>
        </div>

        {/* Summary Details */}
        <div className="raycast-key-card p-4 rounded-xl space-y-2 text-xs font-mono bg-[#111214]">
          <div className="flex justify-between text-[#9c9c9d]">
            <span>Captured Pages:</span>
            <span className="text-white font-bold">{pageCount} page(s)</span>
          </div>
          <div className="flex justify-between text-[#9c9c9d]">
            <span>Target Site:</span>
            <span className="text-[#ff6363] truncate max-w-[200px]">{url}</span>
          </div>
          <div className="border-t border-[#2f3031] pt-2 flex justify-between text-sm">
            <span className="text-white font-medium">Total Amount Due:</span>
            <span className="text-emerald-400 font-bold text-lg">₹{amount} INR</span>
          </div>
        </div>

        {/* UPI QR & Payment Details */}
        <div className="space-y-3 text-center">
          <div className="bg-white p-3 rounded-xl inline-block shadow-lg mx-auto">
            <img
              src={qrCodeUrl}
              alt={`Scan QR to pay ₹${amount}`}
              className="w-40 h-40 object-contain mx-auto"
            />
          </div>

          <div className="flex items-center justify-center gap-2 text-xs font-mono">
            <span className="text-[#9c9c9d]">UPI ID:</span>
            <span className="text-white font-bold bg-[#1b1c1e] px-2.5 py-1 rounded border border-[#2f3031]">
              {upiId}
            </span>
            <button
              onClick={handleCopyUpi}
              className="px-2 py-1 rounded bg-[#ff6363]/10 hover:bg-[#ff6363]/20 border border-[#ff6363]/30 text-[#ff6363] text-[10px] transition-colors cursor-pointer"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Form Error */}
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400 font-mono">
            {error}
          </div>
        )}

        {/* Payment Verification Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[11px] font-mono text-[#9c9c9d] uppercase tracking-wider block">
              Sender Account / App Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Subhankar Roy (GPay / Paytm)"
              value={senderAccount}
              onChange={(e) => setSenderAccount(e.target.value)}
              className="w-full px-3.5 py-2.5 raycast-inset-input text-xs text-white placeholder-[#6a6b6c] outline-none rounded-lg focus:border-[#ff6363]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-mono text-[#9c9c9d] uppercase tracking-wider block">
              UTR / Transaction ID *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 421890123456"
              value={utrNumber}
              onChange={(e) => setUtrNumber(e.target.value)}
              className="w-full px-3.5 py-2.5 raycast-inset-input text-xs text-white placeholder-[#6a6b6c] outline-none rounded-lg focus:border-[#ff6363]"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-[#ff6363] hover:bg-[#ff4f4f] text-black font-semibold text-xs transition-all shadow-lg shadow-[#ff6363]/20 disabled:opacity-50 cursor-pointer"
          >
            {submitting ? 'Submitting for Admin Approval...' : 'Submit Payment for Admin Approval'}
          </button>
        </form>

        <p className="text-[10px] text-[#6a6b6c] font-mono text-center">
          * Admin approves exports manually upon verifying UTR transaction.
        </p>

      </div>
    </div>
  );
}
