'use client';

import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from './config';

export interface UserExportRecord {
  id?: string;
  jobId: string;
  url: string;
  format: 'html' | 'react' | 'nextjs';
  title?: string;
  createdAt: number;
  downloadUrl?: string;
  zipSizeKb?: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  userRole: string;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  saveUserExport: (exportData: UserExportRecord) => Promise<void>;
  getUserExports: () => Promise<UserExportRecord[]>;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  userRole: 'user',
  signInWithGoogle: async () => {},
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  signOutUser: async () => {},
  saveUserExport: async () => {},
  getUserExports: async () => [],
  getIdToken: async () => null,
});

function checkIsAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const e = email.toLowerCase().trim();
  const allowlist = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || 'contact.subhroy-1@gmail.com,subhroy,whysaurjya')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return allowlist.some((a) => e.includes(a));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState('user');

  useEffect(() => {
    // Safety fallback timer to prevent infinite loading spinner if Firebase auth hangs
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2500);

    let unsubscribe = () => {};

    try {
      if (auth) {
        unsubscribe = onAuthStateChanged(
        auth,
        async (currentUser: User | null) => {
          clearTimeout(timer);
          setUser(currentUser);
          setLoading(false);

          if (currentUser) {
            const clientIsAdmin = checkIsAdminEmail(currentUser.email);
            if (clientIsAdmin) {
              setIsAdmin(true);
              setUserRole('admin');
            }

            // Sync user profile to Next.js API route (/api/user/sync).
            try {
              const idToken = await currentUser.getIdToken(true);
              const res = await fetch('/api/user/sync', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${idToken}`,
                },
                body: JSON.stringify({
                  displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
                  photoURL: currentUser.photoURL || null,
                }),
              });
              if (res.ok) {
                const data = await res.json();
                if (data.isAdmin || data.role === 'admin' || clientIsAdmin) {
                  setIsAdmin(true);
                  setUserRole('admin');
                } else {
                  setIsAdmin(false);
                  setUserRole(data.role || 'user');
                }
              }
            } catch {
              // Silently handle offline/network sync errors
            }
          } else {
            setIsAdmin(false);
            setUserRole('user');
          }
        },
        (error) => {
          clearTimeout(timer);
          // Catch Database is closing/hidden errors silently without breaking React tree
          if (!error?.message?.includes('closing')) {
            console.error('[Firebase Auth Error]', error);
          }
        }
      );
    }
  } catch {
      clearTimeout(timer);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
    }

    return () => {
      clearTimeout(timer);
      try { unsubscribe(); } catch {}
    };
  }, []);

  const signInWithGoogle = async () => {
    if (!auth) throw new Error('Firebase Auth is not configured. Please set NEXT_PUBLIC_FIREBASE_API_KEY.');
    await signInWithPopup(auth, googleProvider);
  };

  const signInWithEmail = async (email: string, pass: string) => {
    if (!auth) throw new Error('Firebase Auth is not configured. Please set NEXT_PUBLIC_FIREBASE_API_KEY.');
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const signUpWithEmail = async (email: string, pass: string) => {
    if (!auth) throw new Error('Firebase Auth is not configured. Please set NEXT_PUBLIC_FIREBASE_API_KEY.');
    await createUserWithEmailAndPassword(auth, email, pass);
  };

  const signOutUser = async () => {
    if (auth) {
      await firebaseSignOut(auth);
    }
    setIsAdmin(false);
    setUserRole('user');
  };

  const saveUserExport = async (exportData: UserExportRecord) => {
    if (!user) return;
    try {
      const idToken = await user.getIdToken(true);
      await fetch('/api/user/exports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify(exportData),
      }).catch(() => {});
    } catch {
      // Silently handle save export error
    }
  };

  const getUserExports = useCallback(async (): Promise<UserExportRecord[]> => {
    if (!user) return [];
    try {
      const idToken = await user.getIdToken(true);
      const res = await fetch('/api/user/exports', {
        headers: { 'Authorization': `Bearer ${idToken}` },
      }).catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.exports)) return data.exports;
      }
      return [];
    } catch {
      return [];
    }
  }, [user]);

  const getIdToken = async (): Promise<string | null> => {
    try {
      if (!auth.currentUser) return null;
      return await auth.currentUser.getIdToken(true);
    } catch {
      return null;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin,
        userRole,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOutUser,
        saveUserExport,
        getUserExports,
        getIdToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
