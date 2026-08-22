import { runSsrfTests } from './ssrf.test';
import { runSecurityTests } from './security.test';
import { runPipelineTests } from './pipeline.test';
import { runCrawlerTests } from './crawler.test';
import { runModelPatchTests } from './model-patch.test';
import { runFidelityTests } from './fidelity.test';
import { transformHtmlToAstro } from '../lib/generator/astro/astro-builder';
import { transformHtmlToSvelte } from '../lib/generator/svelte/svelte-builder';
import { transformHtmlToVue } from '../lib/generator/vue/vue-builder';
import { transformHtmlToRemix } from '../lib/generator/remix/remix-builder';
import { SiteCompilerClient } from '../packages/sitecompiler-sdk/src/client';
import { SiteCompilerError, PaymentRequiredError, JobNotFoundError } from '../packages/sitecompiler-sdk/src/errors';

async function runExporterTests(): Promise<Array<{ name: string; passed: boolean; error?: string }>> {
  const results: Array<{ name: string; passed: boolean; error?: string }> = [];
  const html = '<body class="test"><h1>Hello</h1></body>';
  
  const astro = transformHtmlToAstro(html, 'Astro');
  results.push({ name: 'Astro exporter generates valid layout wrapper', passed: astro.includes('<Layout title="Astro">') });

  const svelte = transformHtmlToSvelte(html, 'Svelte');
  results.push({ name: 'Svelte exporter generates valid svelte:head and body', passed: svelte.includes('<svelte:head>') });

  const vue = transformHtmlToVue(html, 'Vue');
  results.push({ name: 'Vue exporter generates valid script setup and template', passed: vue.includes('<script setup lang="ts">') });

  const remix = transformHtmlToRemix(html, 'Remix');
  results.push({ name: 'Remix exporter generates valid RoutePage component', passed: remix.includes('export default function RoutePage') });

  return results;
}

async function runSdkTests(): Promise<Array<{ name: string; passed: boolean; error?: string }>> {
  const results: Array<{ name: string; passed: boolean; error?: string }> = [];
  
  const client = new SiteCompilerClient({ baseUrl: 'http://localhost:3001' });
  results.push({ name: 'SDK Client instantiates Jobs & Exports resources', passed: !!(client.jobs && client.exports) });

  const err = new PaymentRequiredError();
  results.push({ name: 'PaymentRequiredError returns HTTP 403 status', passed: err.status === 403 });

  const notFound = new JobNotFoundError('job_test');
  results.push({ name: 'JobNotFoundError returns HTTP 404 status', passed: notFound.status === 404 });

  return results;
}

async function runTestSuite() {
  console.log('\n======================================================');
  console.log('       SiteCompiler Automated Test Suite');
  console.log('======================================================\n');

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  const suites = [
    { name: '1. Anti-SSRF & Network Firewall', runner: runSsrfTests },
    { name: '2. Security, Auth & PII Protection', runner: runSecurityTests },
    { name: '3. Compiler Pipeline & Validation', runner: runPipelineTests },
    { name: '4. Crawler, DOM & CSS Consolidation', runner: runCrawlerTests },
    { name: '5. Stable Node IDs & Patchable HTML Model', runner: runModelPatchTests },
    { name: '6. High-Fidelity DOM, 3D Engine & Asset Integrity', runner: runFidelityTests },
    { name: '7. Multi-Framework Exporters (Astro, Svelte, Vue, Remix)', runner: runExporterTests },
    { name: '8. Official TypeScript & Python SDK Abstractions', runner: runSdkTests },
  ];

  for (const suite of suites) {
    console.log(`\n─── Suite: ${suite.name} ───`);
    try {
      const results = await suite.runner();
      for (const r of results) {
        totalTests++;
        if (r.passed) {
          passedTests++;
          console.log(`  [PASS] ${r.name}`);
        } else {
          failedTests++;
          console.error(`  [FAIL] ${r.name}: ${r.error}`);
        }
      }
    } catch (suiteErr) {
      console.error(`  [CRITICAL ERROR] Suite '${suite.name}' threw unhandled exception:`, suiteErr);
      failedTests++;
    }
  }

  console.log('\n======================================================');
  console.log(`Test Execution Summary:`);
  console.log(`Total:  ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);
  console.log('======================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    console.log('✨ ALL VERIFICATION TESTS PASSED SUCCESSFULLY.\n');
    process.exit(0);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
