'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth, googleProvider } from './config';

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
  signInWithGoogle: async () => {},
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  signOutUser: async () => {},
  saveUserExport: async () => {},
  getUserExports: async () => [],
  getIdToken: async () => null,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Safety fallback timer to prevent infinite loading spinner if Firebase auth hangs
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2500);

    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser: User | null) => {
        clearTimeout(timer);
        setUser(currentUser);
        setLoading(false);

        if (currentUser) {
          // Sync user profile to Next.js API route (/api/user/sync)
          try {
            await fetch('/api/user/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                uid: currentUser.uid,
                email: currentUser.email,
                displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
                photoURL: currentUser.photoURL || null,
              }),
            }).catch(() => {});
          } catch {
            // Silently handle offline/network sync errors
          }
        }
      },
      (error) => {
        clearTimeout(timer);
        console.error('[Firebase Auth Error]', error);
        setLoading(false);
      }
    );

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const signInWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const signUpWithEmail = async (email: string, pass: string) => {
    await createUserWithEmailAndPassword(auth, email, pass);
  };

  const signOutUser = async () => {
    await firebaseSignOut(auth);
  };

  const saveUserExport = async (exportData: UserExportRecord) => {
    if (!user) return;
    try {
      await fetch('/api/user/exports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid, ...exportData }),
      }).catch(() => {});
    } catch {
      // Silently handle save export error
    }
  };

  const getUserExports = async (): Promise<UserExportRecord[]> => {
    if (!user) return [];
    try {
      const res = await fetch(`/api/user/exports?uid=${user.uid}`).catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.exports)) return data.exports;
      }
      return [];
    } catch {
      return [];
    }
  };

  const getIdToken = async (): Promise<string | null> => {
    if (!auth.currentUser) return null;
    return await auth.currentUser.getIdToken(true);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
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
