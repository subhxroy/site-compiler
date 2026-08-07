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

  const upiId = process.env.NEXT_PUBLIC_UPI_ID || 'contact.subhroy-1@okicici';
  const payeeName = process.env.NEXT_PUBLIC_UPI_NAME || 'Subh Roy';
  const bankDetails = process.env.NEXT_PUBLIC_UPI_BANK || 'State Bank of India 6322';

  // Build dynamic UPI Deep Link with payee, amount, currency, and job note
  const upiString = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(`SiteCompiler Export ${jobId}`)}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(upiString)}`;

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!senderAccount.trim() || !utrNumber.trim()) {
      setError('Please provide both Sender Name/App and 12-digit UTR/Transaction ID');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-md bg-[#0a0b0d] border border-[#2f3031] rounded-2xl p-5 sm:p-7 space-y-5 shadow-2xl text-left my-8">
        
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
            <span>⚡ Dynamic UPI Paywall</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Unlock Export Download</h2>
          <p className="text-xs text-[#9c9c9d] leading-relaxed">
            Scan dynamic QR or tap to pay <strong className="text-white">₹{amount} INR</strong> to unlock your {pageCount} page(s) ZIP bundle.
          </p>
        </div>

        {/* Dynamic GPay-style UPI Card */}
        <div className="bg-[#17181c] border border-[#2e2f33] rounded-2xl p-5 space-y-4 text-center shadow-inner">
          
          {/* Payee Header */}
          <div className="flex items-center justify-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shadow">
              SR
            </div>
            <div className="text-left">
              <div className="text-sm font-bold text-white leading-none">{payeeName}</div>
              <div className="text-[10px] font-mono text-[#8a8b8d]">Verified Merchant</div>
            </div>
            <div className="ml-auto px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs font-mono">
              ₹{amount}
            </div>
          </div>

          {/* Dynamic QR Code */}
          <div className="bg-white p-3 rounded-xl inline-block shadow-lg mx-auto relative group">
            <img
              src={qrCodeUrl}
              alt={`Scan QR to pay ₹${amount} to ${payeeName}`}
              className="w-44 h-44 object-contain mx-auto"
            />
          </div>

          <p className="text-[11px] text-[#9c9c9d] font-mono">
            Scan to pay <span className="text-emerald-400 font-bold">₹{amount}</span> with GPay, PhonePe, Paytm or any UPI app
          </p>

          {/* Bank Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#22242a] border border-[#33353c] text-xs font-mono text-[#b0b1b5]">
            <div className="w-4 h-4 rounded-full bg-cyan-500 text-black flex items-center justify-center text-[9px] font-bold">
              ₹
            </div>
            <span>{bankDetails}</span>
          </div>

          {/* UPI ID Copy Bar */}
          <div className="flex items-center justify-between bg-[#0e0f12] p-2.5 rounded-xl border border-[#2b2c30] text-xs font-mono">
            <div className="truncate pr-2">
              <span className="text-[#6a6b6c] mr-1.5">UPI ID:</span>
              <span className="text-white font-bold">{upiId}</span>
            </div>
            <button
              onClick={handleCopyUpi}
              className="px-2.5 py-1 rounded bg-[#ff6363]/10 hover:bg-[#ff6363]/20 border border-[#ff6363]/30 text-[#ff6363] text-[10px] transition-colors cursor-pointer shrink-0"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          {/* Direct Mobile Deep Link Button */}
          <a
            href={upiString}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all"
          >
            <span>📱 Tap to Pay ₹{amount} via UPI App</span>
          </a>
        </div>

        {/* Form Error */}
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400 font-mono">
            {error}
          </div>
        )}

        {/* Payment Verification Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1">
            <label className="text-[11px] font-mono text-[#9c9c9d] uppercase tracking-wider block">
              Sender Name / App *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Subh Roy (GPay / Paytm)"
              value={senderAccount}
              onChange={(e) => setSenderAccount(e.target.value)}
              className="w-full px-3.5 py-2.5 raycast-inset-input text-xs text-white placeholder-[#6a6b6c] outline-none rounded-lg focus:border-[#ff6363]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-mono text-[#9c9c9d] uppercase tracking-wider block">
              12-Digit UTR / Transaction ID *
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
