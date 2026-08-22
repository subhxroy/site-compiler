# SiteCompiler Academic Presentation Deck

Standalone 16:9 Landscape Academic Defense Presentation for **SiteCompiler** (by Subhankar Roy).

## Files in this Folder

- `index.html`: Main self-contained presentation application (ElevenLabs warm-editorial design system).
- `presentation.html`: Direct alias to `index.html`.
- `netlify.toml`: Configuration for zero-config Netlify hosting.
- `assets/`: High-resolution screenshots and visual assets.

## How to Host Online

### Option 1: Netlify Drop (Instant Drag & Drop — No CLI / Git needed)
1. Go to [https://app.netlify.com/drop](https://app.netlify.com/drop)
2. Drag and drop this `presentation-deck` folder directly onto the page.
3. You will receive an instant public HTTPS link (e.g., `https://sitecompiler-defense.netlify.app/`).

### Option 2: Vercel CLI
\`\`\`bash
cd presentation-deck
npx vercel --prod
\`\`\`

### Option 3: GitHub Pages
1. Push this folder to a GitHub repository branch.
2. In repository **Settings** → **Pages**, select the folder as source.

## Presentation Controls

- **Next Slide**: `→` Right Arrow, `Space`, or `PageDown`
- **Previous Slide**: `←` Left Arrow, or `PageUp`
- **First / Last Slide**: `Home` / `End`
- **Fullscreen**: `F` key or click the maximize button in the bottom controls
