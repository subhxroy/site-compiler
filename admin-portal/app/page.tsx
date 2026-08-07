'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  ShieldAlert, 
  Server, 
  CheckCircle2, 
  RefreshCw, 
  Search, 
  Zap, 
  ArrowUpRight,
  Check,
  Ban,
  Database,
  Lock,
  LogOut,
  Mail,
  Key
} from 'lucide-react';
import { useAuth } from '@/lib/firebase/auth-context';

interface AdminUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  canExport: boolean;
  role: 'user' | 'pro' | 'admin';
  status: 'active' | 'suspended';
  createdAt: string;
  lastLoginAt: string;
}

interface ExportApproval {
  id: string;
  jobId: string;
  url: string;
  pageCount: number;
  amount: number;
  senderAccount: string;
  utrNumber: string;
  userEmail: string;
  status: 'pending' | 'approved' | 'rejected';
  paymentApproved?: boolean;
  submittedAt: string;
}

interface SystemStats {
  totalUsers: number;
  totalExports: number;
  backendStatus: string;
  backendUptime: number;
  backendMemory?: { heapUsed: number; heapTotal: number };
  backendUrl: string;
}

const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL || 'https://site-compiler.netlify.app';
const RENDER_BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://site-compiler.onrender.com';

export default function StandaloneAdminPage() {
  const { user, loading: authLoading, signInWithGoogle, signInWithEmail, signOutUser, getIdToken } = useAuth();
  
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [approvals, setApprovals] = useState<ExportApproval[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [isVerifiedAdmin, setIsVerifiedAdmin] = useState<boolean | null>(null);
  const [search, setSearch] = useState('');
  const [updatingUid, setUpdatingUid] = useState<string | null>(null);
  const [processingJobId, setProcessingJobId] = useState<string | null>(null);
  const [pingingBackend, setPingingBackend] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authenticating, setAuthenticating] = useState(false);

  // Fetch admin data with Bearer token authentication
  const loadAdminData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await getIdToken();
      if (!token) {
        setIsVerifiedAdmin(false);
        setLoading(false);
        return;
      }

      const apiHost = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
        ? 'http://localhost:3000' 
        : MAIN_SITE_URL;

      const headers = { 'Authorization': `Bearer ${token}` };

      const [usersRes, statsRes, approvalsRes] = await Promise.all([
        fetch(`${apiHost}/api/admin/users`, { headers }),
        fetch(`${apiHost}/api/admin/stats`, { headers }),
        fetch(`${apiHost}/api/admin/approvals`, { headers }).catch(() => null),
      ]);

      if (usersRes.status === 401 || usersRes.status === 403) {
        setIsVerifiedAdmin(false);
        setFeedback({ type: 'error', message: 'Access Denied: You do not have Administrator permissions.' });
        setLoading(false);
        return;
      }

      const usersData = await usersRes.json();
      const statsData = statsRes && statsRes.ok ? await statsRes.json() : null;
      const approvalsData = approvalsRes && approvalsRes.ok ? await approvalsRes.json() : null;

      if (usersData.users) setUsers(usersData.users);
      if (statsData) setStats(statsData);
      if (approvalsData && approvalsData.approvals) setApprovals(approvalsData.approvals);
      setIsVerifiedAdmin(true);
    } catch (err: any) {
      setIsVerifiedAdmin(false);
      setFeedback({ type: 'error', message: 'Failed to connect to Admin API: ' + err.message });
    } finally {
      setLoading(false);
    }
  }, [user, getIdToken]);

  useEffect(() => {
    if (user) {
      loadAdminData();
    } else {
      setIsVerifiedAdmin(null);
    }
  }, [user, loadAdminData]);

  // Handle Email Login
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthenticating(true);
    try {
      await signInWithEmail(email, password);
    } catch (err: any) {
      setAuthError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setAuthenticating(false);
    }
  };

  // Handle Google Login
  const handleGoogleLogin = async () => {
    setAuthError('');
    setAuthenticating(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setAuthError(err.message || 'Google authentication failed.');
    } finally {
      setAuthenticating(false);
    }
  };

  // Toggle user export permission
  const handleToggleExport = async (targetUser: AdminUser) => {
    setUpdatingUid(targetUser.uid);
    const newStatus = !targetUser.canExport;
    const apiHost = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
      ? 'http://localhost:3000' 
      : MAIN_SITE_URL;

    try {
      const token = await getIdToken();
      const res = await fetch(`${apiHost}/api/admin/users`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ uid: targetUser.uid, canExport: newStatus }),
      });

      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.uid === targetUser.uid ? { ...u, canExport: newStatus } : u))
        );
        setFeedback({
          type: 'success',
          message: `Export access for ${targetUser.email} set to ${newStatus ? 'ALLOWED' : 'DISABLED'}.`,
        });
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update permission');
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error updating user permission' });
    } finally {
      setUpdatingUid(null);
    }
  };

  // Change user role
  const handleRoleChange = async (uid: string, newRole: 'user' | 'pro' | 'admin') => {
    setUpdatingUid(uid);
    const apiHost = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
      ? 'http://localhost:3000' 
      : MAIN_SITE_URL;

    try {
      const token = await getIdToken();
      const res = await fetch(`${apiHost}/api/admin/users`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ uid, role: newRole }),
      });

      if (res.ok) {
        setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, role: newRole } : u)));
        setFeedback({ type: 'success', message: `User role updated to ${newRole.toUpperCase()}.` });
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update role');
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error updating user role' });
    } finally {
      setUpdatingUid(null);
    }
  };

  // Ping backend engine health router
  const handlePingBackend = async () => {
    setPingingBackend(true);
    try {
      const targetUrl = `${RENDER_BACKEND_URL}/health`;
      const res = await fetch(targetUrl, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setStats((prev) => prev ? { ...prev, backendStatus: 'online', backendUptime: data.uptimeSeconds || prev.backendUptime } : null);
        setFeedback({ type: 'success', message: 'Render backend engine is ONLINE and responsive (HTTP 200 OK).' });
      } else {
        setFeedback({ type: 'error', message: 'Backend responded with status ' + res.status });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Backend ping failed: ' + err.message });
    } finally {
      setPingingBackend(false);
    }
  };

  // Approve or Reject Export Payment
  const handleProcessApproval = async (jobId: string, action: 'approve' | 'reject') => {
    setProcessingJobId(jobId);
    const apiHost = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
      ? 'http://localhost:3000' 
      : MAIN_SITE_URL;

    try {
      const token = await getIdToken();
      const res = await fetch(`${apiHost}/api/admin/approvals`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ jobId, action }),
      });

      if (res.ok) {
        const isApproved = action === 'approve';
        setApprovals((prev) =>
          prev.map((item) => (item.jobId === jobId ? { ...item, status: isApproved ? 'approved' : 'rejected', paymentApproved: isApproved } : item))
        );
        setFeedback({
          type: 'success',
          message: `Export package ${jobId} set to ${isApproved ? 'APPROVED — Download unlocked' : 'REJECTED'}.`,
        });
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to process approval');
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error processing export approval' });
    } finally {
      setProcessingJobId(null);
    }
  };

  // ── Render State 1: Firebase Auth Loading ─────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#040506] text-white">
        <div className="flex flex-col items-center space-y-4">
          <RefreshCw className="w-8 h-8 text-[#ff6363] animate-spin" />
          <p className="text-sm font-mono text-[#9c9c9d]">Verifying Firebase credentials...</p>
        </div>
      </div>
    );
  }

  // ── Render State 2: Unauthenticated User (Login Form) ─────────────────────
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#040506] px-4">
        <div className="w-full max-w-md bg-[#0a0b0d] border border-[#2f3031] rounded-2xl p-8 space-y-6 shadow-2xl shadow-black/80">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ff6363]/10 border border-[#ff6363]/30 text-xs font-mono text-[#ff6363]">
              <Lock className="w-3.5 h-3.5" />
              Restricted Area
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Admin Portal Authentication</h1>
            <p className="text-xs text-[#9c9c9d]">Sign in with an authorized Administrator account.</p>
          </div>

          {authError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400 font-mono">
              {authError}
            </div>
          )}

          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-mono text-[#9c9c9d]">Admin Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6a6b6c]" />
                <input
                  type="email"
                  required
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-[#1b1c1e] border border-[#2f3031] rounded-lg text-sm text-white outline-none focus:border-[#ff6363] transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono text-[#9c9c9d]">Password</label>
              <div className="relative">
                <Key className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6a6b6c]" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-[#1b1c1e] border border-[#2f3031] rounded-lg text-sm text-white outline-none focus:border-[#ff6363] transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={authenticating}
              className="w-full py-2.5 rounded-lg bg-[#ff6363] hover:bg-[#ff4f4f] font-medium text-white text-sm transition-all shadow-lg shadow-[#ff6363]/20 disabled:opacity-50 cursor-pointer"
            >
              {authenticating ? 'Signing in...' : 'Sign In with Email'}
            </button>
          </form>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-[#2f3031] w-full" />
            <span className="bg-[#0a0b0d] px-3 text-[11px] font-mono text-[#6a6b6c] uppercase absolute">OR</span>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={authenticating}
            className="w-full py-2.5 rounded-lg bg-[#1b1c1e] hover:bg-[#25262a] border border-[#2f3031] text-xs font-mono text-white flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"/>
              <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/>
              <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9c-.6-.7-1-1.7-1-2.9z"/>
              <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"/>
            </svg>
            <span>Sign In with Google</span>
          </button>

          <div className="text-center">
            <a
              href={MAIN_SITE_URL}
              className="text-xs text-[#9c9c9d] hover:text-white transition-colors"
            >
              ← Back to Main User Portal
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ── Render State 3: User Logged In BUT Access Denied (Not Admin) ─────────
  if (isVerifiedAdmin === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#040506] px-4">
        <div className="w-full max-w-lg bg-[#0a0b0d] border border-red-500/30 rounded-2xl p-8 space-y-6 text-center shadow-2xl shadow-red-950/40">
          <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-500">
            <ShieldAlert className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Access Denied</h1>
            <p className="text-xs text-red-400 font-mono">ADMINISTRATOR PERMISSIONS REQUIRED</p>
          </div>

          <div className="p-4 rounded-xl bg-[#1b1c1e] border border-[#2f3031] text-xs space-y-2 text-left">
            <p className="text-white">
              Authenticated as: <strong className="font-mono text-[#ff6363]">{user.email || user.uid}</strong>
            </p>
            <p className="text-[#9c9c9d]">
              This Firebase account does not have administrator rights (`role: &apos;admin&apos;`) in Firestore. Access to the Admin Portal API and Management Console is strictly restricted.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 justify-center pt-2">
            <button
              onClick={signOutUser}
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 text-xs font-mono flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out & Switch Account</span>
            </button>
            <a
              href={MAIN_SITE_URL}
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-[#1b1c1e] hover:bg-[#25262a] border border-[#2f3031] text-xs font-mono text-white flex items-center justify-center gap-2 transition-all"
            >
              <span>User Portal</span>
              <ArrowUpRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.displayName.toLowerCase().includes(search.toLowerCase()) ||
      u.uid.toLowerCase().includes(search.toLowerCase())
  );

  // ── Render State 4: Verified Admin Console ────────────────────────────────
  return (
    <main className="py-12 px-6 max-w-6xl mx-auto space-y-10">

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2f3031] pb-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[6px] bg-[#1b1c1e] border border-[#2f3031] text-[11px] font-mono text-[#ff6363] uppercase tracking-wider">
            <ShieldAlert className="w-3.5 h-3.5 text-[#ff6363]" />
            Standalone Admin Domain Portal
          </div>
          <h1 className="text-3xl font-semibold text-white tracking-tight">Admin Console</h1>
          <p className="text-xs text-[#9c9c9d]">
            Connected as <span className="text-white font-mono">{user.email}</span>. Port: 3002.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadAdminData}
            disabled={loading}
            className="px-4 py-2.5 rounded-lg bg-[#1b1c1e] hover:bg-[#25262a] border border-[#2f3031] text-xs font-mono text-white flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Data</span>
          </button>

          <button
            onClick={signOutUser}
            className="px-4 py-2.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-xs font-mono text-red-400 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>

          <a
            href={MAIN_SITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 rounded-lg bg-[#ff6363] hover:bg-[#ff4f4f] text-xs font-medium text-white transition-all shadow-md shadow-[#ff6363]/20 flex items-center gap-1.5"
          >
            <span>User Portal</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs font-mono flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="hover:opacity-70 font-bold">✕</button>
        </div>
      )}

      {/* System Overview Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
        <div className="raycast-key-card p-5 border border-[#2f3031] space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-[#9c9c9d]">
            <span>Total Registered</span>
            <Users className="w-4 h-4 text-[#ff6363]" />
          </div>
          <div className="text-2xl font-bold text-white">{users.length}</div>
          <p className="text-[11px] text-[#6a6b6c] font-mono">Users in Database</p>
        </div>

        <div className="raycast-key-card p-5 border border-[#2f3031] space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-[#9c9c9d]">
            <span>Export Allowed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {users.filter((u) => u.canExport).length} / {users.length}
          </div>
          <p className="text-[11px] text-[#6a6b6c] font-mono">Active Export Passes</p>
        </div>

        <div className="raycast-key-card p-5 border border-[#2f3031] space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-[#9c9c9d]">
            <span>Total Compilations</span>
            <Database className="w-4 h-4 text-[#ff6363]" />
          </div>
          <div className="text-2xl font-bold text-white">{stats?.totalExports || 0}</div>
          <p className="text-[11px] text-[#6a6b6c] font-mono">Export Archives</p>
        </div>

        <div className="raycast-key-card p-5 border border-[#2f3031] space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-[#9c9c9d]">
            <span>Engine Health</span>
            <Server className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${stats?.backendStatus === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="text-lg font-bold text-white uppercase">{stats?.backendStatus || 'Check'}</span>
          </div>
          <button
            onClick={handlePingBackend}
            disabled={pingingBackend}
            className="text-[11px] font-mono text-[#ff6363] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>{pingingBackend ? 'Pinging...' : 'Ping Engine (/health)'}</span>
            <Zap className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Export Payment Approvals Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2f3031] pb-3">
          <div>
            <h2 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2">
              <span>Export Payment Approvals</span>
              {approvals.filter((a) => a.status === 'pending').length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-[#ff6363] text-black text-xs font-mono font-bold animate-pulse">
                  {approvals.filter((a) => a.status === 'pending').length} Pending
                </span>
              )}
            </h2>
            <p className="text-xs text-[#9c9c9d]">Verify UTR transactions and approve user exports to unlock downloads.</p>
          </div>
        </div>

        {/* Approvals Table */}
        <div className="raycast-key-card border border-[#2f3031] rounded-2xl overflow-x-auto bg-[#07080a]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#111214] text-[#6a6b6c] uppercase font-mono text-[10px] border-b border-[#2f3031]">
              <tr>
                <th className="px-6 py-3.5">Target Site / Job ID</th>
                <th className="px-6 py-3.5">Pages & Cost</th>
                <th className="px-6 py-3.5">Payer Account / UTR</th>
                <th className="px-6 py-3.5">User Email</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f2023] text-[#a0a0a2]">
              {approvals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[#6a6b6c] font-mono">
                    No export payment verification requests yet.
                  </td>
                </tr>
              ) : (
                approvals.map((item) => (
                  <tr key={item.jobId || item.id} className="hover:bg-[#111214]/60 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-white font-medium truncate max-w-[180px]">{item.url}</div>
                      <div className="text-[11px] font-mono text-[#6a6b6c]">{item.jobId}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-emerald-400 font-bold font-mono text-sm">₹{item.amount || 20}</div>
                      <div className="text-[11px] font-mono text-[#6a6b6c]">{item.pageCount || 1} page(s)</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-white font-medium">{item.senderAccount || 'N/A'}</div>
                      <div className="text-[11px] font-mono text-[#ff6363]">UTR: {item.utrNumber || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-[11px] text-white">
                      {item.userEmail || 'Anonymous'}
                    </td>
                    <td className="px-6 py-4">
                      {item.status === 'approved' || item.paymentApproved ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono">
                          <Check className="w-3 h-3" /> Approved
                        </span>
                      ) : item.status === 'rejected' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-[11px] font-mono">
                          <Ban className="w-3 h-3" /> Rejected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-mono font-medium animate-pulse">
                          Pending Verification
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {item.status !== 'approved' && !item.paymentApproved && (
                        <button
                          onClick={() => handleProcessApproval(item.jobId, 'approve')}
                          disabled={processingJobId === item.jobId}
                          className="px-3 py-1.5 rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-400 font-mono text-[11px] transition-all cursor-pointer disabled:opacity-50"
                        >
                          {processingJobId === item.jobId ? 'Saving...' : 'Approve Export'}
                        </button>
                      )}
                      {item.status === 'pending' && (
                        <button
                          onClick={() => handleProcessApproval(item.jobId, 'reject')}
                          disabled={processingJobId === item.jobId}
                          className="px-3 py-1.5 rounded-md bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 font-mono text-[11px] transition-all cursor-pointer disabled:opacity-50"
                        >
                          Reject
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Access Control Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2f3031] pb-3">
          <div>
            <h2 className="text-xl font-semibold text-white tracking-tight">User Export Permissions & Access</h2>
            <p className="text-xs text-[#9c9c9d]">Grant or revoke export access per user in real-time.</p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6a6b6c]" />
            <input
              type="text"
              placeholder="Search user or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 raycast-inset-input text-xs text-white outline-none rounded-lg"
            />
          </div>
        </div>

        {/* User Table */}
        <div className="raycast-key-card border border-[#2f3031] rounded-2xl overflow-x-auto bg-[#07080a]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#111214] text-[#6a6b6c] uppercase font-mono text-[10px] border-b border-[#2f3031]">
              <tr>
                <th className="px-6 py-3.5">User</th>
                <th className="px-6 py-3.5">Role</th>
                <th className="px-6 py-3.5">Export Access</th>
                <th className="px-6 py-3.5">Joined</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f2023] text-[#a0a0a2]">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-[#6a6b6c] font-mono">
                    {loading ? 'Loading user database...' : 'No users found in database.'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.uid} className="hover:bg-[#111214]/60 transition-colors">
                    {/* User Info */}
                    <td className="px-6 py-4 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#1b1c1e] border border-[#2f3031] flex items-center justify-center font-bold text-white text-xs flex-none">
                        {(u.displayName || u.email || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-white font-medium">{u.displayName || 'User'}</div>
                        <div className="text-[11px] font-mono text-[#6a6b6c]">{u.email}</div>
                      </div>
                    </td>

                    {/* Role Selector */}
                    <td className="px-6 py-4">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.uid, e.target.value as any)}
                        disabled={updatingUid === u.uid}
                        className="bg-[#1b1c1e] border border-[#2f3031] text-xs text-white rounded px-2.5 py-1 font-mono outline-none cursor-pointer"
                      >
                        <option value="user">User</option>
                        <option value="pro">Pro Member</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </td>

                    {/* Export Status Badge */}
                    <td className="px-6 py-4">
                      {u.canExport ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono font-medium">
                          <Check className="w-3 h-3" />
                          <span>Export Allowed</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-[11px] font-mono font-medium">
                          <Ban className="w-3 h-3" />
                          <span>Export Disabled</span>
                        </span>
                      )}
                    </td>

                    {/* Joined Date */}
                    <td className="px-6 py-4 font-mono text-[11px] text-[#6a6b6c]">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>

                    {/* Toggle Permission Button */}
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleToggleExport(u)}
                        disabled={updatingUid === u.uid}
                        className={`px-3 py-1.5 rounded-md font-mono text-[11px] transition-all cursor-pointer disabled:opacity-50 ${
                          u.canExport
                            ? 'bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400'
                            : 'bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400'
                        }`}
                      >
                        {updatingUid === u.uid
                          ? 'Saving...'
                          : u.canExport
                          ? 'Disable Export'
                          : 'Enable Export'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </main>
  );
}
