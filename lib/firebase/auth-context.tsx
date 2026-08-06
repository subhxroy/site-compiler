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
import { getApiUrl } from '../api-config';

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
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser: User | null) => {
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        // Sync user profile to Firestore via server API (Admin SDK)
        try {
          await fetch(getApiUrl('/api/user/sync'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
              photoURL: currentUser.photoURL || null,
            }),
          });
        } catch (err) {
          console.error('[Firebase Sync] Profile sync error:', err);
        }
      }
    });

    return () => unsubscribe();
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
      await fetch(getApiUrl('/api/user/exports'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid, ...exportData }),
      });
    } catch (err) {
      console.error('[Firebase DB] Error saving user export history:', err);
    }
  };

  const getUserExports = async (): Promise<UserExportRecord[]> => {
    if (!user) return [];
    try {
      const res = await fetch(getApiUrl(`/api/user/exports?uid=${user.uid}`));
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.exports)) return data.exports;
      }
      return [];
    } catch (err) {
      console.error('[Firebase DB] Error fetching user exports:', err);
      return [];
    }
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
