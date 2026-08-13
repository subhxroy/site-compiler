import { validateUrlForSsrf, validateUrlForSsrfAsync } from '../lib/security/ssrf';

export async function runSsrfTests(): Promise<{ name: string; passed: boolean; error?: string }[]> {
  const results: { name: string; passed: boolean; error?: string }[] = [];

  function assert(name: string, condition: boolean, message?: string) {
    if (condition) {
      results.push({ name, passed: true });
    } else {
      results.push({ name, passed: false, error: message || 'Assertion failed' });
    }
  }

  // ── 1. Lexical checks: localhost & loopback ──
  const loopbackTargets = [
    'http://localhost',
    'http://localhost:3000',
    'http://127.0.0.1',
    'http://127.0.0.1:8080/admin',
    'http://127.0.1.1',
    'http://0.0.0.0',
    'http://[::1]',
    'http://test.localhost',
    'http://internal.local',
    'http://app.internal',
    'http://server.lan',
  ];

  for (const target of loopbackTargets) {
    const res = validateUrlForSsrf(target);
    assert(`Blocks loopback target: ${target}`, !res.valid, `Expected ${target} to be blocked, but was allowed`);
  }

  // ── 2. Lexical checks: Cloud Metadata Services ──
  const metadataTargets = [
    'http://169.254.169.254/latest/meta-data/',
    'http://169.254.169.253',
    'http://100.100.100.200',
    'http://metadata.google.internal/computeMetadata/v1/',
    'http://metadata/v1/instance',
    'http://instance-data/latest/meta-data',
    'http://[fd00:ec2::254]/latest/meta-data',
  ];

  for (const target of metadataTargets) {
    const res = validateUrlForSsrf(target);
    assert(`Blocks cloud metadata: ${target}`, !res.valid, `Expected metadata ${target} to be blocked`);
  }

  // ── 3. Lexical checks: RFC 1918 & CGNAT Private IP Ranges ──
  const privateIps = [
    'http://10.0.0.1',
    'http://10.255.255.254',
    'http://172.16.0.1',
    'http://172.31.255.255',
    'http://192.168.0.1',
    'http://192.168.1.254',
    'http://100.64.0.1',
    'http://100.127.255.254',
    'http://192.0.2.1',
    'http://198.51.100.1',
    'http://203.0.113.1',
  ];

  for (const target of privateIps) {
    const res = validateUrlForSsrf(target);
    assert(`Blocks private/reserved IP: ${target}`, !res.valid, `Expected ${target} to be blocked`);
  }

  // ── 4. Lexical checks: IPv6 Private/ULA/Link-Local ──
  const privateIpv6 = [
    'http://[::1]',
    'http://[fe80::1]',
    'http://[fe80::dead:beef]',
    'http://[fc00::1]',
    'http://[fd12:3456:789a::1]',
    'http://[ff02::1]',
    'http://[::ffff:127.0.0.1]',
    'http://[::ffff:192.168.1.1]',
    'http://[::ffff:10.0.0.1]',
  ];

  for (const target of privateIpv6) {
    const res = validateUrlForSsrf(target);
    assert(`Blocks private IPv6 target: ${target}`, !res.valid, `Expected IPv6 ${target} to be blocked`);
  }

  // ── 5. Lexical checks: Dangerous / Non-HTTP Schemes ──
  const dangerousProtocols = [
    'file:///etc/passwd',
    'ftp://example.com/file.zip',
    'gopher://127.0.0.1:70',
    'javascript:alert(1)',
    'data:text/html,<h1>Hello</h1>',
    'dict://127.0.0.1:11211',
  ];

  for (const target of dangerousProtocols) {
    const res = validateUrlForSsrf(target);
    assert(`Blocks dangerous scheme: ${target}`, !res.valid, `Expected scheme ${target} to be blocked`);
  }

  // ── 6. Lexical checks: Valid Public URLs ──
  const validPublicUrls = [
    'https://example.com',
    'https://subhxroy.framer.website',
    'https://github.com/subhxroy/site-compiler',
    'http://example.com/page?id=123#section',
    'https://subdomain.domain.co.uk/path/to/page',
  ];

  for (const target of validPublicUrls) {
    const res = validateUrlForSsrf(target);
    assert(`Allows valid public URL: ${target}`, res.valid, `Expected ${target} to be allowed, got error: ${res.reason}`);
  }

  // ── 7. Async checks: DNS Resolution of public domain ──
  const asyncExample = await validateUrlForSsrfAsync('https://example.com');
  assert('Async check passes for example.com', asyncExample.valid, `Expected example.com to pass async check, got: ${asyncExample.reason}`);

  return results;
}
