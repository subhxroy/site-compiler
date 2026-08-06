'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { getApiUrl } from '@/lib/api-config';
import { useAuth } from '@/lib/firebase/auth-context';

type OutputFormat = 'html' | 'react' | 'nextjs';
type JobStatus =
  | 'pending'
  | 'crawling'
  | 'parsing'
  | 'detecting'
  | 'generating'
  | 'zipping'
  | 'completed'
  | 'failed';

interface JobState {
  id: string;
  url: string;
  format: OutputFormat;
  status: JobStatus;
  progressMessage: string;
  logs: string[];
  downloadUrl?: string;
  zipSizeKb?: number;
  screenshots?: { desktop: string; tablet: string; mobile: string };
  error?: string;
}

const STEPS: { key: JobStatus; label: string }[] = [
  { key: 'crawling',   label: 'Crawling site'     },
  { key: 'parsing',    label: 'Processing assets' },
  { key: 'detecting',  label: 'Analysing layout'  },
  { key: 'generating', label: 'Generating code'   },
  { key: 'zipping',    label: 'Packaging ZIP'     },
];

const STATUS_ORDER: JobStatus[] = [
  'pending','crawling','parsing','detecting','generating','zipping','completed',
];

function stepState(current: JobStatus, step: JobStatus): 'done' | 'active' | 'idle' | 'failed' {
  if (current === 'failed') return 'failed';
  const ci = STATUS_ORDER.indexOf(current);
  const si = STATUS_ORDER.indexOf(step);
  if (current === 'completed' || (ci > si && ci !== -1)) return 'done';
  if (ci === si) return 'active';
  return 'idle';
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
  value, selected, title, description, badge, onClick,
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
  const { user, saveUserExport } = useAuth();
  const [url,      setUrl]      = useState('');
  const [format,   setFormat]   = useState<OutputFormat>('html');
  const [loading,  setLoading]  = useState(false);
  const [jobId,    setJobId]    = useState<string | null>(null);
  const [job,      setJob]      = useState<JobState | null>(null);
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [tab,      setTab]      = useState<'preview' | 'logs'>('preview');
  const logEndRef = useRef<HTMLDivElement>(null);
  const [savedToFirebase, setSavedToFirebase] = useState(false);

  // Restore job state on page load or refresh (from query param or localStorage)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const queryJobId = params.get('jobId');
    const savedJobId = queryJobId || localStorage.getItem('sitecompiler_active_job_id');

    if (savedJobId) {
      setJobId(savedJobId);
      setLoading(true);
      fetch(getApiUrl(`/api/job/${savedJobId}/status`))
        .then((res) => (res.ok ? res.json() : null))
        .then((data: JobState | null) => {
          if (data && data.id) {
            setJob(data);
            if (data.url) setUrl(data.url);
            if (data.format) setFormat(data.format);
            if (data.status === 'completed' || data.status === 'failed') {
              setLoading(false);
            }
          } else {
            setLoading(false);
            localStorage.removeItem('sitecompiler_active_job_id');
          }
        })
        .catch(() => {
          setLoading(false);
          localStorage.removeItem('sitecompiler_active_job_id');
        });
    }
  }, []);

  // Poll status while job is running
  useEffect(() => {
    if (!jobId) return;
    const iv = setInterval(async () => {
      try {
        const res = await fetch(getApiUrl(`/api/job/${jobId}/status`));
        if (res.ok) {
          const data: JobState = await res.json();
          setJob(data);
          if (data.status === 'completed' || data.status === 'failed') {
            setLoading(false);
            localStorage.removeItem('sitecompiler_active_job_id');
            clearInterval(iv);
          }
        }
      } catch {}
    }, 1000);
    return () => clearInterval(iv);
  }, [jobId]);

  // Save to Firebase Firestore when completed and user is logged in
  useEffect(() => {
    if (job && job.status === 'completed' && user && !savedToFirebase) {
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
    const isExporting = loading || (job && !['completed', 'failed'].includes(job.status));
    if (!isExporting) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const msg = 'Site export in progress! If you refresh, live status updates will pause (background process continues).';
      e.preventDefault();
      e.returnValue = msg;
      return msg;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [loading, job?.status]);

  useEffect(() => {
    if (tab === 'logs') logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [job?.logs, tab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setJob(null);
    setJobId(null);
    setTab('preview');
    try {
      const res = await fetch(getApiUrl('/api/export'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), format }),
      });
      const data = await res.json();
      if (res.ok && data.jobId) {
        setJobId(data.jobId);
        localStorage.setItem('sitecompiler_active_job_id', data.jobId);
        if (typeof window !== 'undefined') {
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.set('jobId', data.jobId);
          window.history.replaceState({}, '', newUrl.toString());
        }
      } else {
        alert(data.error || 'Failed to start export');
        setLoading(false);
      }
    } catch {
      alert('Network error — is the server running?');
      setLoading(false);
    }
  };

  const handleReset = () => {
    setJob(null);
    setJobId(null);
    setLoading(false);
    localStorage.removeItem('sitecompiler_active_job_id');
    if (typeof window !== 'undefined') {
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('jobId');
      window.history.replaceState({}, '', newUrl.toString());
    }
  };

  const isActive   = loading || (job && job.status !== 'completed' && job.status !== 'failed');
  const isComplete = job?.status === 'completed';
  const isFailed   = job?.status === 'failed';
  const viewWidths = { desktop: '100%', tablet: '768px', mobile: '390px' };

  return (
    <main className="pt-24">
      {/* ── Raycast Atmospheric Hero Section ──────────────────────────────── */}
      <section className="relative overflow-hidden px-4 sm:px-6 pt-12 pb-20 md:pt-20 md:pb-28">
        
        {/* Hero Atmospheric Backdrop */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-[radial-gradient(ellipse_at_center,rgba(4,63,150,0.35)_0%,rgba(6,18,37,0.1)_70%,transparent_100%)] rounded-full blur-[80px]" />
          <div className="absolute top-[20%] left-1/3 w-[320px] h-[180px] bg-[#ff6363]/20 rounded-full blur-[100px] transform -rotate-12" />
        </div>

        <div className="relative z-10 max-w-[1200px] mx-auto text-center space-y-6">
          
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[6px] bg-[#1b1c1e] border border-[#2f3031] text-[11px] font-mono text-[#ff6363] uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff6363] animate-pulse" />
            Localhost Cockpit · Single Node Pipeline · Zero Billing
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
                      title="Next.js 15"
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
                      <span>Export Site to Clean Source</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 font-mono text-[12px] text-[#6a6b6c] pt-2">
            <span>v1.104.21</span>
            <span>|</span>
            <span>Localhost Node 20+</span>
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
              <span className="text-[10px] text-[#9c9c9d]">Background worker active</span>
            </div>
          )}

          <div className={`p-5 rounded-16px raycast-key-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
            isComplete ? 'border-[#59d499]/40' : isFailed ? 'border-red-500/40' : 'border-[#2f3031]'
          }`}>
            <div className="min-w-0 flex-1">
              <div className="font-mono text-[11px] text-[#6a6b6c] mb-1 truncate">Job ID: {job.id}</div>
              <div className={`text-sm font-medium flex items-center gap-2 ${
                isComplete ? 'text-[#59d499]' : isFailed ? 'text-red-400' : 'text-[#ffffff]'
              }`}>
                {isActive   && <Icon.Spinner size={15} />}
                {isComplete && <Icon.Check size={15} />}
                {isFailed   && <Icon.X size={15} />}
                <span className="truncate">{job.progressMessage}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-none">
              {isComplete && job.zipSizeKb && (
                <span className="font-mono text-xs text-[#9c9c9d]">{job.zipSizeKb} KB</span>
              )}
              {isComplete && job.downloadUrl && (
                <a
                  href={getApiUrl(job.downloadUrl)}
                  className="raycast-button-primary px-4 py-2 text-xs flex items-center gap-1.5"
                >
                  <Icon.Download />
                  <span>Download ZIP</span>
                </a>
              )}
              {(isComplete || isFailed) && (
                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 rounded-[8px] bg-[#1b1c1e] text-[#9c9c9d] hover:text-white border border-[#2f3031] text-xs font-medium transition-colors cursor-pointer"
                >
                  New Export
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {STEPS.map((s) => (
              <StepBadge key={s.key} state={stepState(job.status, s.key)} label={s.label} />
            ))}
          </div>

          {(job.screenshots || (job.logs && job.logs.length > 0)) && (
            <div className="raycast-key-card overflow-hidden">
              <div className="flex items-center border-b border-[#2f3031] px-3 pt-2 gap-2 bg-[#07080a]">
                <button
                  onClick={() => setTab('preview')}
                  className={`px-4 py-2 text-xs font-medium rounded-t-[6px] transition-colors flex items-center gap-1.5 cursor-pointer ${
                    tab === 'preview' ? 'bg-[#111214] text-[#ffffff] border-t border-x border-[#2f3031]' : 'text-[#9c9c9d] hover:text-[#ffffff]'
                  }`}
                >
                  <Icon.Camera />
                  <span>Screenshots</span>
                </button>
                <button
                  onClick={() => setTab('logs')}
                  className={`px-4 py-2 text-xs font-medium rounded-t-[6px] transition-colors flex items-center gap-1.5 cursor-pointer ${
                    tab === 'logs' ? 'bg-[#111214] text-[#ffffff] border-t border-x border-[#2f3031]' : 'text-[#9c9c9d] hover:text-[#ffffff]'
                  }`}
                >
                  <Icon.Terminal />
                  <span>Execution Logs</span>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#ff6363] animate-pulse" />}
                </button>

                {tab === 'preview' && job.screenshots && (
                  <div className="ml-auto flex items-center gap-1 bg-[#111214] border border-[#2f3031] rounded-[6px] p-0.5 mb-1">
                    {(['desktop','tablet','mobile'] as const).map((v) => (
                      <button
                        key={v}
                        onClick={() => setViewport(v)}
                        title={v.charAt(0).toUpperCase() + v.slice(1)}
                        className={`p-1.5 rounded-[4px] transition-all cursor-pointer ${
                          viewport === v ? 'bg-[#ff6363] text-[#040506]' : 'text-[#6a6b6c] hover:text-[#ffffff]'
                        }`}
                      >
                        {viewportIcons[v]}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 bg-[#040506]">
                {tab === 'preview' ? (
                  job.screenshots ? (
                    <div className="w-full overflow-auto bg-[#07080a] rounded-[8px] p-2 border border-[#2f3031]">
                      <div
                        className="mx-auto transition-all duration-300"
                        style={{ maxWidth: viewWidths[viewport] }}
                      >
                        <img
                          src={getApiUrl(job.screenshots[viewport])}
                          alt={`${viewport} screenshot`}
                          className="w-full object-top block rounded-[6px]"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="h-40 flex flex-col items-center justify-center text-[#6a6b6c] text-xs gap-2">
                      <Icon.Camera />
                      {isActive ? 'Screenshots rendering...' : 'No screenshots captured'}
                    </div>
                  )
                ) : (
                  <div className="font-mono text-[12px] text-[#9c9c9d] bg-[#07080a] border border-[#2f3031] rounded-[8px] p-4 h-64 overflow-y-auto space-y-1 leading-relaxed">
                    {job.logs.map((line, i) => (
                      <div key={i} className={line.includes('ERROR') ? 'text-red-400' : ''}>
                        <span className="text-[#6a6b6c] select-none">&gt; </span>
                        {line}
                      </div>
                    ))}
                    <div ref={logEndRef} />
                  </div>
                )}
              </div>
            </div>
          )}

          {isComplete && (
            <div className="flex items-start gap-3 p-4 rounded-[12px] bg-[#111214] border border-[#2f3031] text-xs text-[#9c9c9d]">
              <Icon.BookOpen />
              <p className="leading-relaxed">
                The generated ZIP includes all captured subpages, bundled assets, consolidated CSS, and a{' '}
                <strong className="text-[#ffffff]">README.md</strong> with deployment steps for Vercel, Netlify, Cloudflare Pages, and local preview.
              </p>
            </div>
          )}
        </section>
      )}

      {/* ── Raycast Feature Grid ── */}
      <section id="features" className="py-20 border-t border-[#1b1c1e] bg-[#040506]">
        <div className="max-w-[1100px] mx-auto px-6">
          <h2 className="text-2xl sm:text-3xl font-medium text-[#ffffff] text-center mb-2">
            Engineered for precision website reconstruction.
          </h2>
          <p className="text-[#6a6b6c] text-center text-sm mb-12">Every element, asset, and script captured faithfully.</p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                icon: <Icon.FileCode />,
                title: 'Full DOM Capture',
                desc: 'Playwright auto-scroll captures post-hydrated DOM elements, Framer Motion states, and dynamic components.',
              },
              {
                icon: <Icon.Layers />,
                title: 'All Assets Bundled',
                desc: 'Images, SVG icons, embedded videos, and web fonts are fetched and saved locally for offline usage.',
              },
              {
                icon: <Icon.Camera />,
                title: 'Multi-Viewport Capture',
                desc: 'Desktop (1440px), tablet (768px), and mobile (390px) screenshots generated automatically for audit.',
              },
              {
                icon: <Icon.Archive />,
                title: 'Single Clean ZIP',
                desc: 'Packaged into a single clean zip archive ready for instant local preview or hosting deployment.',
              },
              {
                icon: <Icon.BookOpen />,
                title: 'README Included',
                desc: 'Complete deployment instructions included in every ZIP for Netlify, Vercel, FTP, and localhost.',
              },
              {
                icon: <Icon.Globe />,
                title: 'Universal Platform Support',
                desc: 'Framer, WordPress, Webflow, Wix, Squarespace, Shopify, and custom static sites supported.',
              },
            ].map((f) => (
              <div
                key={f.title}
                className="raycast-key-card p-6 space-y-3 hover:border-[#454647] transition-all"
              >
                <div className="w-10 h-10 rounded-full bg-[#111214] border border-[#2f3031] flex items-center justify-center text-[#e6e6e6]">
                  {f.icon}
                </div>
                <div className="text-[#ffffff] font-medium text-base">{f.title}</div>
                <div className="text-[#9c9c9d] text-xs leading-relaxed font-normal">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ Section with Schema Support ── */}
      <section className="py-20 border-t border-[#1b1c1e] bg-[#07080a]">
        <div className="max-w-3xl mx-auto px-6 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-medium text-white">Frequently Asked Questions</h2>
            <p className="text-sm text-[#9c9c9d]">Everything you need to know about SiteCompiler export architecture.</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div key={idx} className="raycast-key-card p-6 space-y-2">
                <h3 className="text-base font-medium text-white">{faq.question}</h3>
                <p className="text-xs text-[#9c9c9d] leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
