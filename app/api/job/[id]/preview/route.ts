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

  if (API_BASE_URL) {
    try {
      const backendRes = await fetch(`${API_BASE_URL}/api/job/${id}/preview`);
      if (backendRes.ok) {
        const text = await backendRes.text();
        return new NextResponse(text, {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        });
      }
    } catch {}
  }

  const url = new URL(req.url);
  const isEditMode = url.searchParams.get('edit') === '1';

  const exportHtmlPath = path.resolve(process.cwd(), 'exports', id, 'output', 'html-export', 'index.html');
  if (fs.existsSync(exportHtmlPath)) {
    let htmlContent = fs.readFileSync(exportHtmlPath, 'utf-8');
    if (!htmlContent.includes('<base ') && htmlContent.includes('<head>')) {
      htmlContent = htmlContent.replace('<head>', `<head>\n    <base href="/api/job/${id}/preview/">`);
    } else if (!htmlContent.includes('<base ') && htmlContent.includes('<head ')) {
      htmlContent = htmlContent.replace(/<head[^>]*>/, `$&\\n    <base href="/api/job/${id}/preview/">`);
    }

    if (isEditMode) {
      const editorBridge = `
<style id="sitecompiler-editor-bridge-css">
  [data-sc-id] {
    -webkit-user-select: text !important;
    user-select: text !important;
    pointer-events: auto !important;
    cursor: text !important;
    transition: outline 0.15s ease, background-color 0.15s ease !important;
  }
  [data-sc-id] * {
    -webkit-user-select: text !important;
    user-select: text !important;
    pointer-events: auto !important;
  }
  [data-sc-id]:hover {
    outline: 2px dashed #ff6363 !important;
    outline-offset: 3px !important;
    cursor: text !important;
  }
  [data-sc-id]:focus, [data-sc-id]:focus-visible {
    outline: 2px solid #ff6363 !important;
    outline-offset: 3px !important;
    background-color: rgba(255, 99, 99, 0.15) !important;
    cursor: text !important;
  }
  img[data-sc-id] {
    cursor: pointer !important;
    -webkit-user-select: none !important;
    user-select: none !important;
  }
  img[data-sc-id]:hover {
    outline: 2px solid #ff6363 !important;
    outline-offset: 3px !important;
    filter: brightness(1.08) !important;
  }
</style>
<script id="sitecompiler-editor-bridge-js">
(function() {
  // Capture phase pointerdown to stop Framer / Motion drag handlers on editable text
  window.addEventListener('pointerdown', function(e) {
    const scNode = e.target.closest('[data-sc-id]');
    if (scNode && scNode.tagName.toLowerCase() !== 'img') {
      e.stopPropagation();
    }
  }, true);

  // Capture phase click to stop link navigation and focus editable element
  window.addEventListener('click', function(e) {
    const scNode = e.target.closest('[data-sc-id]');
    if (scNode) {
      const tag = scNode.tagName.toLowerCase();
      if (tag === 'img') {
        e.preventDefault();
        e.stopPropagation();
        window.parent.postMessage({
          type: 'sc-select-image',
          nodeId: scNode.getAttribute('data-sc-id'),
          src: scNode.getAttribute('src') || ''
        }, '*');
        return;
      } else {
        e.preventDefault();
        e.stopPropagation();
        scNode.setAttribute('contenteditable', 'true');
        scNode.focus();
        return;
      }
    }

    const anchor = e.target.closest('a');
    if (anchor) {
      e.preventDefault();
    }
  }, true);

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
      window.parent.postMessage({ type: 'sc-ready', nodeCount: count }, '*');
    }
  }

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
</script>
`;
      htmlContent = htmlContent.includes('</body>')
        ? htmlContent.replace('</body>', `${editorBridge}</body>`)
        : `${htmlContent}${editorBridge}`;
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
