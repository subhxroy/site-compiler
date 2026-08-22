/**
 * Security payload test vectors for SSRF, XSS, and prototype pollution mitigation.
 */

export const SSRF_TEST_VECTORS = [
  { url: 'http://127.0.0.1:8080/admin', expectedBlocked: true, reason: 'Loopback IPv4' },
  { url: 'http://localhost:3000/env', expectedBlocked: true, reason: 'Localhost string' },
  { url: 'http://0.0.0.0:80', expectedBlocked: true, reason: 'Unspecified IPv4' },
  { url: 'http://[::1]:8080', expectedBlocked: true, reason: 'Loopback IPv6' },
  { url: 'http://169.254.169.254/latest/meta-data/', expectedBlocked: true, reason: 'AWS Link-local metadata' },
  { url: 'http://metadata.google.internal/computeMetadata/v1/', expectedBlocked: true, reason: 'GCP metadata' },
  { url: 'http://10.0.0.1/internal', expectedBlocked: true, reason: 'Private Class A IP' },
  { url: 'http://172.16.0.1/status', expectedBlocked: true, reason: 'Private Class B IP' },
  { url: 'http://192.168.1.1/router', expectedBlocked: true, reason: 'Private Class C IP' },
  { url: 'file:///etc/passwd', expectedBlocked: true, reason: 'Non-HTTP protocol' },
  { url: 'gopher://127.0.0.1:70/', expectedBlocked: true, reason: 'Gopher protocol' },
  { url: 'dict://127.0.0.1:11211/', expectedBlocked: true, reason: 'Dict protocol' },
  { url: 'ftp://ftp.internal.corp/secret.tar', expectedBlocked: true, reason: 'FTP protocol' },
  { url: 'javascript:alert(1)', expectedBlocked: true, reason: 'JavaScript URI' },
  { url: 'data:text/html,<h1>Test</h1>', expectedBlocked: true, reason: 'Data URI' },
  { url: 'https://subhxroy.framer.website', expectedBlocked: false, reason: 'Legitimate public site' },
  { url: 'https://github.com/subhxroy/site-compiler', expectedBlocked: false, reason: 'Legitimate public repository' },
  { url: 'https://example.com/docs/api', expectedBlocked: false, reason: 'Legitimate public URL' },
];

export const XSS_SANITIZATION_VECTORS = [
  { input: '<script>alert("xss")</script><p>Hello</p>', shouldRemove: '<script>' },
  { input: '<img src="x" onerror="alert(1)" />', shouldSanitize: 'onerror' },
  { input: '<iframe src="javascript:alert(1)"></iframe>', shouldRemove: 'iframe' },
  { input: '<a href="javascript:fetch(\'//evil.com\')">Click</a>', shouldSanitize: 'javascript:' },
];
