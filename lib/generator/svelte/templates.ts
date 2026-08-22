export function generateSvelteConfig(): string {
  return `import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
    alias: {
      $lib: 'src/lib',
    },
  },
};

export default config;
`;
}

export function generateSveltePackageJson(projectName: string = 'sitecompiler-svelte-export'): string {
  return JSON.stringify(
    {
      name: projectName,
      version: '1.0.0',
      private: true,
      type: 'module',
      scripts: {
        dev: 'vite dev',
        build: 'vite build',
        preview: 'vite preview',
        check: 'svelte-kit sync && svelte-check --tsconfig ./tsconfig.json',
      },
      dependencies: {
        lucide_svelte: '^0.468.0',
      },
      devDependencies: {
        '@sveltejs/adapter-auto': '^3.3.1',
        '@sveltejs/kit': '^2.8.0',
        '@sveltejs/vite-plugin-svelte': '^4.0.0',
        svelte: '^5.0.0',
        'svelte-check': '^4.0.0',
        typescript: '^5.6.3',
        vite: '^5.4.10',
        tailwindcss: '^3.4.14',
        autoprefixer: '^10.4.20',
        postcss: '^8.4.47',
      },
    },
    null,
    2
  );
}

export function generateSvelteViteConfig(): string {
  return `import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
});
`;
}

export function generateSvelteLayout(): string {
  return `<script lang="ts">
  import '../app.css';
  let { children } = $props();
</script>

<div class="min-h-screen bg-[#0d0e12] text-[#e1e2e5] antialiased">
  {@render children()}
</div>
`;
}

export function generateSvelteAppHtml(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="%sveltekit.assets%/favicon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    %sveltekit.head%
  </head>
  <body data-sveltekit-preload-data="hover">
    <div style="display: contents">%sveltekit.body%</div>
  </body>
</html>
`;
}
