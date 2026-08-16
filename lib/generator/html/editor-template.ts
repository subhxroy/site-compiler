export interface EditorPageItem {
  htmlFilename: string;
  title: string;
}

export function generateStandaloneEditorHtml(pages: EditorPageItem[]): string {
  const pageOptions = pages
    .map((p) => `<option value="${p.htmlFilename}">${p.title || p.htmlFilename} (${p.htmlFilename})</option>`)
    .join('\n        ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>SiteCompiler — Visual Content CMS</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #07080a;
      color: #ffffff;
      height: 100vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    header {
      background: #0e1014;
      border-bottom: 1px solid #22242a;
      padding: 12px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
      z-index: 100;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .logo {
      width: 28px;
      height: 28px;
      background: linear-gradient(135deg, #ff6363 0%, #ff8640 100%);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 14px;
      color: #000;
    }
    .brand-title {
      font-size: 14px;
      font-weight: 700;
      letter-spacing: -0.01em;
      color: #ffffff;
    }
    .badge {
      font-size: 10px;
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.05em;
      background: rgba(255, 99, 99, 0.12);
      color: #ff6363;
      border: 1px solid rgba(255, 99, 99, 0.25);
      padding: 3px 8px;
      border-radius: 6px;
    }
    .controls {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .page-select-wrapper {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #17191f;
      border: 1px solid #2a2c34;
      padding: 4px 10px;
      border-radius: 10px;
    }
    .page-select-wrapper label {
      font-size: 11px;
      color: #8a8b8d;
      font-weight: 500;
    }
    select {
      background: transparent;
      border: none;
      color: #ffffff;
      font-size: 12px;
      font-weight: 500;
      outline: none;
      cursor: pointer;
    }
    select option {
      background: #17191f;
      color: #fff;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.15s ease;
      text-decoration: none;
    }
    .btn-primary {
      background: #ff6363;
      color: #000;
    }
    .btn-primary:hover {
      background: #ff7a7a;
      box-shadow: 0 4px 16px rgba(255, 99, 99, 0.3);
    }
    .btn-secondary {
      background: #17191f;
      border-color: #2a2c34;
      color: #ffffff;
    }
    .btn-secondary:hover {
      background: #20232a;
    }
    .change-badge {
      font-size: 11px;
      color: #8a8b8d;
      background: #17191f;
      padding: 6px 10px;
      border-radius: 8px;
      border: 1px solid #22242a;
    }
    .change-badge.has-changes {
      color: #ff8640;
      border-color: rgba(255, 134, 64, 0.3);
      background: rgba(255, 134, 64, 0.08);
      font-weight: 600;
    }
    .instruction-bar {
      background: #090a0d;
      border-bottom: 1px solid #1b1c22;
      padding: 6px 20px;
      font-size: 11px;
      color: #8a8b8d;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .instruction-bar span b {
      color: #ff6363;
    }
    .editor-container {
      flex: 1;
      position: relative;
      background: #000000;
    }
    iframe {
      width: 100%;
      height: 100%;
      border: none;
    }
    /* Modal */
    .modal-backdrop {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(4px);
      z-index: 1000;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .modal-backdrop.open { display: flex; }
    .modal {
      background: #0e1014;
      border: 1px solid #2a2c34;
      border-radius: 16px;
      padding: 24px;
      max-width: 440px;
      width: 100%;
      box-shadow: 0 20px 48px rgba(0, 0, 0, 0.6);
    }
    .modal h3 { font-size: 15px; margin-bottom: 8px; font-weight: 600; }
    .modal p { font-size: 12px; color: #8a8b8d; margin-bottom: 16px; line-height: 1.5; }
    .modal input {
      width: 100%;
      padding: 10px 14px;
      border-radius: 10px;
      background: #17191f;
      border: 1px solid #2a2c34;
      color: #fff;
      font-size: 12px;
      margin-bottom: 16px;
      outline: none;
    }
    .modal input:focus { border-color: #ff6363; }
    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    .toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #102e1b;
      border: 1px solid #22c55e;
      color: #4ade80;
      padding: 12px 18px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
      z-index: 2000;
      opacity: 0;
      transform: translateY(10px);
      transition: all 0.2s ease;
      pointer-events: none;
    }
    .toast.show {
      opacity: 1;
      transform: translateY(0);
    }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <div class="logo">SC</div>
      <div class="brand-title">Visual Content CMS</div>
      <span class="badge">Offline Editor</span>
    </div>

    <div class="controls">
      <div class="page-select-wrapper">
        <label for="pageSelect">Page:</label>
        <select id="pageSelect">
        ${pageOptions}
        </select>
      </div>

      <div id="changeBadge" class="change-badge">0 unsaved edits</div>

      <button id="saveBtn" class="btn btn-primary" title="Save updated HTML file">
        💾 Save &amp; Export Page
      </button>

      <a id="previewBtn" href="./index.html" target="_blank" class="btn btn-secondary" title="View page in new tab">
        ↗ View Live
      </a>
    </div>
  </header>

  <div class="instruction-bar">
    <span>💡 <b>Click any text</b> directly on the page to edit in real time • <b>Click any image</b> to replace its path</span>
    <span>Zero Node.js Required • 100% Client-Side</span>
  </div>

  <div class="editor-container">
    <iframe id="previewFrame" src="./index.html"></iframe>
  </div>

  <!-- Image Update Modal -->
  <div id="imageModal" class="modal-backdrop">
    <div class="modal">
      <h3>Update Image Source</h3>
      <p>Enter a local image path (e.g. <code>./assets/images/photo.png</code>) or paste an image URL:</p>
      <input type="text" id="imageSrcInput" placeholder="./assets/images/my-image.png">
      <div class="modal-actions">
        <button id="cancelImageBtn" class="btn btn-secondary">Cancel</button>
        <button id="applyImageBtn" class="btn btn-primary">Apply Image</button>
      </div>
    </div>
  </div>

  <div id="toast" class="toast">✓ Page saved successfully! Check your downloads.</div>

  <script>
    (function() {
      const pageSelect = document.getElementById('pageSelect');
      const previewFrame = document.getElementById('previewFrame');
      const previewBtn = document.getElementById('previewBtn');
      const saveBtn = document.getElementById('saveBtn');
      const changeBadge = document.getElementById('changeBadge');
      const imageModal = document.getElementById('imageModal');
      const imageSrcInput = document.getElementById('imageSrcInput');
      const cancelImageBtn = document.getElementById('cancelImageBtn');
      const applyImageBtn = document.getElementById('applyImageBtn');
      const toast = document.getElementById('toast');

      let currentEdits = new Map();
      let activeImageNode = null;

      function updateChangeCount() {
        const count = currentEdits.size;
        changeBadge.textContent = count === 1 ? '1 unsaved edit' : count + ' unsaved edits';
        if (count > 0) {
          changeBadge.classList.add('has-changes');
        } else {
          changeBadge.classList.remove('has-changes');
        }
      }

      function showToast(msg) {
        toast.textContent = msg || '✓ Saved successfully!';
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3500);
      }

      // Page switching
      pageSelect.addEventListener('change', function() {
        const target = pageSelect.value;
        currentEdits.clear();
        updateChangeCount();
        previewFrame.src = './' + target;
        previewBtn.href = './' + target;
      });

      // Inject visual editor bridge into iframe
      previewFrame.addEventListener('load', function() {
        try {
          const doc = previewFrame.contentDocument || previewFrame.contentWindow.document;
          if (!doc) return;

          // Inject styling
          const style = doc.createElement('style');
          style.id = 'cms-editor-styles';
          style.textContent = \`
            [data-sc-id] {
              -webkit-user-select: text !important;
              user-select: text !important;
              pointer-events: auto !important;
              cursor: text !important;
              transition: outline 0.15s ease, background-color 0.15s ease !important;
            }
            [data-sc-id]:hover {
              outline: 2px dashed #ff6363 !important;
              outline-offset: 3px !important;
            }
            [data-sc-id]:focus, [data-sc-id]:focus-visible {
              outline: 2px solid #ff6363 !important;
              outline-offset: 3px !important;
              background-color: rgba(255, 99, 99, 0.15) !important;
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
          \`;
          doc.head.appendChild(style);

          // Disable anchor link navigation
          doc.addEventListener('click', function(e) {
            const scNode = e.target.closest('[data-sc-id]');
            if (scNode) {
              const tag = scNode.tagName.toLowerCase();
              if (tag === 'img') {
                e.preventDefault();
                e.stopPropagation();
                activeImageNode = scNode;
                imageSrcInput.value = scNode.getAttribute('src') || '';
                imageModal.classList.add('open');
                imageSrcInput.focus();
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
            if (anchor) e.preventDefault();
          }, true);

          // Bind all editable elements
          const nodes = doc.querySelectorAll('[data-sc-id]');
          nodes.forEach(function(el) {
            const id = el.getAttribute('data-sc-id');
            const tag = el.tagName.toLowerCase();

            if (tag !== 'img') {
              el.setAttribute('contenteditable', 'true');
              el.setAttribute('spellcheck', 'false');

              let initialText = el.textContent;

              el.addEventListener('input', function() {
                currentEdits.set(id, { type: 'text', content: el.textContent });
                updateChangeCount();
              });

              el.addEventListener('blur', function() {
                if (el.textContent !== initialText) {
                  currentEdits.set(id, { type: 'text', content: el.textContent });
                  updateChangeCount();
                }
              });
            }
          });
        } catch (err) {
          console.warn('CMS frame initialization:', err);
        }
      });

      // Image modal actions
      cancelImageBtn.addEventListener('click', function() {
        imageModal.classList.remove('open');
        activeImageNode = null;
      });

      applyImageBtn.addEventListener('click', function() {
        if (activeImageNode && imageSrcInput.value.trim()) {
          const newSrc = imageSrcInput.value.trim();
          activeImageNode.src = newSrc;
          const id = activeImageNode.getAttribute('data-sc-id');
          if (id) {
            currentEdits.set(id, { type: 'image', src: newSrc });
            updateChangeCount();
          }
        }
        imageModal.classList.remove('open');
        activeImageNode = null;
      });

      // Save updated HTML file
      saveBtn.addEventListener('click', function() {
        try {
          const doc = previewFrame.contentDocument || previewFrame.contentWindow.document;
          if (!doc) return;

          // Clone document to strip editor artifacts
          const docClone = doc.cloneNode(true);
          const styleEl = docClone.getElementById('cms-editor-styles');
          if (styleEl) styleEl.remove();

          // Remove contenteditable attributes
          docClone.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));

          const htmlOutput = '<!DOCTYPE html>\\n' + docClone.documentElement.outerHTML;
          const filename = pageSelect.value || 'index.html';

          const blob = new Blob([htmlOutput], { type: 'text/html;charset=utf-8' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);

          currentEdits.clear();
          updateChangeCount();
          showToast('✓ Saved ' + filename + '! Replace it in your website folder.');
        } catch (err) {
          alert('Error saving HTML: ' + err.message);
        }
      });
    })();
  </script>
</body>
</html>
`;
}
