'use client';

import React, { useState, useEffect, useRef } from 'react';
import { getDirectBackendUrl } from '@/lib/api-config';
import { useAuth } from '@/lib/firebase/auth-context';
import { AuthModal } from '@/components/auth-modal';
import { PaywallModal } from '@/components/paywall-modal';

type OutputFormat = 'html' | 'react' | 'nextjs';
type JobStatus =
  | 'pending'
  | 'crawling'
  | 'parsing'
  | 'validating'
  | 'detecting'
  | 'generating'
  | 'validating-output'
  | 'zipping'
  | 'completed'
  | 'failed'
  | 'cancelled';

interface JobState {
  id: string;
  url: string;
  format: OutputFormat;
  status: JobStatus;
  progressMessage: string;
  logs: string[];
  downloadUrl?: string;
  zipSizeKb?: number;
  pageCount?: number;
  amount?: number;
  paymentSubmitted?: boolean;
  paymentApproved?: boolean;
  screenshots?: { desktop: string; tablet: string; mobile: string };
  error?: string;
}

const STEPS: { key: JobStatus; label: string }[] = [
  { key: 'crawling',          label: 'Crawling site'      },
  { key: 'parsing',           label: 'Processing assets'  },
  { key: 'validating',        label: 'Validating HTML'    },
  { key: 'detecting',         label: 'Analysing layout'   },
  { key: 'generating',        label: 'Generating code'    },
  { key: 'validating-output', label: 'Quality check'      },
  { key: 'zipping',           label: 'Packaging ZIP'      },
];

const STATUS_ORDER: JobStatus[] = [
  'pending','crawling','parsing','validating','detecting','generating','validating-output','zipping','completed',
];

const TERMINAL_STATUSES: JobStatus[] = ['completed', 'failed', 'cancelled'];

function stepState(current: JobStatus, step: JobStatus): 'done' | 'active' | 'idle' | 'failed' {
  if (current === 'failed' || current === 'cancelled') return 'failed';
  const ci = STATUS_ORDER.indexOf(current);
  const si = STATUS_ORDER.indexOf(step);
  if (current === 'completed' || (ci > si && ci !== -1)) return 'done';
  if (ci === si) return 'active';
  return 'idle';
}

function stripAnsi(str: string): string {
  if (!str) return '';
  return str.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '').replace(/\[\d{1,2}m/g, '');
}

function formatLogLine(line: string): string {
  if (!line) return '';
  const clean = stripAnsi(line);
  return clean.replace(/\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)\]/g, (_, isoStr) => {
    try {
      const date = new Date(isoStr);
      if (!isNaN(date.getTime())) {
        return `[${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}]`;
      }
    } catch {}
    return `[${isoStr}]`;
  });
}

const Icon = {
  CoralDiamond: () => (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
      <path d="M12 2L2 12L12 22L22 12L12 2Z" fill="#ff6363" />
    </svg>
  ),
  Globe: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>
    </svg>
  ),
  Download: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>
    </svg>
  ),
  Check: ({ size = 12 }: { size?: number }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: size, height: size }}>
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  X: ({ size = 12 }: { size?: number }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: size, height: size }}>
      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
    </svg>
  ),
  ArrowRight: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
    </svg>
  ),
  Spinner: ({ size = 16 }: { size?: number }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin" style={{ width: size, height: size }}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
  ),
  FileCode: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="m10 13-2 2 2 2"/><path d="m14 17 2-2-2-2"/>
    </svg>
  ),
  Layers: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>
    </svg>
  ),
  Camera: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>
    </svg>
  ),
  Archive: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/>
    </svg>
  ),
  BookOpen: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  ),
  Monitor: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <rect width="20" height="14" x="2" y="3" rx="2"/><path d="M8 21h8m-4-4v4"/>
    </svg>
  ),
  Tablet: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><line x1="12" x2="12.01" y1="18" y2="18"/>
    </svg>
  ),
  Smartphone: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/>
    </svg>
  ),
  Terminal: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/>
    </svg>
  ),
};

function FormatCard({
  selected, title, description, badge, onClick,
}: {
  value: OutputFormat; selected: boolean; title: string;
  description: string; badge?: string; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative text-left p-4 transition-all duration-200 cursor-pointer focus:outline-none ${
        selected ? 'raycast-key-card-selected' : 'raycast-key-card hover:border-[#454647]'
      }`}
    >
      {badge && (
        <span className="absolute -top-2 right-3 text-[10px] font-semibold px-2 py-0.5 rounded-[6px] bg-[#1b1c1e] text-[#ff6363] border border-[#ff6363]/30 uppercase tracking-wider">
          {badge}
        </span>
      )}
      <div className={`text-sm font-medium mb-1 ${selected ? 'text-[#ffffff]' : 'text-[#9c9c9d]'}`}>{title}</div>
      <div className="text-xs text-[#6a6b6c] leading-relaxed font-normal">{description}</div>
      {selected && (
        <span className="absolute top-3 right-3 w-4 h-4 rounded-full bg-[#ff6363] flex items-center justify-center text-[#040506]">
          <Icon.Check size={10} />
        </span>
      )}
    </button>
  );
}

function StepBadge({ state, label }: { state: 'done' | 'active' | 'idle' | 'failed'; label: string }) {
  const base = 'text-xs font-medium px-3 py-1.5 rounded-[6px] flex items-center gap-1.5 transition-all border';
  if (state === 'done')   return <span className={`${base} bg-[#59d499]/10 text-[#59d499] border-[#59d499]/30`}><Icon.Check size={12} />{label}</span>;
  if (state === 'active') return <span className={`${base} bg-[#ff6363]/15 text-[#ff6363] border-[#ff6363]/40`}><Icon.Spinner size={12} />{label}</span>;
  if (state === 'failed') return <span className={`${base} bg-red-500/15 text-red-400 border-red-500/30`}><Icon.X size={12} />{label}</span>;
  return <span className={`${base} bg-[#07080a] text-[#6a6b6c] border-[#1b1c1e]`}>{label}</span>;
}

const viewportIcons = {
  desktop: <Icon.Monitor />,
  tablet:  <Icon.Tablet  />,
  mobile:  <Icon.Smartphone />,
};

export default function SiteCompilerPage({ faqs }: { faqs: { question: string; answer: string }[] }) {
  const { user, isAdmin, saveUserExport, getIdToken } = useAuth();
  const [url,      setUrl]      = useState('');
  const [format,   setFormat]   = useState<OutputFormat>('html');
  const [loading,  setLoading]  = useState(false);
  const [jobId,    setJobId]    = useState<string | null>(null);
  const [job,      setJob]      = useState<JobState | null>(null);
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [tab,      setTab]      = useState<'preview' | 'logs' | 'stats'>('preview');
  const [savedToFirebase, setSavedToFirebase] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Restore job state on page load or refresh
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const queryJobId = params.get('jobId');
    const savedJobId = queryJobId || localStorage.getItem('sitecompiler_active_job_id');

    if (savedJobId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setJobId(savedJobId);
      setLoading(true);
      const fetchStatus = async () => {
        try {
          const directUrl = getDirectBackendUrl(`/api/job/${savedJobId}/status`);
          console.log(`[RESTORE DEBUG] fetching status from: ${directUrl}`);
          const res = await fetch(directUrl);
          if (res.ok) {
            const data: JobState = await res.json();
            if (data && data.id) {
              setJob(data);
              if (data.url) setUrl(data.url);
              if (data.format) setFormat(data.format);
              if (TERMINAL_STATUSES.includes(data.status)) {
                setLoading(false);
                if (data.status === 'completed') setSavedToFirebase(true);
              }
              return;
            }
          }
          setLoading(false);
          localStorage.removeItem('sitecompiler_active_job_id');
        } catch {
          setLoading(false);
          localStorage.removeItem('sitecompiler_active_job_id');
        }
      };
      fetchStatus();
    }
  }, []);

  // Poll status while job is running with safety watchdog & failure handling
  useEffect(() => {
    if (!jobId) return;

    let consecutiveErrors = 0;
    let pollAttempt = 0;
    const startTime = Date.now();
    const MAX_JOB_DURATION_MS = 5 * 60 * 1000; // 5 minute max client-side timeout

    console.log(`[POLL DEBUG] Starting status polling for jobId: ${jobId}`);

    const iv = setInterval(async () => {
      pollAttempt++;
      // 1. Client-side timeout watchdog
      if (Date.now() - startTime > MAX_JOB_DURATION_MS) {
        console.warn(`[POLL DEBUG] Job ${jobId} hit 5-minute client watchdog timeout`);
        setJob((prev) =>
          prev
            ? {
                ...prev,
                status: 'failed',
                error: 'Export process timed out. The backend engine or target site took too long to respond.',
                progressMessage: 'Export process timed out after 5 minutes.',
              }
            : null
        );
        setLoading(false);
        localStorage.removeItem('sitecompiler_active_job_id');
        clearInterval(iv);
        return;
      }

      try {
        const pollUrl = getDirectBackendUrl(`/api/job/${jobId}/status`);
        console.log(`[POLL DEBUG] attempt #${pollAttempt} -> ${pollUrl}`);
        const res = await fetch(pollUrl);

        if (res.ok) {
          consecutiveErrors = 0;
          let data: JobState | null = null;
          try {
            data = await res.json();
          } catch {
            data = null;
          }

          if (data && data.id) {
            console.log(`[POLL DEBUG] received status: ${data.status} | message: ${data.progressMessage}`);
            setJob(data);
            if (TERMINAL_STATUSES.includes(data.status)) {
              console.log(`[POLL DEBUG] Job ${data.id} reached terminal state: ${data.status}`);
              setLoading(false);
              localStorage.removeItem('sitecompiler_active_job_id');
              const awaitingApproval =
                data.status === 'completed' && data.paymentSubmitted && !data.paymentApproved;
              if (!awaitingApproval) clearInterval(iv);
            }
          }
        } else if (res.status === 404) {
          console.error(`[POLL DEBUG] Job ${jobId} returned 404 (job missing on backend)`);
          setJob((prev) =>
            prev
              ? {
                  ...prev,
                  status: 'failed',
                  error: 'Export job not found or backend was restarted.',
                  progressMessage: 'Export job expired.',
                }
              : null
          );
          setLoading(false);
          localStorage.removeItem('sitecompiler_active_job_id');
          clearInterval(iv);
        } else {
          consecutiveErrors++;
          console.warn(`[POLL DEBUG] Non-OK status response ${res.status} (error count: ${consecutiveErrors})`);
          if (consecutiveErrors >= 30) {
            setJob((prev) =>
              prev
                ? {
                    ...prev,
                    status: 'failed',
                    error: 'Backend service unavailable. Please check backend connection.',
                    progressMessage: 'Backend unreachable.',
                  }
                : null
            );
            setLoading(false);
            clearInterval(iv);
          }
        }
      } catch (pollErr) {
        consecutiveErrors++;
        console.error(`[POLL DEBUG] Network error polling status (attempt ${consecutiveErrors}/30):`, pollErr);
        if (consecutiveErrors >= 30) {
          setJob((prev) =>
            prev
              ? {
                  ...prev,
                  status: 'failed',
                  error: 'Network connection lost while polling job status.',
                  progressMessage: 'Network error.',
                }
              : null
          );
          setLoading(false);
          clearInterval(iv);
        }
      }
    }, 1500);

    return () => clearInterval(iv);
  }, [jobId]);

  // Save to Firebase Firestore when completed and user is logged in
  useEffect(() => {
    if (job && job.status === 'completed' && user && !savedToFirebase) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSavedToFirebase(true);
      saveUserExport({
        jobId: job.id,
        url: job.url,
        format: job.format,
        title: job.url,
        createdAt: Date.now(),
        downloadUrl: job.downloadUrl,
        zipSizeKb: job.zipSizeKb,
      });
    }
  }, [job, user, savedToFirebase, saveUserExport]);

  // Warn user before refreshing or navigating away during export
  useEffect(() => {
    const isExporting = loading || (job && !TERMINAL_STATUSES.includes(job.status));
    if (!isExporting) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const msg = 'Site export in progress! If you refresh, live status updates will pause (background process continues).';
      e.preventDefault();
      e.returnValue = msg;
      return msg;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [loading, job?.status, job]);

  useEffect(() => {
    if (tab === 'logs') logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [job?.logs, tab]);

  // Require Sign In before export
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    if (!user) {
      setIsAuthOpen(true);
      return;
    }

    setLoading(true);
    setJob(null);
    setJobId(null);
    setTab('preview');
    setSavedToFirebase(false);

    // Generate unique idempotency key per export click
    const idempotencyKey = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const requestTargetUrl = getDirectBackendUrl('/api/export');

    console.log('[EXPORT DEBUG] starting export submission');
    console.log(`[EXPORT DEBUG] backend URL: ${requestTargetUrl}`);
    console.log(`[EXPORT DEBUG] target site URL: ${url.trim()} | format: ${format}`);
    console.log(`[EXPORT DEBUG] idempotency key: ${idempotencyKey}`);

    try {
      let attempts = 0;
      let success = false;
      const MAX_ATTEMPTS = 3;

      while (attempts < MAX_ATTEMPTS && !success) {
        attempts++;
        console.log(`[EXPORT DEBUG] sending POST attempt ${attempts}/${MAX_ATTEMPTS}...`);
        const res = await fetch(requestTargetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-idempotency-key': idempotencyKey,
          },
          body: JSON.stringify({ url: url.trim(), format }),
        });

        console.log(`[EXPORT DEBUG] response received | status: ${res.status} | ok: ${res.ok}`);

        let data: Record<string, unknown> | null = null;
        try {
          data = (await res.json()) as Record<string, unknown>;
        } catch (jsonErr) {
          console.warn('[EXPORT DEBUG] failed to parse response JSON:', jsonErr);
          data = null;
        }

        console.log('[EXPORT DEBUG] response body:', data);
        const jobIdResult = typeof data?.jobId === 'string' ? data.jobId : null;

        if (res.ok && jobIdResult) {
          console.log(`[EXPORT DEBUG] jobId received: ${jobIdResult}`);
          success = true;
          setJobId(jobIdResult);
          localStorage.setItem('sitecompiler_active_job_id', jobIdResult);
          if (typeof window !== 'undefined') {
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.set('jobId', jobIdResult);
            window.history.replaceState({}, '', newUrl.toString());
          }
          break;
        } else if ((res.status === 502 || res.status === 503 || data?.isColdStart) && attempts < MAX_ATTEMPTS) {
          console.log(`[EXPORT DEBUG] 502/503 retry attempt ${attempts}/${MAX_ATTEMPTS}...`);
          await new Promise((r) => setTimeout(r, attempts * 2000));
          continue;
        } else {
          const errorMsg =
            (typeof data?.error === 'string' && data.error) ||
            (typeof data?.message === 'string' && data.message) ||
            (res.status === 503 || res.status === 502
              ? 'Export server is unavailable. Please try again in a few seconds.'
              : 'Failed to start export. Please try again.');
          console.error(`[EXPORT DEBUG] export request failed: ${errorMsg}`);
          alert(errorMsg);
          setLoading(false);
          return;
        }
      }
    } catch (err: unknown) {
      console.error('[EXPORT DEBUG] network error:', err);
      alert(`Network error: ${(err as Error)?.message || 'Please check your connection and try again.'}`);
      setLoading(false);
    }
  };

  const handleReset = () => {
    setJob(null);
    setJobId(null);
    setLoading(false);
    setSavedToFirebase(false);
    localStorage.removeItem('sitecompiler_active_job_id');
    if (typeof window !== 'undefined') {
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('jobId');
      window.history.replaceState({}, '', newUrl.toString());
    }
  };

  const handleCancel = async () => {
    if (!jobId) return;
    if (!window.confirm('Cancel this export? Any files generated so far will be deleted.')) return;
    try {
      await fetch(getDirectBackendUrl(`/api/job/${jobId}/cancel`), { method: 'POST' });
      setLoading(false);
    } catch {
      alert('Could not reach the cancel service. The export may have already finished.');
    }
  };

  const currentStatus = job?.status || (loading ? 'pending' : null);
  const isActive = currentStatus && !TERMINAL_STATUSES.includes(currentStatus);

  return (
    <div className="space-y-0 text-[#9c9c9d]">

      {/* Auth Modal Triggered on Unauthenticated Export Attempt */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />

      {/* Paywall Modal for Payment Verification */}
      {job && (
        <PaywallModal
          isOpen={isPaywallOpen}
          onClose={() => setIsPaywallOpen(false)}
          jobId={job.id}
          url={job.url}
          pageCount={job.pageCount || 1}
          amount={job.amount || 20}
          userEmail={user?.email || undefined}
          onPaymentSubmitted={() => {
            setJob((prev) => (prev ? { ...prev, paymentSubmitted: true } : null));
          }}
        />
      )}

      {/* ── Hero Section ─────────────────────────────────────────────────── */}
      <section className="relative pt-28 sm:pt-36 pb-16 sm:pb-24 px-4 sm:px-6 overflow-hidden">
        
        {/* Subtle background ambient blur */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[20%] left-1/3 w-[320px] h-[180px] bg-[#ff6363]/20 rounded-full blur-[100px] transform -rotate-12" />
        </div>

        <div className="relative z-10 max-w-[1200px] mx-auto text-center space-y-6">
          
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[6px] bg-[#1b1c1e] border border-[#2f3031] text-[11px] font-mono text-[#ff6363] uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff6363] animate-pulse" />
            SiteCompiler Engine · Next.js 16 & React TSX Output
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-[56px] font-normal tracking-[0.22px] text-[#ffffff] leading-[1.17] max-w-4xl mx-auto">
            Your shortcut to clean website code.
          </h1>

          <p className="text-base sm:text-lg text-[#9c9c9d] max-w-xl mx-auto leading-relaxed font-normal">
            Crawl any published site — Framer, WordPress, Webflow, Wix — and reconstruct editable Static HTML, React TSX, or Next.js + Tailwind in a single ZIP.
          </p>

          {/* ── Export Form Card ───────────────────────────────────────────── */}
          <div id="export-form" className="relative mx-auto max-w-2xl pt-4">
            <div className="raycast-key-card p-6 sm:p-8 space-y-5 text-left">
              <form onSubmit={handleSubmit} className="space-y-5">
                
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-[#6a6b6c] uppercase tracking-wider block">Target Website URL</label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6a6b6c] pointer-events-none">
                      <Icon.Globe />
                    </div>
                    <input
                      type="url"
                      required
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://example.com"
                      disabled={loading}
                      className="w-full pl-10 pr-4 py-3.5 raycast-inset-input text-[#ffffff] placeholder-[#6a6b6c] text-sm outline-none focus:border-[#ff6363]/60 focus:ring-1 focus:ring-[#ff6363]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-[#6a6b6c] uppercase tracking-wider block">Output Architecture</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <FormatCard
                      value="html"
                      selected={format === 'html'}
                      title="Static HTML"
                      description="Hydrated HTML + CSS + JS bundle"
                      badge="Fastest"
                      onClick={() => setFormat('html')}
                    />
                    <FormatCard
                      value="react"
                      selected={format === 'react'}
                      title="React TSX"
                      description="Component tree + CSS modules"
                      onClick={() => setFormat('react')}
                    />
                    <FormatCard
                      value="nextjs"
                      selected={format === 'nextjs'}
                      title="Next.js 16"
                      description="App Router + Tailwind CSS"
                      onClick={() => setFormat('nextjs')}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !url.trim()}
                  className="w-full py-3.5 raycast-button-primary font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <><Icon.Spinner size={16} /><span>Exporting site pipeline…</span></>
                  ) : (
                    <>
                      <Icon.Download />
                      <span>{user ? 'Export Site to Clean Source' : 'Sign in to Export Site'}</span>
                    </>
                  )}
                </button>

                {!user && (
                  <p className="text-[11px] font-mono text-[#ff6363] text-center pt-1">
                    * Sign in required to compile websites and save your export history.
                  </p>
                )}
              </form>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 font-mono text-[12px] text-[#6a6b6c] pt-2">
            <span>v1.104.21</span>
            <span>|</span>
            <span>Node 20+ Runtime</span>
            <span>|</span>
            <span>Playwright Hydration</span>
            <span>|</span>
            <span>Full Asset Bundler</span>
          </div>
        </div>
      </section>

      {/* ── Raycast Job Result Panel ───────────────────────────────────────── */}
      {job && (
        <section className="max-w-[960px] mx-auto px-4 sm:px-6 pb-20 space-y-4">
          
          {isActive && (
            <div className="bg-[#ff6363]/10 border border-[#ff6363]/30 rounded-[10px] p-3 text-xs text-[#ff6363] flex flex-col sm:flex-row items-center justify-between gap-2 font-mono">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#ff6363] animate-ping" />
                <span>EXPORT IN PROGRESS — DO NOT REFRESH OR CLOSE THIS TAB FOR LIVE VIEW</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-[#9c9c9d]">Background worker active</span>
                <button
                  onClick={handleCancel}
                  className="px-2.5 py-1 rounded-[6px] bg-[#1b1c1e]/60 border border-[#ff6363]/40 text-[#ff6363] hover:bg-[#ff6363]/20 text-[10px] transition-colors cursor-pointer"
                >
                  Cancel Export
                </button>
              </div>
            </div>
          )}

          <div className="raycast-key-card p-6 sm:p-8 space-y-6">
            
            {/* Status Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#1b1c1e]">
              <div className="space-y-1">
                <div className="text-[11px] font-mono text-[#6a6b6c]">Job ID: {job.id}</div>
                <div className="text-sm font-medium text-[#ffffff] flex items-center gap-2">
                  {job.status === 'completed' && <span className="text-[#59d499]"><Icon.Check size={16} /></span>}
                  {job.status === 'failed'    && <span className="text-red-400"><Icon.X size={16} /></span>}
                  {job.status === 'cancelled' && <span className="text-amber-400"><Icon.X size={16} /></span>}
                  {isActive && <Icon.Spinner size={16} />}
                  <span>{job.progressMessage}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {job.status === 'completed' && job.downloadUrl && (
                  <>
                    {job.zipSizeKb && (
                      <span className="font-mono text-xs text-[#6a6b6c]">{job.zipSizeKb} KB ({job.pageCount || 1} pages)</span>
                    )}
                    {job.paymentApproved || isAdmin ? (
                      <a
                        href={getDirectBackendUrl(job.downloadUrl)}
                        download
                        onClick={async (e) => {
                          // Admin free-pass: plain anchor navigation can't carry
                          // the Firebase ID token the download route needs to
                          // bypass the payment gate. Download via authenticated
                          // fetch + blob instead.
                          if (!isAdmin || job.paymentApproved) return;
                          e.preventDefault();
                          try {
                            const token = await getIdToken();
                            const res = await fetch(getDirectBackendUrl(job.downloadUrl!), {
                              headers: token ? { Authorization: `Bearer ${token}` } : {},
                            });
                            if (!res.ok) {
                              let msg = 'Download failed';
                              try { const b = await res.json(); if (b?.error) msg = b.error; } catch {}
                              alert(msg);
                              return;
                            }
                            const blob = await res.blob();
                            const blobUrl = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = blobUrl;
                            a.download = `${job.id}.zip`;
                            document.body.appendChild(a);
                            a.click();
                            a.remove();
                            URL.revokeObjectURL(blobUrl);
                          } catch (err: unknown) {
                            alert('Download failed: ' + ((err as Error)?.message || 'network error'));
                          }
                        }}
                        className="raycast-button-primary px-4 py-2 text-xs font-medium flex items-center gap-2 bg-emerald-500 text-black font-semibold hover:bg-emerald-400"
                      >
                        <Icon.Download />
                        <span>Download ZIP {isAdmin ? '(Admin Free Pass)' : '(Approved)'}</span>
                      </a>
                    ) : job.paymentSubmitted ? (
                      <button
                        onClick={() => setIsPaywallOpen(true)}
                        className="px-4 py-2 text-xs font-medium rounded-[8px] bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-2 cursor-pointer"
                      >
                        <Icon.Spinner size={14} />
                        <span>Payment Submitted — Awaiting Admin Approval</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => setIsPaywallOpen(true)}
                        className="raycast-button-primary px-4 py-2 text-xs font-medium flex items-center gap-2 bg-[#ff6363] text-black font-semibold hover:bg-[#ff7575] cursor-pointer"
                      >
                        <Icon.Download />
                        <span>Pay & Unlock Download (₹{job.amount || 20})</span>
                      </button>
                    )}
                  </>
                )}
                {!isActive && (
                  <button
                    onClick={handleReset}
                    className="px-3 py-2 rounded-[8px] bg-[#1b1c1e] text-[#9c9c9d] hover:text-white text-xs font-medium border border-[#363739] transition-colors cursor-pointer"
                  >
                    New Export
                  </button>
                )}
              </div>
            </div>

            {/* Pipeline Step Badges */}
            <div className="flex flex-wrap gap-2">
              {STEPS.map((s) => (
                <StepBadge key={s.key} state={stepState(job.status, s.key)} label={s.label} />
              ))}
            </div>

            {/* Failure Diagnostic Card */}
            {job.status === 'failed' && (
              <div className="p-4 rounded-[10px] bg-red-500/10 border border-red-500/30 text-xs text-red-300 space-y-2">
                <div className="flex items-center gap-2 font-medium text-red-400">
                  <Icon.X size={16} />
                  <span>Compilation Issue Diagnosis</span>
                </div>
                <p className="text-[#dcdcdc] font-mono text-[11px] leading-relaxed">
                  {job.error || 'The export process encountered an unexpected error.'}
                </p>
                <div className="text-[11px] text-[#9c9c9d] pt-1 space-y-1">
                  {job.error?.toLowerCase().includes('ssrf') || job.error?.toLowerCase().includes('forbidden') || job.error?.toLowerCase().includes('loopback') ? (
                    <p>💡 <strong>Remedy:</strong> The requested URL resolved to a private/internal IP address or cloud metadata endpoint, which is blocked by SiteCompiler&apos;s Anti-SSRF firewall. Please supply a publicly reachable URL.</p>
                  ) : job.error?.toLowerCase().includes('timeout') ? (
                    <p>💡 <strong>Remedy:</strong> The target website took too long to respond or execute JavaScript. Try again or check if the website is currently online and responsive.</p>
                  ) : (
                    <p>💡 <strong>Remedy:</strong> Ensure the target site is publicly accessible, has valid SSL certificates, and does not require active login session cookies.</p>
                  )}
                </div>
              </div>
            )}

            {/* Preview, Logs & Quality Stats Tabs */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between border-b border-[#1b1c1e] pb-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTab('preview')}
                    className={`px-3 py-1.5 rounded-[6px] text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                      tab === 'preview'
                        ? 'bg-[#1b1c1e] text-white border border-[#363739]'
                        : 'text-[#6a6b6c] hover:text-white'
                    }`}
                  >
                    <Icon.Camera />
                    <span>Screenshots</span>
                  </button>

                  <button
                    onClick={() => setTab('logs')}
                    className={`px-3 py-1.5 rounded-[6px] text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                      tab === 'logs'
                        ? 'bg-[#1b1c1e] text-white border border-[#363739]'
                        : 'text-[#6a6b6c] hover:text-white'
                    }`}
                  >
                    <Icon.Terminal />
                    <span>Execution Logs</span>
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#ff6363] animate-pulse" />}
                  </button>

                  {job.status === 'completed' && (
                    <button
                      onClick={() => setTab('stats')}
                      className={`px-3 py-1.5 rounded-[6px] text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                        tab === 'stats'
                          ? 'bg-[#1b1c1e] text-white border border-[#363739]'
                          : 'text-[#6a6b6c] hover:text-white'
                      }`}
                    >
                      <span className="text-[#59d499]"><Icon.Check size={14} /></span>
                      <span>Quality & Stats</span>
                    </button>
                  )}
                </div>

                {tab === 'preview' && (
                  <div className="flex items-center gap-1 bg-[#1b1c1e] p-1 rounded-[6px] border border-[#363739]">
                    {(['desktop', 'tablet', 'mobile'] as const).map((vp) => (
                      <button
                        key={vp}
                        onClick={() => setViewport(vp)}
                        className={`p-1.5 rounded-[4px] transition-colors cursor-pointer ${
                          viewport === vp ? 'bg-[#ff6363] text-[#07080a]' : 'text-[#6a6b6c] hover:text-white'
                        }`}
                        title={`${vp} viewport`}
                      >
                        {viewportIcons[vp]}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {tab === 'preview' ? (
                <div className="raycast-key-card p-4 rounded-[10px] min-h-[300px] max-h-[550px] overflow-y-auto bg-[#040506] scrollbar-thin scrollbar-thumb-[#363739]">
                  {job.id ? (
                    <div className="transition-all duration-300 ease-in-out">
                      <img
                        key={`${viewport}-${job.id}`}
                        src={getDirectBackendUrl(`/api/job/${job.id}/screenshot?type=${viewport}`)}
                        alt={`${viewport} screenshot`}
                        className={`h-auto rounded-[6px] border border-[#2f3031] shadow-xl block mx-auto transition-all duration-300 ${
                          viewport === 'mobile'
                            ? 'w-[340px] max-w-full'
                            : viewport === 'tablet'
                            ? 'w-[560px] max-w-full'
                            : 'w-full max-w-full'
                        }`}
                        onError={(e) => {
                          const target = e.currentTarget;
                          const desktopUrl = getDirectBackendUrl(`/api/job/${job.id}/screenshot?type=desktop`);
                          if (target.src !== desktopUrl) {
                            target.src = desktopUrl;
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div className="text-center space-y-2 py-12 text-[#6a6b6c]">
                      <Icon.Camera />
                      <div className="text-xs font-mono">Screenshots rendering…</div>
                    </div>
                  )}
                </div>
              ) : tab === 'logs' ? (
                <div className="raycast-key-card p-4 rounded-[10px] font-mono text-xs text-[#9c9c9d] bg-[#040506] max-h-[350px] overflow-y-auto space-y-1.5">
                  {job.logs.map((l, idx) => (
                    <div key={idx} className="leading-relaxed">
                      {formatLogLine(l)}
                    </div>
                  ))}
                  <div ref={logEndRef} />
                </div>
              ) : (
                /* Quality & Telemetry Stats Tab */
                <div className="raycast-key-card p-6 rounded-[10px] space-y-5 bg-[#040506] text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-3.5 rounded-[8px] bg-[#111214] border border-[#2f3031] space-y-1">
                      <div className="text-[10px] font-mono text-[#6a6b6c] uppercase">Target Architecture</div>
                      <div className="text-white font-medium text-sm capitalize">{job.format} Engine</div>
                      <div className="text-[10px] text-[#59d499]">Validated output scaffold</div>
                    </div>
                    <div className="p-3.5 rounded-[8px] bg-[#111214] border border-[#2f3031] space-y-1">
                      <div className="text-[10px] font-mono text-[#6a6b6c] uppercase">Pages Compiled</div>
                      <div className="text-white font-medium text-sm">{job.pageCount || 1} HTML Document(s)</div>
                      <div className="text-[10px] text-[#9c9c9d]">All internal links resolved</div>
                    </div>
                    <div className="p-3.5 rounded-[8px] bg-[#111214] border border-[#2f3031] space-y-1">
                      <div className="text-[10px] font-mono text-[#6a6b6c] uppercase">Bundle Archive Size</div>
                      <div className="text-white font-medium text-sm">{job.zipSizeKb || 0} KB</div>
                      <div className="text-[10px] text-[#9c9c9d]">ZIP package with README.md</div>
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-[#1b1c1e] pt-4">
                    <div className="text-xs font-medium text-white">Pipeline Quality Verifications</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono text-[#9c9c9d]">
                      <div className="flex items-center gap-2 p-2 rounded bg-[#111214]/60">
                        <span className="text-[#59d499]">✓</span>
                        <span>SSRF & Redirect Guard: Verified Clean</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded bg-[#111214]/60">
                        <span className="text-[#59d499]">✓</span>
                        <span>Playwright Hydration: DOM Serialized</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded bg-[#111214]/60">
                        <span className="text-[#59d499]">✓</span>
                        <span>Watermarks & Badges: Stripped</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded bg-[#111214]/60">
                        <span className="text-[#59d499]">✓</span>
                        <span>Consolidated CSS & Asset Relinking: OK</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Export Summary Footer */}
            {job.status === 'completed' && (
              <div className="p-4 rounded-[10px] bg-[#1b1c1e]/50 border border-[#2f3031] text-xs text-[#9c9c9d] flex items-center gap-3">
                <Icon.BookOpen />
                <div>
                  The generated ZIP includes all captured subpages, bundled assets, consolidated CSS, and a <strong className="text-white">README.md</strong> with deployment steps for Vercel, Netlify, Cloudflare Pages, and local preview.
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* FAQ Section */}
      <section className="max-w-[800px] mx-auto px-4 sm:px-6 py-16 space-y-8 border-t border-[#1b1c1e]">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-normal text-[#ffffff]">Frequently Asked Questions</h2>
          <p className="text-xs text-[#6a6b6c]">Everything you need to know about SiteCompiler.</p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div key={idx} className="raycast-key-card p-6 space-y-2">
              <h3 className="text-sm font-medium text-[#ffffff]">{faq.question}</h3>
              <p className="text-xs text-[#9c9c9d] leading-relaxed">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
