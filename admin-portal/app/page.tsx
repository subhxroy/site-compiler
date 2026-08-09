'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  ShieldAlert, 
  Server, 
  CheckCircle2, 
  RefreshCw, 
  Search, 
  ArrowUpRight,
  Check,
  Ban,
  Lock,
  LogOut,
  Mail,
  Key,
  ShieldCheck,
  Activity,
  XCircle,
  FileCheck
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
  backendStatus: 'online' | 'offline' | 'checking';
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
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0,
    totalExports: 0,
    backendStatus: 'checking',
    backendUptime: 0,
    backendUrl: RENDER_BACKEND_URL,
  });
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

  // Ping backend engine health router dynamically across all endpoints
  const handlePingBackend = useCallback(async () => {
    setPingingBackend(true);
    try {
      const endpointsToTry = [
        'http://localhost:3001/health',
        'http://localhost:3000/api/health',
        RENDER_BACKEND_URL ? `${RENDER_BACKEND_URL}/health` : '',
        typeof window !== 'undefined' ? `${window.location.origin}/api/health` : '',
      ].filter(Boolean);

      let online = false;
      let uptimeSeconds = 0;

      for (const endpoint of endpointsToTry) {
        try {
          const res = await fetch(endpoint, { cache: 'no-store' });
          if (res.ok) {
            const data = await res.json();
            online = true;
            uptimeSeconds = data.uptimeSeconds || 0;
            break;
          }
        } catch {}
      }

      if (online) {
        setStats((prev) => ({
          ...prev,
          backendStatus: 'online',
          backendUptime: uptimeSeconds || prev.backendUptime,
        }));
        setFeedback({ type: 'success', message: 'Backend engine is ONLINE and responsive (HTTP 200 OK).' });
      } else {
        setStats((prev) => ({ ...prev, backendStatus: 'offline' }));
        setFeedback({ type: 'error', message: 'Backend engine is unreachable or offline.' });
      }
    } catch (err: unknown) {
      setStats((prev) => ({ ...prev, backendStatus: 'offline' }));
      setFeedback({ type: 'error', message: 'Backend ping failed: ' + (err as Error).message });
    } finally {
      setPingingBackend(false);
    }
  }, []);

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
        fetch(`${apiHost}/api/admin/stats`, { headers }).catch(() => null),
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
      if (statsData) {
        setStats((prev) => ({
          ...prev,
          totalUsers: statsData.totalUsers || usersData.users?.length || 0,
          totalExports: statsData.totalExports || 0,
        }));
      } else {
        setStats((prev) => ({ ...prev, totalUsers: usersData.users?.length || 0 }));
      }
      if (approvalsData && approvalsData.approvals) setApprovals(approvalsData.approvals);
      
      setIsVerifiedAdmin(true);
      handlePingBackend();
    } catch (err: unknown) {
      setIsVerifiedAdmin(false);
      setFeedback({ type: 'error', message: 'Failed to connect to Admin API: ' + (err as Error).message });
    } finally {
      setLoading(false);
    }
  }, [user, getIdToken, handlePingBackend]);

  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
    } catch (err: unknown) {
      setAuthError((err as Error).message || 'Login failed. Please check credentials.');
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
    } catch (err: unknown) {
      setAuthError((err as Error).message || 'Google authentication failed.');
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
    } catch (err: unknown) {
      setFeedback({ type: 'error', message: (err as Error).message || 'Error updating user permission' });
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
    } catch (err: unknown) {
      setFeedback({ type: 'error', message: (err as Error).message || 'Error updating user role' });
    } finally {
      setUpdatingUid(null);
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
    } catch (err: unknown) {
      setFeedback({ type: 'error', message: (err as Error).message || 'Error processing export approval' });
    } finally {
      setProcessingJobId(null);
    }
  };

  // ── Guard Check: Prevent 1-Second Content Flicker ────────────────────────
  // Render full-screen loader while Firebase Auth OR Admin verification is loading
  if (authLoading || (user && isVerifiedAdmin === null)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#040506] text-white p-4">
        <div className="flex flex-col items-center space-y-4 text-center">
          <RefreshCw className="w-8 h-8 text-[#ff6363] animate-spin" />
          <p className="text-sm font-mono text-[#9c9c9d]">Verifying Administrator credentials & permissions...</p>
        </div>
      </div>
    );
  }

  // ── Render State: Unauthenticated User (Login Form) ─────────────────────
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#040506] p-4 sm:p-6">
        <div className="w-full max-w-md bg-[#0a0b0d] border border-[#2f3031] rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl shadow-black/80">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ff6363]/10 border border-[#ff6363]/30 text-xs font-mono text-[#ff6363]">
              <Lock className="w-3.5 h-3.5" />
              <span>Restricted Area</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Admin Console Sign In</h1>
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
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"/>
              <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/>
              <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9c-.6-.7-1-1.7-1-2.9z"/>
              <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"/>
            </svg>
            <span>Sign In with Google</span>
          </button>

          <div className="text-center pt-2">
            <a
              href={MAIN_SITE_URL}
              className="text-xs text-[#9c9c9d] hover:text-white transition-colors flex items-center justify-center gap-1"
            >
              <span>← Back to Main User Portal</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ── Render State: User Logged In BUT Access Denied (Not Admin) ─────────
  if (isVerifiedAdmin === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#040506] p-4 sm:p-6">
        <div className="w-full max-w-lg bg-[#0a0b0d] border border-red-500/30 rounded-2xl p-6 sm:p-8 space-y-6 text-center shadow-2xl shadow-red-950/40">
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

  // ── Render State: Verified Admin Console ────────────────────────────────
  return (
    <main className="py-8 sm:py-12 px-4 sm:px-6 max-w-7xl mx-auto space-y-8 sm:space-y-10">

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#2f3031] pb-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[6px] bg-[#1b1c1e] border border-[#2f3031] text-[11px] font-mono text-[#ff6363] uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-[#ff6363]" />
            <span>Standalone Admin Domain Console</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">Admin Console</h1>
          <p className="text-xs text-[#9c9c9d]">
            Connected as <span className="text-white font-mono">{user.email}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={loadAdminData}
            disabled={loading}
            className="px-3.5 py-2 rounded-lg bg-[#1b1c1e] hover:bg-[#25262a] border border-[#2f3031] text-xs font-mono text-white flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Data</span>
          </button>

          <button
            onClick={signOutUser}
            className="px-3.5 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-xs font-mono text-red-400 flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>

          <a
            href={MAIN_SITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 rounded-lg bg-[#ff6363] hover:bg-[#ff4f4f] text-xs font-medium text-white transition-all shadow-md shadow-[#ff6363]/20 flex items-center gap-1.5 shrink-0"
          >
            <span>User Portal</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs font-mono flex items-center justify-between gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-[#6a6b6c] hover:text-white shrink-0">✕</button>
        </div>
      )}

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Card 1: Users */}
        <div className="raycast-key-card p-5 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-[#9c9c9d]">
            <span>Total Registered</span>
            <Users className="w-4 h-4 text-[#ff6363]" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">{users.length}</div>
          <div className="text-[11px] font-mono text-[#6a6b6c]">Users in Database</div>
        </div>

        {/* Card 2: Export Allowed */}
        <div className="raycast-key-card p-5 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-[#9c9c9d]">
            <span>Export Allowed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {users.filter((u) => u.canExport).length} / {users.length}
          </div>
          <div className="text-[11px] font-mono text-[#6a6b6c]">Active Export Passes</div>
        </div>

        {/* Card 3: Approvals */}
        <div className="raycast-key-card p-5 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-[#9c9c9d]">
            <span>Total Approvals</span>
            <FileCheck className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">{approvals.length}</div>
          <div className="text-[11px] font-mono text-[#6a6b6c]">Payment Verification Requests</div>
        </div>

        {/* Card 4: Backend Health */}
        <div className="raycast-key-card p-5 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-[#9c9c9d]">
            <span>Engine Health</span>
            <Server className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                stats.backendStatus === 'online'
                  ? 'bg-emerald-400 animate-pulse'
                  : stats.backendStatus === 'checking'
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-red-500'
              }`}
            />
            <span className="text-lg font-bold font-mono text-white uppercase">
              {stats.backendStatus === 'online' ? 'ONLINE' : stats.backendStatus === 'checking' ? 'CHECKING' : 'OFFLINE'}
            </span>
          </div>
          <button
            onClick={handlePingBackend}
            disabled={pingingBackend}
            className="text-[11px] font-mono text-[#ff6363] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <Activity className={`w-3 h-3 ${pingingBackend ? 'animate-spin' : ''}`} />
            <span>{pingingBackend ? 'Pinging...' : 'Ping Engine (/health)'}</span>
          </button>
        </div>
      </div>

      {/* Export Payment Approvals Section */}
      <div className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-white tracking-tight">Export Payment Approvals</h2>
          <p className="text-xs text-[#9c9c9d]">
            Verify UTR transactions and approve user exports to unlock downloads.
          </p>
        </div>

        <div className="bg-[#0a0b0d] border border-[#2f3031] rounded-2xl overflow-hidden shadow-inner">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-[#2f3031] bg-[#111317] text-[11px] font-mono text-[#9c9c9d] uppercase tracking-wider">
                  <th className="p-4">Target Site / Job ID</th>
                  <th className="p-4">Pages & Cost</th>
                  <th className="p-4">Payer Account / UTR</th>
                  <th className="p-4">User Email</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1b1c1e] text-xs font-mono">
                {approvals.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-[#6a6b6c]">
                      No export payment verification requests yet.
                    </td>
                  </tr>
                ) : (
                  approvals.map((item) => (
                    <tr key={item.id} className="hover:bg-[#121418] transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-white truncate max-w-[200px]">{item.url || item.jobId}</div>
                        <div className="text-[10px] text-[#6a6b6c]">{item.jobId}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-white">{item.pageCount} page(s)</div>
                        <div className="text-emerald-400 font-bold">₹{item.amount || 20}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-white font-medium">{item.senderAccount}</div>
                        <div className="text-cyan-400">{item.utrNumber}</div>
                      </td>
                      <td className="p-4 text-[#9c9c9d]">{item.userEmail}</td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            item.status === 'approved'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : item.status === 'rejected'
                              ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {item.status === 'pending' ? (
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              onClick={() => handleProcessApproval(item.jobId, 'approve')}
                              disabled={processingJobId === item.jobId}
                              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition-all shadow cursor-pointer disabled:opacity-50 shrink-0"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleProcessApproval(item.jobId, 'reject')}
                              disabled={processingJobId === item.jobId}
                              className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 font-medium text-xs transition-all cursor-pointer disabled:opacity-50 shrink-0"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-[#6a6b6c]">Reviewed</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* User Export Permissions Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-white tracking-tight">User Export Permissions & Access</h2>
            <p className="text-xs text-[#9c9c9d]">Grant or revoke export access per user in real-time.</p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6a6b6c]" />
            <input
              type="text"
              placeholder="Search user or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#0a0b0d] border border-[#2f3031] rounded-xl text-xs text-white placeholder-[#6a6b6c] outline-none focus:border-[#ff6363] transition-all"
            />
          </div>
        </div>

        <div className="bg-[#0a0b0d] border border-[#2f3031] rounded-2xl overflow-hidden shadow-inner">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-[#2f3031] bg-[#111317] text-[11px] font-mono text-[#9c9c9d] uppercase tracking-wider">
                  <th className="p-4">User</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Export Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1b1c1e] text-xs font-mono">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-[#6a6b6c]">
                      No users found matching search query.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.uid} className="hover:bg-[#121418] transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#1e2025] border border-[#2f3031] flex items-center justify-center text-white font-bold text-xs uppercase shrink-0">
                            {u.displayName ? u.displayName.charAt(0) : u.email.charAt(0)}
                          </div>
                          <div className="truncate">
                            <div className="text-white font-medium truncate">{u.displayName || u.email}</div>
                            <div className="text-[10px] text-[#6a6b6c] truncate">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.uid, e.target.value as 'user' | 'pro' | 'admin')}
                          disabled={updatingUid === u.uid}
                          className="bg-[#1b1c1e] border border-[#2f3031] text-xs text-white rounded-lg px-2.5 py-1 outline-none focus:border-[#ff6363]"
                        >
                          <option value="user">User</option>
                          <option value="pro">Pro</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            u.canExport
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-red-500/10 text-red-400 border border-red-500/30'
                          }`}
                        >
                          {u.canExport ? <Check className="w-3 h-3" /> : <Ban className="w-3 h-3" />}
                          <span>{u.canExport ? 'Allowed' : 'Disabled'}</span>
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleToggleExport(u)}
                          disabled={updatingUid === u.uid}
                          className={`px-3 py-1.5 rounded-lg font-mono text-xs transition-all cursor-pointer disabled:opacity-50 shrink-0 ${
                            u.canExport
                              ? 'bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30'
                              : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {u.canExport ? 'Revoke Access' : 'Grant Access'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </main>
  );
}
