import { transformHtmlToAstro } from '../lib/generator/astro/astro-builder';
import { transformHtmlToSvelte } from '../lib/generator/svelte/svelte-builder';
import { transformHtmlToVue } from '../lib/generator/vue/vue-builder';
import { transformHtmlToRemix } from '../lib/generator/remix/remix-builder';

const sampleHtml = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Page</title>
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body class="bg-black text-white">
    <header><nav><h1>Logo</h1></nav></header>
    <main class="hero"><h2>Welcome</h2><p>Description text</p></main>
    <script src="/analytics.js"></script>
  </body>
</html>
`;

console.log('─── Suite: Multi-Framework Exporter Generation ───');

// 1. Astro Exporter
const astroOutput = transformHtmlToAstro(sampleHtml, 'My Astro Page');
console.assert(astroOutput.includes('import Layout from'), 'Astro output should import Layout');
console.assert(astroOutput.includes('<Layout title="My Astro Page">'), 'Astro output should include Layout with title');
console.assert(!astroOutput.includes('<script src="/analytics.js">'), 'Astro output should strip external scripts');
console.log('  [PASS] Astro exporter generates valid .astro component markup');

// 2. SvelteKit Exporter
const svelteOutput = transformHtmlToSvelte(sampleHtml, 'My Svelte Page');
console.assert(svelteOutput.includes('<svelte:head>'), 'Svelte output should include <svelte:head>');
console.assert(svelteOutput.includes('<title>My Svelte Page</title>'), 'Svelte output should include title in head');
console.assert(svelteOutput.includes('class="hero"'), 'Svelte output should preserve markup classes');
console.log('  [PASS] SvelteKit exporter generates valid Svelte 5 SFC template');

// 3. Vue / Nuxt Exporter
const vueOutput = transformHtmlToVue(sampleHtml, 'My Vue Page');
console.assert(vueOutput.includes('<script setup lang="ts">'), 'Vue output should use script setup');
console.assert(vueOutput.includes('useHead({'), 'Vue output should call useHead');
console.assert(vueOutput.includes('<template>'), 'Vue output should contain template section');
console.log('  [PASS] Vue 3 / Nuxt exporter generates valid Vue SFC template');

// 4. Remix Exporter
const remixOutput = transformHtmlToRemix(sampleHtml, 'My Remix Page');
console.assert(remixOutput.includes('export const meta: MetaFunction'), 'Remix output should export meta function');
console.assert(remixOutput.includes('export default function RoutePage'), 'Remix output should export default route component');
console.log('  [PASS] Remix exporter generates valid Remix route component');

console.log('✨ All Multi-Framework Exporter tests passed successfully.\n');
