import { runSsrfTests } from './ssrf.test';
import { runSecurityTests } from './security.test';
import { runPipelineTests } from './pipeline.test';
import { runCrawlerTests } from './crawler.test';
import { runModelPatchTests } from './model-patch.test';
import { runFidelityTests } from './fidelity.test';

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
