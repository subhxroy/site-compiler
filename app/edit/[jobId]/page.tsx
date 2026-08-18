'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/firebase/auth-context';
import { PaywallModal } from '@/components/paywall-modal';
import {
  ArrowLeft,
  Save,
  Download,
  ExternalLink,
  Check,
  AlertCircle,
  RotateCcw,
  Loader2,
  Image as ImageIcon,
  Type,
  Lock,
  Monitor,
  Tablet,
  Smartphone,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Layers,
  FileCode,
  FolderOpen,
  Search,
  Sliders,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Upload,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  ChevronRight,
  Globe,
} from 'lucide-react';

interface PatchItem {
  nodeId: string;
  content?: string;
  src?: string;
  alt?: string;
  href?: string;
  styles?: Record<string, string>;
}

interface TreeElement {
  id: string;
  tag: string;
  type: 'text' | 'image' | 'link';
  label: string;
  src?: string;
  alt?: string;
}

interface SelectedNodeState {
  nodeId: string;
  tag: string;
  content: string;
  src: string;
  alt: string;
  href: string;
  styles: {
    fontSize?: string;
    color?: string;
    backgroundColor?: string;
    opacity?: string;
    textAlign?: string;
  };
}

export default function EditExportPage() {
  const params = useParams();
  const jobId = typeof params?.jobId === 'string' ? params.jobId : '';

  const { user, isAdmin } = useAuth();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [patches, setPatches] = useState<Map<string, PatchItem>>(new Map());
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previewVersion, setPreviewVersion] = useState(0);

  const [jobData, setJobData] = useState<{
    url: string;
    pageCount: number;
    paymentApproved?: boolean;
    paymentSubmitted?: boolean;
    price?: number;
    capturedPages?: Array<{ htmlFilename: string; title: string; url?: string }>;
  } | null>(null);
  const [activePage, setActivePage] = useState<string>('index.html');
  const [availablePages, setAvailablePages] = useState<Array<{ htmlFilename: string; title: string }>>([
    { htmlFilename: 'index.html', title: 'Home' }
  ]);

  const [viewportMode, setViewportMode] = useState<'desktop' | 'tablet' | 'mobile' | 'fill'>('desktop');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [leftTab, setLeftTab] = useState<'layers' | 'pages' | 'assets'>('layers');
  const [showLeftSidebar, setShowLeftSidebar] = useState<boolean>(true);
  const [showRightSidebar, setShowRightSidebar] = useState<boolean>(true);

  const [elementTree, setElementTree] = useState<TreeElement[]>([]);
  const [layerSearch, setLayerSearch] = useState('');
  const [selectedNode, setSelectedNode] = useState<SelectedNodeState | null>(null);
  const [discoveredAssets, setDiscoveredAssets] = useState<string[]>([]);

  const [showPaywall, setShowPaywall] = useState(false);
  const [paymentNotice, setPaymentNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;

    fetch(`/api/job/${jobId}/status`)
      .then((r) => r.json())
      .then((data) => {
        if (data && data.job) {
          setJobData(data.job);
          if (data.job.capturedPages && data.job.capturedPages.length > 0) {
            setAvailablePages(data.job.capturedPages);
          }
        }
      })
      .catch(() => {});

    const fetchModel = async () => {
      try {
        const idToken = user ? await user.getIdToken() : '';
        const res = await fetch(`/api/job/${jobId}/model`, {
          headers: idToken ? { 'Authorization': `Bearer ${idToken}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.nodes) {
            const rawNodes = data.nodes as Record<string, { tag: string; type: string; content?: string; src?: string; alt?: string }>;
            const tree: TreeElement[] = Object.entries(rawNodes).map(([id, n]) => ({
              id,
              tag: n.tag || 'div',
              type: (n.type as 'text' | 'image' | 'link') || (n.tag === 'img' ? 'image' : 'text'),
              label: n.content ? (n.content.length > 45 ? n.content.slice(0, 45) + '...' : n.content) : (n.alt || n.tag.toUpperCase()),
              src: n.src,
              alt: n.alt,
            }));
            setElementTree(tree);

            const imgs: string[] = [];
            Object.values(rawNodes).forEach((n) => {
              if (n.src && !imgs.includes(n.src)) imgs.push(n.src);
            });
            if (imgs.length > 0) setDiscoveredAssets(imgs);
          }
        }
      } catch {}
    };
    fetchModel();
  }, [jobId, user]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== 'object') return;

      if (event.data.type === 'sc-edit') {
        const { nodeId, content, src, alt, href, styles } = event.data;
        if (!nodeId) return;

        setPatches((prev) => {
          const next = new Map(prev);
          const existing: PatchItem = next.get(nodeId) || { nodeId };
          if (content !== undefined) existing.content = content;
          if (src !== undefined) existing.src = src;
          if (alt !== undefined) existing.alt = alt;
          if (href !== undefined) existing.href = href;
          if (styles !== undefined) existing.styles = styles;
          next.set(nodeId, existing);
          return next;
        });

        setSelectedNode((prev) => {
          if (!prev || prev.nodeId !== nodeId) return prev;
          return {
            ...prev,
            content: content !== undefined ? content : prev.content,
            src: src !== undefined ? src : prev.src,
            alt: alt !== undefined ? alt : prev.alt,
            href: href !== undefined ? href : prev.href,
            styles: styles !== undefined ? { ...prev.styles, ...styles } : prev.styles,
          };
        });
        setSavedSuccess(false);
      } else if (event.data.type === 'sc-select') {
        setSelectedNode({
          nodeId: event.data.nodeId,
          tag: event.data.tag || 'div',
          content: event.data.content || '',
          src: event.data.src || '',
          alt: event.data.alt || '',
          href: event.data.href || '',
          styles: event.data.styles || {},
        });
      } else if (event.data.type === 'sc-select-image') {
        setSelectedNode({
          nodeId: event.data.nodeId,
          tag: 'img',
          content: '',
          src: event.data.src || '',
          alt: '',
          href: '',
          styles: {},
        });
      } else if (event.data.type === 'sc-ready') {
        if (Array.isArray(event.data.elements) && event.data.elements.length > 0) {
          setElementTree(event.data.elements);
          const imgs: string[] = [];
          event.data.elements.forEach((el: TreeElement) => {
            if (el.src && !imgs.includes(el.src)) imgs.push(el.src);
          });
          if (imgs.length > 0) setDiscoveredAssets(imgs);
        }
      } else if (event.data.type === 'sc-tree-response') {
        if (Array.isArray(event.data.elements)) {
          setElementTree(event.data.elements);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const postToIframe = (data: unknown) => {
    try {
      iframeRef.current?.contentWindow?.postMessage(data, '*');
    } catch {}
  };

  const handleSelectLayer = (el: TreeElement) => {
    setSelectedNode({
      nodeId: el.id,
      tag: el.tag,
      content: el.type === 'image' ? '' : el.label,
      src: el.src || '',
      alt: el.alt || '',
      href: '',
      styles: {},
    });
    postToIframe({ type: 'sc-highlight-node', nodeId: el.id });
  };

  const handleInspectorChange = (updates: Partial<SelectedNodeState>) => {
    if (!selectedNode) return;
    const updated: SelectedNodeState = { ...selectedNode, ...updates };
    setSelectedNode(updated);

    setPatches((prev) => {
      const next = new Map(prev);
      const existing: PatchItem = next.get(updated.nodeId) || { nodeId: updated.nodeId };
      if (updates.content !== undefined) existing.content = updates.content;
      if (updates.src !== undefined) existing.src = updates.src;
      if (updates.alt !== undefined) existing.alt = updates.alt;
      if (updates.href !== undefined) existing.href = updates.href;
      if (updates.styles !== undefined) existing.styles = { ...existing.styles, ...updates.styles };
      next.set(updated.nodeId, existing);
      return next;
    });

    postToIframe({
      type: 'sc-update-node',
      nodeId: updated.nodeId,
      content: updates.content,
      src: updates.src,
      alt: updates.alt,
      href: updates.href,
      styles: updates.styles,
    });
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedNode) return;

    const reader = new FileReader();
    reader.onload = (uploadEvt) => {
      const dataUri = uploadEvt.target?.result as string;
      if (dataUri) {
        handleInspectorChange({ src: dataUri });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (patches.size === 0) return;
    setSaving(true);
    setErrorMsg(null);

    const patchList = Array.from(patches.values());

    try {
      const idToken = user ? await user.getIdToken() : '';
      const res = await fetch(`/api/job/${jobId}/model`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': idToken ? `Bearer ${idToken}` : '',
        },
        body: JSON.stringify({ patches: patchList }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to save edits');
      }

      setPatches(new Map());
      setSavedSuccess(true);
      setPreviewVersion((v) => v + 1);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred while saving';
      setErrorMsg(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setPatches(new Map());
    setSelectedNode(null);
    setPreviewVersion((v) => v + 1);
  };

  const handlePageChange = (filename: string) => {
    setActivePage(filename);
    setSelectedNode(null);
    setPreviewVersion((v) => v + 1);
  };

  const filteredTree = useMemo(() => {
    if (!layerSearch.trim()) return elementTree;
    const q = layerSearch.toLowerCase();
    return elementTree.filter((el) => el.label.toLowerCase().includes(q) || el.tag.toLowerCase().includes(q));
  }, [elementTree, layerSearch]);

  const pendingCount = patches.size;

  const viewportWidth =
    viewportMode === 'mobile' ? '390px' :
    viewportMode === 'tablet' ? '768px' :
    viewportMode === 'desktop' ? '1440px' : '100%';

  return (
    <div className="min-h-screen bg-[#07080a] text-white flex flex-col font-sans select-none overflow-hidden h-screen">
      <header className="h-14 bg-[#0e1014] border-b border-[#22242a] px-4 flex items-center justify-between gap-3 z-30 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/history"
            className="p-1.5 rounded-lg bg-[#17191f] hover:bg-[#20232a] text-[#8a8b8d] hover:text-white transition-colors flex items-center justify-center shrink-0"
            title="Back to History"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-[#ff6363] to-[#ff8640] flex items-center justify-center font-black text-black text-xs shrink-0">
              F
            </div>
            <div className="min-w-0 hidden sm:block">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-xs text-white truncate">Studio Editor</span>
                <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.2 rounded bg-[#ff6363]/10 text-[#ff6363] border border-[#ff6363]/20 font-mono font-semibold">
                  PRO
                </span>
              </div>
            </div>
          </div>

          <div className="h-4 w-[1px] bg-[#22242a] hidden md:block" />

          <div className="flex items-center gap-1.5 bg-[#14161c] border border-[#22242a] rounded-lg px-2 py-1">
            <FileCode className="w-3.5 h-3.5 text-[#ff6363] shrink-0" />
            <select
              value={activePage}
              onChange={(e) => handlePageChange(e.target.value)}
              className="bg-transparent text-xs text-white outline-none cursor-pointer pr-1 font-medium max-w-[140px] truncate"
            >
              {availablePages.map((p) => (
                <option key={p.htmlFilename} value={p.htmlFilename} className="bg-[#14161c] text-white">
                  {p.title || p.htmlFilename}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-[#14161c] p-1 rounded-xl border border-[#22242a]">
          <button
            onClick={() => setViewportMode('desktop')}
            className={`p-1.5 rounded-lg transition-all text-xs flex items-center gap-1 cursor-pointer ${
              viewportMode === 'desktop' ? 'bg-[#22242a] text-white shadow-sm' : 'text-[#8a8b8d] hover:text-white'
            }`}
            title="Desktop Viewport (1440px)"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="hidden lg:inline text-[11px]">1440px</span>
          </button>
          <button
            onClick={() => setViewportMode('tablet')}
            className={`p-1.5 rounded-lg transition-all text-xs flex items-center gap-1 cursor-pointer ${
              viewportMode === 'tablet' ? 'bg-[#22242a] text-white shadow-sm' : 'text-[#8a8b8d] hover:text-white'
            }`}
            title="Tablet Viewport (768px)"
          >
            <Tablet className="w-3.5 h-3.5" />
            <span className="hidden lg:inline text-[11px]">768px</span>
          </button>
          <button
            onClick={() => setViewportMode('mobile')}
            className={`p-1.5 rounded-lg transition-all text-xs flex items-center gap-1 cursor-pointer ${
              viewportMode === 'mobile' ? 'bg-[#22242a] text-white shadow-sm' : 'text-[#8a8b8d] hover:text-white'
            }`}
            title="Mobile Viewport (390px)"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden lg:inline text-[11px]">390px</span>
          </button>
          <button
            onClick={() => setViewportMode('fill')}
            className={`p-1.5 rounded-lg transition-all text-xs flex items-center gap-1 cursor-pointer ${
              viewportMode === 'fill' ? 'bg-[#22242a] text-white shadow-sm' : 'text-[#8a8b8d] hover:text-white'
            }`}
            title="Responsive Fullscreen Viewport"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          <div className="h-3.5 w-[1px] bg-[#2a2c34] mx-1" />

          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setZoomLevel((z) => Math.max(50, z - 25))}
              className="p-1 text-[#8a8b8d] hover:text-white rounded transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <span className="text-[10px] font-mono text-[#8a8b8d] px-1">{zoomLevel}%</span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(150, z + 25))}
              className="p-1 text-[#8a8b8d] hover:text-white rounded transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <button
              onClick={handleDiscard}
              disabled={saving}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#17191f] hover:bg-[#20232a] text-xs text-[#8a8b8d] hover:text-white transition-colors cursor-pointer"
              title="Discard All Edits"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Discard ({pendingCount})
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={pendingCount === 0 || saving}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              pendingCount > 0
                ? 'bg-[#ff6363] text-black hover:bg-[#ff7a7a] shadow-md shadow-[#ff6363]/25 animate-pulse'
                : 'bg-[#17191f] text-[#4a4b4e] cursor-not-allowed border border-[#22242a]'
            }`}
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                Save {pendingCount > 0 ? `(${pendingCount})` : ''}
              </>
            )}
          </button>

          <button
            onClick={() => {
              if (isAdmin || jobData?.paymentApproved) {
                const link = document.createElement('a');
                link.href = `/api/job/${jobId}/download`;
                link.setAttribute('download', `sitecompiler-${jobId}.zip`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              } else {
                setShowPaywall(true);
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              isAdmin || jobData?.paymentApproved
                ? 'bg-[#17191f] hover:bg-[#20232a] border border-[#2a2c34] text-white'
                : 'bg-[#ff6363]/10 hover:bg-[#ff6363]/20 border border-[#ff6363]/30 text-[#ff6363]'
            }`}
          >
            {isAdmin || jobData?.paymentApproved ? (
              <Download className="w-3.5 h-3.5 text-[#ff6363]" />
            ) : (
              <Lock className="w-3.5 h-3.5 text-[#ff6363]" />
            )}
            <span className="hidden sm:inline">{isAdmin || jobData?.paymentApproved ? 'Download ZIP' : 'Unlock ZIP'}</span>
          </button>

          <a
            href={`/api/job/${jobId}/preview/${activePage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg bg-[#17191f] hover:bg-[#20232a] text-[#8a8b8d] hover:text-white transition-colors"
            title="Open Live in Fullscreen Tab"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </header>

      {savedSuccess && (
        <div className="absolute top-16 right-6 z-50 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 text-xs shadow-2xl backdrop-blur-md animate-fadeIn">
          <Check className="w-4 h-4 shrink-0" />
          Page updated &amp; ZIP re-compiled successfully!
        </div>
      )}

      {errorMsg && (
        <div className="absolute top-16 right-6 z-50 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-red-950/90 border border-red-500/40 text-red-300 text-xs shadow-2xl backdrop-blur-md animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {errorMsg}
        </div>
      )}

      <div className="flex-1 flex overflow-hidden relative">
        {!showLeftSidebar && (
          <button
            onClick={() => setShowLeftSidebar(true)}
            className="absolute top-3 left-3 z-20 p-1.5 rounded-lg bg-[#14161c] border border-[#22242a] text-[#8a8b8d] hover:text-white shadow-xl cursor-pointer"
            title="Open Layers Sidebar"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        )}

        {showLeftSidebar && (
          <aside className="w-64 bg-[#0e1014] border-r border-[#22242a] flex flex-col shrink-0 z-10 select-none">
            <div className="flex items-center border-b border-[#22242a] px-2 pt-2 bg-[#0c0d11]">
              <button
                onClick={() => setLeftTab('layers')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium border-b-2 transition-all cursor-pointer ${
                  leftTab === 'layers'
                    ? 'border-[#ff6363] text-white bg-[#14161c]'
                    : 'border-transparent text-[#8a8b8d] hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Layers
              </button>
              <button
                onClick={() => setLeftTab('pages')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium border-b-2 transition-all cursor-pointer ${
                  leftTab === 'pages'
                    ? 'border-[#ff6363] text-white bg-[#14161c]'
                    : 'border-transparent text-[#8a8b8d] hover:text-white'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                Pages ({availablePages.length})
              </button>
              <button
                onClick={() => setLeftTab('assets')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium border-b-2 transition-all cursor-pointer ${
                  leftTab === 'assets'
                    ? 'border-[#ff6363] text-white bg-[#14161c]'
                    : 'border-transparent text-[#8a8b8d] hover:text-white'
                }`}
              >
                <FolderOpen className="w-3.5 h-3.5" />
                Assets
              </button>

              <button
                onClick={() => setShowLeftSidebar(false)}
                className="p-1.5 text-[#55565a] hover:text-white rounded transition-colors ml-1 cursor-pointer"
                title="Collapse Sidebar"
              >
                <PanelLeftClose className="w-3.5 h-3.5" />
              </button>
            </div>

            {leftTab === 'layers' && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="p-2 border-b border-[#1b1c22]">
                  <div className="flex items-center gap-1.5 bg-[#17191f] border border-[#22242a] rounded-lg px-2 py-1 text-xs text-[#8a8b8d]">
                    <Search className="w-3 h-3" />
                    <input
                      type="text"
                      placeholder="Search elements..."
                      value={layerSearch}
                      onChange={(e) => setLayerSearch(e.target.value)}
                      className="bg-transparent text-white text-xs outline-none w-full placeholder-[#55565a]"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar">
                  {filteredTree.length === 0 ? (
                    <div className="text-center py-8 text-xs text-[#55565a]">
                      No elements found
                    </div>
                  ) : (
                    filteredTree.map((el) => {
                      const isSelected = selectedNode?.nodeId === el.id;
                      const hasPatch = patches.has(el.id);
                      return (
                        <button
                          key={el.id}
                          onClick={() => handleSelectLayer(el)}
                          className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg text-left text-xs transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#ff6363]/15 text-[#ff6363] border border-[#ff6363]/30 font-medium'
                              : 'text-[#8a8b8d] hover:bg-[#14161c] hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {el.type === 'image' ? (
                              <ImageIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            ) : el.tag.startsWith('h') ? (
                              <Type className="w-3.5 h-3.5 text-[#ff6363] shrink-0" />
                            ) : el.type === 'link' ? (
                              <Globe className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                            ) : (
                              <Type className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            )}
                            <span className="truncate">{el.label}</span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {hasPatch && (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#ff8640]" title="Unsaved edits" />
                            )}
                            <span className="text-[9px] uppercase font-mono px-1 py-0.2 rounded bg-[#1c1e26] text-[#6b6d73]">
                              {el.tag}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {leftTab === 'pages' && (
              <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
                <div className="text-[10px] uppercase tracking-wider font-semibold text-[#55565a] px-2 py-1">
                  Captured Site Pages
                </div>
                {availablePages.map((p) => {
                  const isActive = activePage === p.htmlFilename;
                  return (
                    <button
                      key={p.htmlFilename}
                      onClick={() => handlePageChange(p.htmlFilename)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#17191f] border border-[#ff6363]/40 text-white font-medium shadow-md'
                          : 'text-[#8a8b8d] hover:bg-[#14161c] hover:text-white border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`p-1.5 rounded-lg ${isActive ? 'bg-[#ff6363]/10 text-[#ff6363]' : 'bg-[#1b1c22] text-[#6b6d73]'}`}>
                          <FileCode className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-white font-medium">{p.title || p.htmlFilename}</div>
                          <div className="text-[10px] text-[#55565a] font-mono truncate">{p.htmlFilename}</div>
                        </div>
                      </div>
                      <ChevronRight className={`w-3.5 h-3.5 ${isActive ? 'text-[#ff6363]' : 'text-[#3a3b40]'}`} />
                    </button>
                  );
                })}
              </div>
            )}

            {leftTab === 'assets' && (
              <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                <div className="text-[10px] uppercase tracking-wider font-semibold text-[#55565a] px-1">
                  Media &amp; Images ({discoveredAssets.length})
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {discoveredAssets.map((src, i) => (
                    <div
                      key={i}
                      onClick={() => {
                        if (selectedNode && selectedNode.tag === 'img') {
                          handleInspectorChange({ src });
                        } else {
                          navigator.clipboard.writeText(src);
                        }
                      }}
                      className="group relative rounded-lg border border-[#22242a] bg-[#14161c] overflow-hidden aspect-square flex items-center justify-center cursor-pointer hover:border-[#ff6363] transition-all p-1"
                      title={selectedNode?.tag === 'img' ? 'Click to replace selected image' : 'Click to copy path'}
                    >
                      <img src={src} alt="Asset" className="max-w-full max-h-full object-contain" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-[10px] font-medium text-white text-center p-1">
                        {selectedNode?.tag === 'img' ? 'Apply to Selected' : 'Copy Path'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>
        )}

        <main className="flex-1 flex flex-col items-center justify-center overflow-auto p-4 sm:p-8 relative bg-[#07080a] bg-[radial-gradient(#1f222e_1px,transparent_1px)] [background-size:20px_20px]">
          <div
            style={{
              width: viewportWidth,
              maxWidth: '100%',
              transform: `scale(${zoomLevel / 100})`,
              transformOrigin: 'top center',
              transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            className="flex-1 flex flex-col rounded-2xl border border-[#22242a] bg-black shadow-[0_24px_64px_rgba(0,0,0,0.8)] overflow-hidden min-h-[720px] max-h-[88vh]"
          >
            <div className="h-7 bg-[#14161c] border-b border-[#22242a] px-3 flex items-center justify-between text-[11px] text-[#55565a] shrink-0 select-none">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#ff6363]/60" />
                <span className="w-2 h-2 rounded-full bg-amber-400/60" />
                <span className="w-2 h-2 rounded-full bg-emerald-400/60" />
                <span className="text-white/60 font-mono text-[10px] ml-2 truncate">
                  {jobData?.url ? new URL(jobData.url).hostname : 'localhost'} • {activePage}
                </span>
              </div>
              <span className="text-[10px] font-mono text-[#44454b]">
                {viewportMode === 'mobile' ? '390 × 844' : viewportMode === 'tablet' ? '768 × 1024' : '1440 × 900'}
              </span>
            </div>

            <div className="flex-1 w-full h-full relative bg-black overflow-hidden">
              <iframe
                ref={iframeRef}
                key={`${activePage}-${previewVersion}`}
                src={`/api/job/${jobId}/preview/${activePage}?edit=1&t=${previewVersion}`}
                className="w-full h-full border-0 min-h-[680px]"
                title="Framer Live Canvas"
              />
            </div>
          </div>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 px-3 py-1.5 rounded-xl bg-[#0e1014]/90 border border-[#22242a] text-[11px] text-[#8a8b8d] backdrop-blur-md shadow-xl">
            <span className="flex items-center gap-1 text-white">
              <Sparkles className="w-3.5 h-3.5 text-[#ff6363]" /> Click any element to inspect &amp; edit
            </span>
            <span className="text-[#33343a]">•</span>
            <span>Double click text to type directly on canvas</span>
          </div>
        </main>

        {!showRightSidebar && (
          <button
            onClick={() => setShowRightSidebar(true)}
            className="absolute top-3 right-3 z-20 p-1.5 rounded-lg bg-[#14161c] border border-[#22242a] text-[#8a8b8d] hover:text-white shadow-xl cursor-pointer"
            title="Open Inspector"
          >
            <PanelRightOpen className="w-4 h-4" />
          </button>
        )}

        {showRightSidebar && (
          <aside className="w-72 bg-[#0e1014] border-l border-[#22242a] flex flex-col shrink-0 z-10 select-none overflow-y-auto custom-scrollbar">
            <div className="p-3 border-b border-[#22242a] flex items-center justify-between bg-[#0c0d11]">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                <Sliders className="w-3.5 h-3.5 text-[#ff6363]" />
                Properties Inspector
              </div>
              <button
                onClick={() => setShowRightSidebar(false)}
                className="p-1 text-[#55565a] hover:text-white rounded transition-colors cursor-pointer"
                title="Collapse Inspector"
              >
                <PanelRightClose className="w-3.5 h-3.5" />
              </button>
            </div>

            {selectedNode ? (
              <div className="p-3.5 space-y-4 text-xs">
                <div className="flex items-center justify-between p-2 rounded-xl bg-[#14161c] border border-[#22242a]">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase font-mono px-2 py-0.5 rounded bg-[#ff6363]/15 text-[#ff6363] border border-[#ff6363]/30">
                      {selectedNode.tag}
                    </span>
                    <span className="text-white font-medium truncate max-w-[120px]">
                      {selectedNode.tag === 'img' ? 'Image Node' : 'Text Node'}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedNode(null)}
                    className="text-[10px] text-[#8a8b8d] hover:text-white"
                  >
                    Deselect
                  </button>
                </div>

                {selectedNode.tag !== 'img' && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[#8a8b8d] flex items-center justify-between">
                      <span>Content Text</span>
                      <span className="text-[10px] text-[#55565a] font-mono">
                        {selectedNode.content.length} chars
                      </span>
                    </label>
                    <textarea
                      rows={4}
                      value={selectedNode.content}
                      onChange={(e) => handleInspectorChange({ content: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-[#14161c] border border-[#2a2c34] text-white text-xs outline-none focus:border-[#ff6363] transition-colors leading-relaxed"
                      placeholder="Enter element text..."
                    />
                  </div>
                )}

                {selectedNode.tag === 'img' && (
                  <div className="space-y-3">
                    <label className="text-[11px] font-semibold text-[#8a8b8d] block">
                      Image Source
                    </label>

                    <div className="rounded-xl border border-[#22242a] bg-[#14161c] p-2 flex items-center justify-center min-h-[100px] overflow-hidden">
                      {selectedNode.src ? (
                        <img
                          src={selectedNode.src}
                          alt="Preview"
                          className="max-w-full max-h-32 object-contain rounded-lg"
                        />
                      ) : (
                        <span className="text-[#55565a] text-xs">No image source</span>
                      )}
                    </div>

                    <input
                      type="text"
                      value={selectedNode.src}
                      onChange={(e) => handleInspectorChange({ src: e.target.value })}
                      placeholder="Image URL or ./assets/images/..."
                      className="w-full px-2.5 py-2 rounded-xl bg-[#14161c] border border-[#2a2c34] text-white text-xs outline-none focus:border-[#ff6363]"
                    />

                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileUpload}
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#17191f] hover:bg-[#20232a] border border-[#2a2c34] text-white text-xs font-medium transition-colors cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5 text-[#ff6363]" />
                        Upload Replacement Image
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-3 pt-2 border-t border-[#22242a]">
                  <span className="text-[11px] font-semibold text-[#8a8b8d] uppercase tracking-wider block">
                    Style Adjustments
                  </span>

                  <div className="flex items-center justify-between bg-[#14161c] p-1 rounded-xl border border-[#22242a]">
                    {(['left', 'center', 'right', 'justify'] as const).map((align) => (
                      <button
                        key={align}
                        onClick={() => handleInspectorChange({ styles: { ...selectedNode.styles, textAlign: align } })}
                        className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                          selectedNode.styles.textAlign === align ? 'bg-[#ff6363] text-black' : 'text-[#8a8b8d] hover:text-white'
                        }`}
                        title={`Align ${align}`}
                      >
                        {align === 'left' && <AlignLeft className="w-3.5 h-3.5" />}
                        {align === 'center' && <AlignCenter className="w-3.5 h-3.5" />}
                        {align === 'right' && <AlignRight className="w-3.5 h-3.5" />}
                        {align === 'justify' && <AlignJustify className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-[#8a8b8d] block">Text Color</label>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {['#ffffff', '#000000', '#ff6363', '#ff8640', '#4ade80', '#38bdf8', '#a855f7'].map((c) => (
                        <button
                          key={c}
                          onClick={() => handleInspectorChange({ styles: { ...selectedNode.styles, color: c } })}
                          style={{ backgroundColor: c }}
                          className="w-5 h-5 rounded-full border border-white/20 hover:scale-110 transition-transform cursor-pointer"
                          title={c}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-[#8a8b8d] block">Font Size</label>
                    <div className="grid grid-cols-4 gap-1">
                      {['12px', '14px', '16px', '20px', '28px', '36px', '48px', '64px'].map((sz) => (
                        <button
                          key={sz}
                          onClick={() => handleInspectorChange({ styles: { ...selectedNode.styles, fontSize: sz } })}
                          className={`py-1 rounded-lg text-[10px] font-mono border transition-colors cursor-pointer ${
                            selectedNode.styles.fontSize === sz
                              ? 'bg-[#ff6363] text-black border-[#ff6363] font-bold'
                              : 'bg-[#14161c] border-[#22242a] text-[#8a8b8d] hover:text-white'
                          }`}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center space-y-3 my-auto">
                <div className="w-12 h-12 rounded-2xl bg-[#17191f] border border-[#22242a] flex items-center justify-center mx-auto text-[#ff6363]">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="font-medium text-xs text-white">No Element Selected</div>
                <p className="text-[11px] text-[#8a8b8d] leading-relaxed">
                  Click on any text or image on the canvas to inspect and edit its properties.
                </p>
              </div>
            )}
          </aside>
        )}
      </div>

      {jobData && (
        <PaywallModal
          isOpen={showPaywall}
          onClose={() => setShowPaywall(false)}
          jobId={jobId}
          url={jobData.url || ''}
          pageCount={jobData.pageCount || 1}
          amount={jobData.price || Math.max(500, Math.ceil((jobData.pageCount || 1) / 10) * 500)}
          userEmail={user?.email || undefined}
          onPaymentSubmitted={() => {
            setShowPaywall(false);
            setPaymentNotice('Payment submitted! Verification in progress.');
          }}
        />
      )}
    </div>
  );
}
