'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Users, 
  ShieldAlert, 
  Server, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Lock, 
  Search, 
  Zap, 
  Activity,
  ArrowUpRight,
  Sliders,
  Check,
  Ban,
  Database
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

interface SystemStats {
  totalUsers: number;
  totalExports: number;
  backendStatus: string;
  backendUptime: number;
  backendMemory?: { heapUsed: number; heapTotal: number };
  backendUrl: string;
}

export default function AdminPortalPage() {
  const { user, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [updatingUid, setUpdatingUid] = useState<string | null>(null);
  const [pingingBackend, setPingingBackend] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fetch admin users & system stats
  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [usersRes, statsRes] = await Promise.all([
        fetch('/api/admin/users').then((r) => (r.ok ? r.json() : { users: [] })),
        fetch('/api/admin/stats').then((r) => (r.ok ? r.json() : null)),
      ]);

      if (usersRes.users) setUsers(usersRes.users);
      if (statsRes) setStats(statsRes);
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Failed to connect to Admin API: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  // Toggle user export permission
  const handleToggleExport = async (targetUser: AdminUser) => {
    setUpdatingUid(targetUser.uid);
    const newStatus = !targetUser.canExport;
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        throw new Error('Failed to update permission');
      }
    } catch {
      setFeedback({ type: 'error', message: 'Error updating user permission' });
    } finally {
      setUpdatingUid(null);
    }
  };

  // Change user role
  const handleRoleChange = async (uid: string, newRole: 'user' | 'pro' | 'admin') => {
    setUpdatingUid(uid);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, role: newRole }),
      });

      if (res.ok) {
        setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, role: newRole } : u)));
        setFeedback({ type: 'success', message: `User role updated to ${newRole.toUpperCase()}.` });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Error updating user role' });
    } finally {
      setUpdatingUid(null);
    }
  };

  // Ping backend engine health router
  const handlePingBackend = async () => {
    setPingingBackend(true);
    try {
      const targetUrl = stats?.backendUrl ? `${stats.backendUrl}/health` : 'https://site-compiler.onrender.com/health';
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

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.displayName.toLowerCase().includes(search.toLowerCase()) ||
      u.uid.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="pt-28 pb-24 text-white min-h-screen">
      <div className="max-w-6xl mx-auto px-6 space-y-10">

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2f3031] pb-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[6px] bg-[#1b1c1e] border border-[#2f3031] text-[11px] font-mono text-[#ff6363] uppercase tracking-wider">
              <ShieldAlert className="w-3.5 h-3.5 text-[#ff6363]" />
              SiteCompiler Admin Console
            </div>
            <h1 className="text-3xl font-semibold text-white tracking-tight">Platform Administration</h1>
            <p className="text-xs text-[#9c9c9d]">
              Manage user export access permissions, monitor backend engine health, and inspect user activity.
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
            <Link
              href="/"
              className="px-4 py-2.5 rounded-lg bg-[#ff6363] hover:bg-[#ff4f4f] text-xs font-medium text-white transition-all shadow-md shadow-[#ff6363]/20 flex items-center gap-1.5"
            >
              <span>Main Site</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
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
            <button onClick={() => setFeedback(null)} className="hover:opacity-70">✕</button>
          </div>
        )}

        {/* System Overview Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
          <div className="raycast-key-card p-5 border border-[#2f3031] space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-[#9c9c9d]">
              <span>Registered Users</span>
              <Users className="w-4 h-4 text-[#ff6363]" />
            </div>
            <div className="text-2xl font-bold text-white">{users.length}</div>
            <p className="text-[11px] text-[#6a6b6c] font-mono">Accounts in Firestore</p>
          </div>

          <div className="raycast-key-card p-5 border border-[#2f3031] space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-[#9c9c9d]">
              <span>Export Access Granted</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {users.filter((u) => u.canExport).length} / {users.length}
            </div>
            <p className="text-[11px] text-[#6a6b6c] font-mono">Users enabled to compile</p>
          </div>

          <div className="raycast-key-card p-5 border border-[#2f3031] space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-[#9c9c9d]">
              <span>Total Compilations</span>
              <Database className="w-4 h-4 text-[#ff6363]" />
            </div>
            <div className="text-2xl font-bold text-white">{stats?.totalExports || 0}</div>
            <p className="text-[11px] text-[#6a6b6c] font-mono">Saved export packages</p>
          </div>

          <div className="raycast-key-card p-5 border border-[#2f3031] space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-[#9c9c9d]">
              <span>Render Engine Status</span>
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

        {/* User Access Control Section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2f3031] pb-3">
            <div>
              <h2 className="text-xl font-semibold text-white tracking-tight">User Access & Export Permissions</h2>
              <p className="text-xs text-[#9c9c9d]">Control who can export websites and manage user roles.</p>
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
                      {loading ? 'Loading user database...' : 'No users found in Firestore database.'}
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

        {/* Backend & Deployment Configuration Card */}
        <div className="raycast-key-card p-8 border border-[#2f3031] space-y-4 bg-[#0a0b0d]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#ff6363]/10 border border-[#ff6363]/30 text-[#ff6363]">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Standalone Admin Deployment & Billing</h3>
              <p className="text-xs text-[#9c9c9d]">
                This Admin Portal can be hosted independently on a separate custom domain (e.g. <code className="text-[#ff6363]">admin.sitecompiler.app</code>).
              </p>
            </div>
          </div>
          <div className="text-xs text-[#9c9c9d] space-y-2 leading-relaxed">
            <p>
              • Export permissions are verified live via Firestore (<code className="text-white">canExport</code> field).
            </p>
            <p>
              • Admin actions take effect immediately across all connected frontend origins and backend compilation pipelines.
            </p>
          </div>
        </div>

      </div>
    </main>
  );
}
