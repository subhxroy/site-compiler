export function generateAstroConfig(): string {
  return `import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  integrations: [tailwind({ applyBaseStyles: false })],
  output: 'static',
  build: {
    format: 'directory',
  },
});
`;
}

export function generateAstroPackageJson(projectName: string = 'sitecompiler-astro-export'): string {
  return JSON.stringify(
    {
      name: projectName,
      type: 'module',
      version: '1.0.0',
      private: true,
      scripts: {
        dev: 'astro dev',
        start: 'astro dev',
        build: 'astro check && astro build',
        preview: 'astro preview',
        astro: 'astro',
      },
      dependencies: {
        astro: '^4.16.0',
        '@astrojs/tailwind': '^5.1.0',
        tailwindcss: '^3.4.14',
        lucide: '^0.468.0',
      },
      devDependencies: {
        '@astrojs/check': '^0.9.4',
        typescript: '^5.6.3',
      },
    },
    null,
    2
  );
}

export function generateAstroTsConfig(): string {
  return JSON.stringify(
    {
      extends: 'astro/tsconfigs/strict',
      compilerOptions: {
        baseUrl: '.',
        paths: {
          '@/*': ['src/*'],
        },
      },
    },
    null,
    2
  );
}

export function generateAstroTailwindConfig(): string {
  return `/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        primary: '#ff6363',
      },
    },
  },
  plugins: [],
};
`;
}

export function generateAstroLayout(title: string = 'Exported Website'): string {
  return `---
interface Props {
  title?: string;
  description?: string;
}

const { title = '${title.replace(/'/g, "\\'")}', description = 'Compiled with SiteCompiler Astro Engine' } = Astro.props;
---

<!doctype html>
<html lang="en" class="scroll-smooth">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="generator" content={Astro.generator} />
    <meta name="description" content={description} />
    <title>{title}</title>
    <link rel="stylesheet" href="/styles/global.css" />
  </head>
  <body class="min-h-screen bg-[#0d0e12] text-[#e1e2e5] antialiased selection:bg-[#ff6363] selection:text-white">
    <slot />
  </body>
</html>
`;
}
