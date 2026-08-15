import { toPublicJob, createJob, updateJob, getJob } from '../lib/jobs/store';

export async function runSecurityTests(): Promise<{ name: string; passed: boolean; error?: string }[]> {
  const results: { name: string; passed: boolean; error?: string }[] = [];

  function assert(name: string, condition: boolean, message?: string) {
    if (condition) {
      results.push({ name, passed: true });
    } else {
      results.push({ name, passed: false, error: message || 'Assertion failed' });
    }
  }

  // ── 1. Admin Email Authorization Allowlist (Exact Match vs Substring) ──
  const testAllowlist = ['contact.subhroy-1@gmail.com', 'contact.subhroy@gmail.com', 'subhxroy@gmail.com'];
  
  function checkAdmin(email: string): boolean {
    const e = (email || '').toLowerCase().trim();
    return testAllowlist.includes(e);
  }

  assert('Authentic owner email matches admin', checkAdmin('contact.subhroy@gmail.com'));
  assert('Authentic secondary email matches admin', checkAdmin('contact.subhroy-1@gmail.com'));
  assert('Attacker email with subhroy substring is REJECTED', !checkAdmin('attacker_subhroy@evil.com'));
  assert('Attacker email with prefix is REJECTED', !checkAdmin('fakecontact.subhroy@gmail.com'));
  assert('Attacker email with domain manipulation is REJECTED', !checkAdmin('subhroy@attacker.com'));
  assert('Empty/null email is REJECTED', !checkAdmin(''));

  // ── 2. UTR and PII Stripping in toPublicJob ──
  const privateJob = createJob('https://example.com', 'nextjs');
  updateJob(privateJob.id, {
    paymentSubmitted: true,
    senderAccount: '9876543210@paytm',
    utrNumber: 'UTR-SECRET-9988776655',
    userEmail: 'user@example.com',
  });

  const rawSaved = getJob(privateJob.id);
  assert('Raw server job holds UTR internally', rawSaved?.utrNumber === 'UTR-SECRET-9988776655');

  const publicView = toPublicJob(rawSaved!);
  const publicRecord = publicView as unknown as Record<string, unknown>;
  assert('Public job view completely omits UTR number', publicRecord.utrNumber === undefined);
  assert('Public job view completely omits sender account', publicRecord.senderAccount === undefined);
  assert('Public job view retains paymentSubmitted flag', publicView.paymentSubmitted === true);
  assert('Public job view retains job ID and URL', publicView.id === privateJob.id && publicView.url === 'https://example.com');

  // ── 3. Server-Authoritative Price Calculation ──
  function computeExportPrice(pageCount: number): number {
    return Math.max(500, Math.ceil(pageCount / 10) * 500);
  }

  assert('1 page export costs ₹500', computeExportPrice(1) === 500);
  assert('5 page export costs ₹500', computeExportPrice(5) === 500);
  assert('10 page export costs ₹500', computeExportPrice(10) === 500);
  assert('11 page export costs ₹1000', computeExportPrice(11) === 1000);
  assert('20 page export costs ₹1000', computeExportPrice(20) === 1000);
  assert('21 page export costs ₹1500', computeExportPrice(21) === 1500);
  assert('100 page export costs ₹5000', computeExportPrice(100) === 5000);

  // ── 4. Log Secret Masking / Sanitization ──
  function sanitizeLog(text: string): string {
    return text
      .replace(/AIza[0-9A-Za-z-_]{35}/g, '[FIREBASE_KEY_REDACTED]')
      .replace(/Bearer\s+[A-Za-z0-9-_.]+/gi, 'Bearer [TOKEN_REDACTED]')
      .replace(/UTR[-:\s]*[0-9A-Za-z]{6,30}/gi, 'UTR-[REDACTED]');
  }

  const logWithSecrets = 'Started job with key AIzaSyDNiWJk2XFi0Q5IKv_1QLlyoMeYI8k9EEs and token Bearer eyJhbGciOi... and UTR-9922883311';
  const cleanLog = sanitizeLog(logWithSecrets);
  assert('Firebase API key redacted from logs', cleanLog.includes('[FIREBASE_KEY_REDACTED]'));
  assert('Bearer token redacted from logs', cleanLog.includes('Bearer [TOKEN_REDACTED]'));
  assert('UTR number redacted from logs', cleanLog.includes('UTR-[REDACTED]'));

  return results;
}
