'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/firebase/auth-context';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
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
} from 'lucide-react';

interface PatchItem {
  nodeId: string;
  content?: string;
  src?: string;
  alt?: string;
}

export default function EditExportPage() {
  const params = useParams();
  const jobId = typeof params?.jobId === 'string' ? params.jobId : '';

  const { user } = useAuth();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [patches, setPatches] = useState<Map<string, PatchItem>>(new Map());
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeImageNode, setActiveImageNode] = useState<{ id: string; currentSrc: string } | null>(null);
  const [imageInputSrc, setImageInputSrc] = useState('');
  const [previewVersion, setPreviewVersion] = useState(0);
  const [nodeCount, setNodeCount] = useState<number | null>(null);

  // 1. Listen for edit events sent from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== 'object') return;

      if (event.data.type === 'sc-edit') {
        const { nodeId, content, src, alt } = event.data;
        if (!nodeId) return;

        setPatches((prev) => {
          const next = new Map(prev);
          const existing: PatchItem = next.get(nodeId) || { nodeId };
          if (content !== undefined) existing.content = content;
          if (src !== undefined) existing.src = src;
          if (alt !== undefined) existing.alt = alt;
          next.set(nodeId, existing);
          return next;
        });
        setSavedSuccess(false);
      } else if (event.data.type === 'sc-select-image') {
        setActiveImageNode({
          id: event.data.nodeId,
          currentSrc: event.data.src || '',
        });
        setImageInputSrc(event.data.src || '');
      } else if (event.data.type === 'sc-ready') {
        setNodeCount(event.data.nodeCount || 0);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // 2. Inject contenteditable bridge into iframe when loaded
  const handleIframeLoad = () => {
    try {
      const iframeDoc = iframeRef.current?.contentDocument;
      if (!iframeDoc) return;

      // Inject bridge script directly into iframe DOM
      const bridgeScript = iframeDoc.createElement('script');
      bridgeScript.textContent = `
        (function() {
          const editableNodes = document.querySelectorAll('[data-sc-id]');
          let count = 0;

          // Inject styling for editable highlights
          const style = document.createElement('style');
          style.textContent = \`
            [data-sc-id] {
              transition: outline 0.15s ease, background 0.15s ease;
            }
            [data-sc-id]:hover {
              outline: 2px dashed rgba(255, 99, 99, 0.5) !important;
              outline-offset: 2px !important;
              cursor: text !important;
            }
            [data-sc-id]:focus {
              outline: 2px solid #ff6363 !important;
              outline-offset: 2px !important;
              background-color: rgba(255, 99, 99, 0.08) !important;
            }
            img[data-sc-id]:hover {
              outline: 2px solid #ff6363 !important;
              cursor: pointer !important;
              filter: brightness(1.08);
            }
          \`;
          document.head.appendChild(style);

          editableNodes.forEach(function(el) {
            count++;
            const id = el.getAttribute('data-sc-id');
            const tag = el.tagName.toLowerCase();

            if (tag === 'img') {
              el.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                window.parent.postMessage({
                  type: 'sc-select-image',
                  nodeId: id,
                  src: el.getAttribute('src') || ''
                }, '*');
              });
            } else {
              el.setAttribute('contenteditable', 'true');
              let initialText = el.textContent;

              el.addEventListener('blur', function() {
                if (el.textContent !== initialText) {
                  initialText = el.textContent;
                  window.parent.postMessage({
                    type: 'sc-edit',
                    nodeId: id,
                    content: el.textContent
                  }, '*');
                }
              });
            }
          });

          window.parent.postMessage({ type: 'sc-ready', nodeCount: count }, '*');
        })();
      `;
      iframeDoc.body.appendChild(bridgeScript);
    } catch {}
  };

  // 3. Save pending patches to server
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

  // 4. Discard changes
  const handleDiscard = () => {
    setPatches(new Map());
    setPreviewVersion((v) => v + 1);
  };

  // 5. Apply image update
  const handleApplyImage = () => {
    if (!activeImageNode || !imageInputSrc.trim()) return;

    setPatches((prev) => {
      const next = new Map(prev);
      const existing = next.get(activeImageNode.id) || { nodeId: activeImageNode.id };
      existing.src = imageInputSrc.trim();
      next.set(activeImageNode.id, existing);
      return next;
    });

    // Update image directly in iframe DOM for instant visual feedback
    try {
      const iframeDoc = iframeRef.current?.contentDocument;
      const imgEl = iframeDoc?.querySelector(`[data-sc-id="${activeImageNode.id}"]`) as HTMLImageElement | null;
      if (imgEl) {
        imgEl.src = imageInputSrc.trim();
      }
    } catch {}

    setActiveImageNode(null);
    setImageInputSrc('');
  };

  const pendingCount = patches.size;

  return (
    <div className="min-h-screen bg-[#07080a] text-white flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 flex flex-col pt-24 pb-8 px-4 sm:px-6 max-w-[1400px] w-full mx-auto space-y-4">
        {/* Top Control Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-[#0e1014] border border-[#22242a] shadow-xl">
          <div className="flex items-center gap-3">
            <Link
              href="/history"
              className="p-2 rounded-xl bg-[#17191f] hover:bg-[#20232a] text-[#8a8b8d] hover:text-white transition-colors"
              title="Back to History"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-white">Live Content Editor</span>
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#ff6363]/10 text-[#ff6363] border border-[#ff6363]/20 font-mono font-medium">
                  HTML Export
                </span>
              </div>
              <p className="text-xs text-[#8a8b8d] font-mono truncate max-w-sm sm:max-w-md">
                Job ID: {jobId} {nodeCount !== null ? `• ${nodeCount} editable elements` : ''}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {pendingCount > 0 && (
              <button
                onClick={handleDiscard}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#17191f] hover:bg-[#20232a] text-xs text-[#8a8b8d] hover:text-white transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Discard
              </button>
            )}

            <button
              onClick={handleSave}
              disabled={pendingCount === 0 || saving}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                pendingCount > 0
                  ? 'bg-[#ff6363] text-black hover:bg-[#ff7a7a] shadow-lg shadow-[#ff6363]/20'
                  : 'bg-[#17191f] text-[#4a4b4e] cursor-not-allowed border border-[#22242a]'
              }`}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving ({pendingCount})...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes {pendingCount > 0 ? `(${pendingCount})` : ''}
                </>
              )}
            </button>

            <a
              href={`/api/job/${jobId}/download`}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#17191f] hover:bg-[#20232a] border border-[#2a2c34] text-xs font-medium text-white transition-colors"
              title="Download Updated ZIP"
            >
              <Download className="w-3.5 h-3.5 text-[#ff6363]" />
              Download ZIP
            </a>

            <a
              href={`/api/job/${jobId}/preview`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl bg-[#17191f] hover:bg-[#20232a] text-[#8a8b8d] hover:text-white transition-colors"
              title="Open Fullscreen Preview in New Tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Notifications */}
        {savedSuccess && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs animate-fadeIn">
            <Check className="w-4 h-4 shrink-0" />
            Changes saved successfully! ZIP package re-compiled and ready for download.
          </div>
        )}

        {errorMsg && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {errorMsg}
          </div>
        )}

        {/* Editor Instructions Strip */}
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#0c0d11] border border-[#1b1c22] text-[11px] text-[#8a8b8d]">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1 text-white">
              <Type className="w-3.5 h-3.5 text-[#ff6363]" /> Click any text to edit directly
            </span>
            <span className="flex items-center gap-1 text-white">
              <ImageIcon className="w-3.5 h-3.5 text-[#ff6363]" /> Click any image to replace its URL or path
            </span>
          </div>
          <span className="hidden sm:inline font-mono text-[10px] text-[#55565a]">
            Zero structural drift • Instant point patching
          </span>
        </div>

        {/* Live Preview Iframe Container */}
        <div className="flex-1 w-full min-h-[680px] rounded-2xl overflow-hidden border border-[#22242a] bg-[#000000] shadow-2xl relative">
          <iframe
            ref={iframeRef}
            key={previewVersion}
            src={`/api/job/${jobId}/preview?edit=1&t=${previewVersion}`}
            className="w-full h-full min-h-[680px] border-0"
            onLoad={handleIframeLoad}
            title="Live Editable Preview"
          />
        </div>
      </main>

      {/* Image URL Update Modal */}
      {activeImageNode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0e1014] border border-[#2a2c34] rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-white font-medium text-sm">
              <ImageIcon className="w-4 h-4 text-[#ff6363]" />
              Update Image Source
            </div>
            <p className="text-xs text-[#8a8b8d]">
              Enter a relative asset path (e.g. <code className="text-white">./assets/images/...</code>) or paste an image data URI.
            </p>
            <input
              type="text"
              value={imageInputSrc}
              onChange={(e) => setImageInputSrc(e.target.value)}
              placeholder="./assets/images/photo.png or data:image/..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#17191f] border border-[#2a2c34] text-xs text-white placeholder-[#55565a] focus:outline-none focus:border-[#ff6363]"
              autoFocus
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setActiveImageNode(null)}
                className="px-3.5 py-1.5 rounded-xl bg-[#17191f] hover:bg-[#20232a] text-xs text-[#8a8b8d] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyImage}
                disabled={!imageInputSrc.trim()}
                className="px-4 py-1.5 rounded-xl bg-[#ff6363] text-black text-xs font-semibold hover:bg-[#ff7a7a] transition-all disabled:opacity-50"
              >
                Apply Image
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
