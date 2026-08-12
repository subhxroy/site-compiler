import { createJob, getJob, updateJob, toPublicJob } from '../lib/jobs/store';
import { validateUrlForSsrf } from '../lib/security/ssrf';

async function runSmokeTest() {
  console.log('=== Starting SiteCompiler Backend Smoke Test ===');

  // 1. SSRF Lexical Check Verification
  console.log('\n1. Testing SSRF lexical guard...');
  const ssrfValid = validateUrlForSsrf('https://subhroy.com');
  const ssrfBlocked = validateUrlForSsrf('http://169.254.169.254/latest/meta-data');
  if (!ssrfValid.valid || ssrfBlocked.valid) {
    throw new Error('SSRF validation sanity test failed!');
  }
  console.log('✔ SSRF lexical checks working as expected.');

  // 2. Job Lifecycle & Store Verification
  console.log('\n2. Testing Job Lifecycle & Idempotency Store...');
  const key = `test_key_${Date.now()}`;
  const job1 = createJob('https://subhroy.com', 'nextjs', key);
  const job2 = createJob('https://subhroy.com', 'nextjs', key);
  if (job1.id !== job2.id) {
    throw new Error('Idempotency key did not return the existing job!');
  }
  console.log(`✔ Idempotency key returned existing job: ${job1.id}`);

  // 3. Status Transition Verification
  console.log('\n3. Testing status update and public job formatting...');
  updateJob(job1.id, { status: 'crawling', progressMessage: 'Crawling site...' }, 'Test log line');
  const fetched = getJob(job1.id);
  if (!fetched || fetched.status !== 'crawling') {
    throw new Error('Job status failed to update!');
  }
  const publicData = toPublicJob(fetched);
  if (publicData.id !== job1.id || publicData.status !== 'crawling') {
    throw new Error('Public job contract mismatch!');
  }
  console.log('✔ Job status state machine and public serialization verified.');

  // 4. Mark completed and test download URL configuration
  updateJob(job1.id, {
    status: 'completed',
    downloadUrl: `/api/job/${job1.id}/download`,
    paymentApproved: true,
  });
  const completedJob = getJob(job1.id);
  if (completedJob?.status !== 'completed' || !completedJob.paymentApproved) {
    throw new Error('Completed job status mismatch!');
  }
  console.log('✔ Job completed status & payment approval state verified.');

  console.log('\n=== All Backend Smoke Tests PASSED Successfully ===');
}

runSmokeTest().catch((err) => {
  console.error('Smoke test failed:', err);
  process.exit(1);
});
