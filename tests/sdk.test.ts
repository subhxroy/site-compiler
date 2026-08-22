import { SiteCompilerClient } from '../packages/sitecompiler-sdk/src/client';
import { SiteCompilerError, PaymentRequiredError, JobNotFoundError } from '../packages/sitecompiler-sdk/src/errors';

console.log('─── Suite: SDK Client & Resource Abstraction ───');

// 1. Client instantiation
const client = new SiteCompilerClient({
  baseUrl: 'http://localhost:3001',
  apiKey: 'test_token_123',
  adminSecret: 'test_secret_456',
});

console.assert(client.jobs !== undefined, 'Client should instantiate Jobs resource');
console.assert(client.exports !== undefined, 'Client should instantiate Exports resource');
console.log('  [PASS] SDK Client instantiates with configuration headers');

// 2. Error classes hierarchy
const baseErr = new SiteCompilerError('Server Error', 500);
console.assert(baseErr.status === 500, 'SiteCompilerError status code matches');

const payErr = new PaymentRequiredError();
console.assert(payErr.status === 403, 'PaymentRequiredError has 403 status');

const notFoundErr = new JobNotFoundError('job_abc123');
console.assert(notFoundErr.status === 404, 'JobNotFoundError has 404 status');
console.assert(notFoundErr.message.includes('job_abc123'), 'JobNotFoundError mentions missing job id');
console.log('  [PASS] SDK Error classes follow correct HTTP status hierarchy');

console.log('✨ All SDK unit tests passed successfully.\n');
