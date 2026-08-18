import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { API_BASE_URL } from '@/lib/api-config';
import { getJob } from '@/lib/jobs/store';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(id)) {
    return NextResponse.json({ error: 'Invalid job id' }, { status: 400 });
  }

  const url = new URL(req.url);
  const isEditMode = url.searchParams.get('edit') === '1';

  const editorBridgeStyle = `
<style id="sitecompiler-editor-bridge-css">
  [data-sc-id] {
    -webkit-user-select: text !important;
    user-select: text !important;
    pointer-events: auto !important;
    cursor: text !important;
    caret-color: #ff6363 !important;
    transition: outline 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease !important;
  }
  span[data-sc-id] {
    display: inline-block !important;
  }
  [data-sc-id] * {
    -webkit-user-select: text !important;
    user-select: text !important;
    pointer-events: auto !important;
  }
  [data-sc-id]:hover {
    outline: 2px dashed #ff6363 !important;
    outline-offset: 3px !important;
    background-color: rgba(255, 99, 99, 0.08) !important;
  }
  [data-sc-id].sc-selected,
  [data-sc-id]:focus, [data-sc-id]:focus-visible {
    outline: 2px solid #ff6363 !important;
    outline-offset: 3px !important;
    background-color: rgba(255, 99, 99, 0.18) !important;
    box-shadow: 0 0 16px rgba(255, 99, 99, 0.4) !important;
  }
  img[data-sc-id] {
    cursor: pointer !important;
    -webkit-user-select: none !important;
    user-select: none !important;
    max-width: 100% !important;
  }
  img[data-sc-id]:hover {
    outline: 2px solid #ff6363 !important;
    outline-offset: 3px !important;
    filter: brightness(1.1) !important;
    box-shadow: 0 0 12px rgba(255, 99, 99, 0.35) !important;
  }
</style>`;

  const editorBridgeScript = `
<script id="sitecompiler-editor-bridge-js">
(function() {
  let selectedNodeId = null;

  function getNodeStyle(el) {
    try {
      const s = window.getComputedStyle(el);
      return {
        fontSize: s.fontSize,
        color: s.color,
        backgroundColor: s.backgroundColor,
        opacity: s.opacity,
        textAlign: s.textAlign,
      };
    } catch {
      return {};
    }
  }

  function notifySelection(scNode) {
    if (!scNode) return;
    const nodeId = scNode.getAttribute('data-sc-id');
    if (!nodeId) return;

    document.querySelectorAll('.sc-selected').forEach(el => el.classList.remove('sc-selected'));
    scNode.classList.add('sc-selected');
    selectedNodeId = nodeId;

    const tag = scNode.tagName.toLowerCase();
    const isImg = tag === 'img';
    const anchor = scNode.closest('a') || (tag === 'a' ? scNode : null);

    window.parent.postMessage({
      type: 'sc-select',
      nodeId: nodeId,
      tag: tag,
      content: isImg ? '' : (scNode.textContent || '').trim(),
      src: isImg ? (scNode.getAttribute('src') || '') : '',
      alt: isImg ? (scNode.getAttribute('alt') || '') : '',
      href: anchor ? (anchor.getAttribute('href') || '') : '',
      styles: getNodeStyle(scNode)
    }, '*');
  }

  window.addEventListener('pointerdown', function(e) {
    const scNode = e.target.closest('[data-sc-id]');
    if (scNode && scNode.tagName.toLowerCase() !== 'img') {
      e.stopPropagation();
    }
  }, true);

  window.addEventListener('click', function(e) {
    const scNode = e.target.closest('[data-sc-id]');
    if (scNode) {
      e.preventDefault();
      e.stopPropagation();
      notifySelection(scNode);

      const tag = scNode.tagName.toLowerCase();
      if (tag !== 'img') {
        scNode.setAttribute('contenteditable', 'true');
        scNode.focus();
      }
      return;
    }

    const anchor = e.target.closest('a');
    if (anchor) {
      e.preventDefault();
    }
  }, true);

  function getElementTree() {
    const nodes = document.querySelectorAll('[data-sc-id]');
    const tree = [];
    nodes.forEach(function(el) {
      const id = el.getAttribute('data-sc-id');
      const tag = el.tagName.toLowerCase();
      const isImg = tag === 'img';
      const text = isImg ? (el.getAttribute('alt') || 'Image') : (el.textContent || '').trim();
      const snippet = text.length > 50 ? text.slice(0, 50) + '...' : text;

      tree.push({
        id: id,
        tag: tag,
        type: isImg ? 'image' : (tag === 'a' || el.closest('a') ? 'link' : 'text'),
        label: snippet || tag.toUpperCase(),
        src: isImg ? (el.getAttribute('src') || '') : undefined,
        alt: isImg ? (el.getAttribute('alt') || '') : undefined,
      });
    });
    return tree;
  }

  function bindEditableNodes() {
    const editableNodes = document.querySelectorAll('[data-sc-id]');
    let count = 0;

    editableNodes.forEach(function(el) {
      count++;
      const id = el.getAttribute('data-sc-id');
      const tag = el.tagName.toLowerCase();

      if (tag === 'img') {
        el.style.cursor = 'pointer';
      } else {
        el.setAttribute('contenteditable', 'true');
        el.setAttribute('spellcheck', 'false');

        if (!el.getAttribute('data-sc-bound')) {
          el.setAttribute('data-sc-bound', '1');
          let initialText = el.textContent;

          el.addEventListener('input', function() {
            window.parent.postMessage({
              type: 'sc-edit',
              nodeId: id,
              content: el.textContent
            }, '*');
          });

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

          el.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
              el.blur();
            }
          });
        }
      }
    });

    if (count > 0) {
      window.parent.postMessage({
        type: 'sc-ready',
        nodeCount: count,
        elements: getElementTree()
      }, '*');
    }
  }

  // Handle messages from Studio Editor parent window
  window.addEventListener('message', function(e) {
    if (!e.data || typeof e.data !== 'object') return;

    if (e.data.type === 'sc-update-node') {
      const { nodeId, content, src, alt, href, styles } = e.data;
      if (!nodeId) return;
      const el = document.querySelector('[data-sc-id="' + nodeId + '"]');
      if (!el) return;

      if (content !== undefined && el.tagName.toLowerCase() !== 'img') {
        el.textContent = content;
      }
      if (src !== undefined && el.tagName.toLowerCase() === 'img') {
        el.setAttribute('src', src);
      }
      if (alt !== undefined && el.tagName.toLowerCase() === 'img') {
        el.setAttribute('alt', alt);
      }
      if (href !== undefined) {
        const anchor = el.tagName.toLowerCase() === 'a' ? el : el.closest('a');
        if (anchor) anchor.setAttribute('href', href);
      }
      if (styles && typeof styles === 'object') {
        Object.keys(styles).forEach(k => {
          if (styles[k] !== undefined) el.style[k] = styles[k];
        });
      }
    } else if (e.data.type === 'sc-highlight-node') {
      const { nodeId } = e.data;
      if (!nodeId) return;
      const el = document.querySelector('[data-sc-id="' + nodeId + '"]');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        notifySelection(el);
      }
    } else if (e.data.type === 'sc-request-tree') {
      window.parent.postMessage({
        type: 'sc-tree-response',
        elements: getElementTree()
      }, '*');
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindEditableNodes);
  } else {
    bindEditableNodes();
  }

  const observer = new MutationObserver(function() {
    bindEditableNodes();
  });
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    window.addEventListener('DOMContentLoaded', function() {
      if (document.body) observer.observe(document.body, { childList: true, subtree: true });
    });
  }

  let checks = 0;
  const interval = setInterval(function() {
    bindEditableNodes();
    checks++;
    if (checks > 10) clearInterval(interval);
  }, 300);
})();
</script>`;

  function injectBridge(html: string): string {
    let res = html;
    if (!res.includes('sitecompiler-editor-bridge-css')) {
      res = res.includes('</head>')
        ? res.replace('</head>', `${editorBridgeStyle}</head>`)
        : `${editorBridgeStyle}${res}`;
    }
    if (!res.includes('sitecompiler-editor-bridge-js')) {
      res = res.includes('</body>')
        ? res.replace('</body>', `${editorBridgeScript}</body>`)
        : `${res}${editorBridgeScript}`;
    }
    return res;
  }

  if (API_BASE_URL) {
    try {
      const backendRes = await fetch(`${API_BASE_URL}/api/job/${id}/preview${url.search}`);
      if (backendRes.ok) {
        let text = await backendRes.text();
        if (isEditMode) {
          text = injectBridge(text);
        }
        return new NextResponse(text, {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': isEditMode ? 'no-cache, no-store, must-revalidate' : 'public, max-age=600',
          },
        });
      }
    } catch {}
  }

  const exportHtmlPath = path.resolve(process.cwd(), 'exports', id, 'output', 'html-export', 'index.html');
  if (fs.existsSync(exportHtmlPath)) {
    let htmlContent = fs.readFileSync(exportHtmlPath, 'utf-8');
    if (!htmlContent.includes('<base ') && htmlContent.includes('<head>')) {
      htmlContent = htmlContent.replace('<head>', `<head>\n    <base href="/api/job/${id}/preview/">`);
    } else if (!htmlContent.includes('<base ') && htmlContent.includes('<head ')) {
      htmlContent = htmlContent.replace(/<head[^>]*>/, `$&\\n    <base href="/api/job/${id}/preview/">`);
    }

    if (isEditMode) {
      htmlContent = injectBridge(htmlContent);
    }

    return new NextResponse(htmlContent, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': isEditMode ? 'no-cache, no-store, must-revalidate' : 'public, max-age=600',
      },
    });
  }

  // If compilation is still ongoing, return clean loading page
  const job = getJob(id);
  const progressMsg = job?.progressMessage || 'Compiling site and generating interactive live preview…';
  const loadingHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Live Preview</title>
  <style>
    body { margin:0; background:#07080a; color:#ffffff; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; display:flex; align-items:center; justify-content:center; height:100vh; flex-direction:column; gap:16px; text-align:center; padding:20px; box-sizing:border-box; }
    .spinner { width:36px; height:36px; border:3px solid #22242a; border-top-color:#ff6363; border-radius:50%; animation:spin 0.8s linear infinite; }
    @keyframes spin { to { transform:rotate(360deg); } }
    .title { font-size:14px; font-weight:600; color:#ffffff; }
    .desc { font-size:12px; color:#8a8b8d; font-family:monospace; max-width:360px; line-height:1.5; }
  </style>
  <meta http-equiv="refresh" content="2">
</head>
<body>
  <div class="spinner"></div>
  <div class="title">Generating Live Interactive Preview…</div>
  <div class="desc">${progressMsg}</div>
</body>
</html>`;

  return new NextResponse(loadingHtml, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
