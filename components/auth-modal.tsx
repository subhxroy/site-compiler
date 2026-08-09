'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/firebase/auth-context';
import { isFirebaseConfigured } from '@/lib/firebase/config';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function getReadableErrorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code || '';
  const msg = (err as { message?: string })?.message || String(err);

  if (code.includes('auth/api-key-not-valid') || msg.includes('api-key-not-valid') || msg.includes('API key')) {
    return 'Firebase API key is not configured in Netlify environment variables. Please set NEXT_PUBLIC_FIREBASE_API_KEY in your Netlify site settings.';
  }
  if (code.includes('auth/invalid-credential') || code.includes('auth/user-not-found')) {
    return 'Account not found or password incorrect. If you are new, click "Sign up" below to create an account.';
  }
  if (code.includes('auth/email-already-in-use')) {
    return 'This email address is already registered. Please click "Sign in" below.';
  }
  if (code.includes('auth/wrong-password')) {
    return 'Incorrect password. Please check your password and try again.';
  }
  if (code.includes('auth/weak-password')) {
    return 'Password is too weak. Please use at least 6 characters.';
  }
  if (code.includes('auth/popup-closed-by-user')) {
    return 'Google Sign-in popup was closed before completing.';
  }
  if (code.includes('auth/operation-not-allowed')) {
    return 'Authentication method is not enabled in Firebase Console. Please enable Email/Password and Google sign-in in your Firebase Auth settings.';
  }
  return msg.replace(/^Firebase:\s*/, '').trim();
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    if (!isFirebaseConfigured) {
      setError('Firebase Web Auth credentials are not set on Netlify. Add NEXT_PUBLIC_FIREBASE_API_KEY to your environment variables.');
      return;
    }
    try {
      setError(null);
      setLoading(true);
      await signInWithGoogle();
      onClose();
    } catch (err: unknown) {
      setError(getReadableErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    if (!isFirebaseConfigured) {
      setError('Firebase Web Auth credentials are not set on Netlify. Add NEXT_PUBLIC_FIREBASE_API_KEY to your environment variables.');
      return;
    }
    try {
      setError(null);
      setLoading(true);
      if (isSignUp) {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
      onClose();
    } catch (err: unknown) {
      setError(getReadableErrorMessage(err));
      // Auto-suggest sign up if account not found
      if (!isSignUp && ((err as { code?: string })?.code?.includes('user-not-found') || (err as { code?: string })?.code?.includes('invalid-credential'))) {
        setIsSignUp(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-md p-6 raycast-key-card space-y-6 shadow-2xl border border-[#363739] bg-[#07080a]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#9c9c9d] hover:text-white transition-colors p-1"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Modal Header */}
        <div className="space-y-1.5 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[6px] bg-[#1b1c1e] border border-[#2f3031] text-[11px] font-mono text-[#ff6363] uppercase tracking-wider">
            SiteCompiler Account
          </div>
          <h2 className="text-2xl font-medium text-white">
            {isSignUp ? 'Create your Account' : 'Welcome Back'}
          </h2>
          <p className="text-xs text-[#9c9c9d]">
            Sign in to save your compiled sites, export history, and workspace settings.
          </p>
        </div>

        {error && (
          <div className="p-3 text-xs bg-red-500/15 border border-red-500/30 text-red-400 rounded-[8px] text-center leading-relaxed">
            {error}
          </div>
        )}

        {/* Google 1-Click Sign In */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-3 px-4 rounded-[10px] bg-[#1b1c1e] hover:bg-[#25272a] border border-[#363739] text-white text-xs font-medium transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        <div className="relative flex items-center justify-center">
          <div className="w-full border-t border-[#1b1c1e]" />
          <span className="absolute bg-[#07080a] px-3 font-mono text-[10px] text-[#6a6b6c] uppercase">or with email</span>
        </div>

        {/* Email Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[11px] font-mono text-[#6a6b6c] uppercase">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              className="w-full px-3.5 py-2.5 raycast-inset-input text-white text-xs outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-mono text-[#6a6b6c] uppercase">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 raycast-inset-input text-white text-xs outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 raycast-button-primary font-medium text-xs disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Authenticating…' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-[#1b1c1e]">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-xs text-[#9c9c9d] hover:text-white transition-colors"
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}
