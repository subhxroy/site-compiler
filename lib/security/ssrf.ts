import { URL } from 'url';
import dns from 'dns/promises';

/**
 * Anti-SSRF (Server-Side Request Forgery) Validator
 * Rejects localhost, private IP ranges, cloud metadata endpoints, dangerous
 * protocols, IPv6 private/loopback/ULA addresses, and (via async variant)
 * hostnames whose DNS resolves to an internal address (nip.io/sslip.io/DNS
 * rebinding / decimal-IP encodings).
 */

function normalizeHostname(hostname: string): string {
  let h = hostname.toLowerCase().replace(/\.$/, '').trim();
  // WHATWG URL keeps brackets on IPv6 literals ([::1]); strip them for checks.
  if (h.startsWith('[') && h.endsWith(']')) h = h.slice(1, -1);
  return h;
}

export function isBlockedIpv4(ip: string): boolean {
  const m = ip.trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const a = parseInt(m[1], 10);
  const b = parseInt(m[2], 10);
  const c = parseInt(m[3], 10);
  const d = parseInt(m[4], 10);

  if (a > 255 || b > 255 || c > 255 || d > 255) return true; // malformed / out of range
  if (a === 0) return true; // 0.0.0.0/8 (broadcast/this host)
  if (a === 10) return true; // 10.0.0.0/8 private
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT / shared address
  if (a === 127) return true; // 127.0.0.0/8 loopback
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local / cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 private
  if (a === 192 && b === 0 && c === 0) return true; // 192.0.0.0/24 IETF protocol assignments
  if (a === 192 && b === 0 && c === 2) return true; // 192.0.2.0/24 TEST-NET-1
  if (a === 192 && b === 88 && c === 99) return true; // 192.88.99.0/24 6to4 relay anycast
  if (a === 192 && b === 168) return true; // 192.168.0.0/16 private
  if (a === 198 && b >= 18 && b <= 19) return true; // 198.18.0.0/15 benchmarking
  if (a === 198 && b === 51 && c === 100) return true; // 198.51.100.0/24 TEST-NET-2
  if (a === 203 && b === 0 && c === 113) return true; // 203.0.113.0/24 TEST-NET-3
  if (a >= 224 && a <= 239) return true; // 224.0.0.0/4 multicast
  if (a >= 240) return true; // 240.0.0.0/4 reserved (including 255.255.255.255)
  if (a === 100 && b === 100 && c === 100 && d === 200) return true; // Alibaba Cloud metadata

  return false;
}

export function isBlockedIpv6(ip: string): boolean {
  const v = ip.toLowerCase().trim();
  // Loopback ::1, unspecified ::
  if (v === '::1' || v === '::' || v === '0:0:0:0:0:0:0:1' || v === '0:0:0:0:0:0:0:0') return true;

  // IPv4-mapped IPv6 (::ffff:0:0/96 or ::ffff:127.0.0.1)
  if (v.startsWith('::ffff:')) {
    const embedded = v.split('::ffff:')[1];
    if (embedded && embedded.includes('.')) return isBlockedIpv4(embedded);
    if (embedded && embedded.includes(':')) {
      const parts = embedded.split(':');
      if (parts.length === 2) {
        const p1 = parseInt(parts[0], 16);
        const p2 = parseInt(parts[1], 16);
        const ip4 = `${(p1 >> 8) & 0xff}.${p1 & 0xff}.${(p2 >> 8) & 0xff}.${p2 & 0xff}`;
        return isBlockedIpv4(ip4);
      }
    }
  }

  // IPv4-translated (64:ff9b::/96)
  if (v.startsWith('64:ff9b:')) {
    const embedded = v.split('64:ff9b:')[1]?.replace(/^:/, '');
    if (embedded && embedded.includes('.')) return isBlockedIpv4(embedded);
  }

  // Link-local fe80::/10
  if (v.startsWith('fe80:') || v.startsWith('fe8') || v.startsWith('fe9') || v.startsWith('fea') || v.startsWith('feb')) return true;

  // ULA fc00::/7 (fc00:: through fdff::)
  if (v.startsWith('fc') || v.startsWith('fd')) return true;

  // Multicast ff00::/8
  if (v.startsWith('ff')) return true;

  // Discard prefix 100::/64
  if (v.startsWith('100:')) return true;

  // Documentation 2001:db8::/32
  if (v.startsWith('2001:db8:') || v.startsWith('2001:0db8:')) return true;

  // ORCHID 2001:10::/28 or 2001:20::/28
  if (v.startsWith('2001:10:') || v.startsWith('2001:20:') || v.startsWith('2001:001') || v.startsWith('2001:002')) return true;

  // AWS IPv6 metadata (fd00:ec2::254)
  if (v === 'fd00:ec2::254') return true;

  // 6to4 2002::/16 embeds IPv4 in bytes 2-5
  if (v.startsWith('2002:')) {
    const parts = v.split(':');
    if (parts.length >= 3 && parts[1].length === 4) {
      const h1 = parseInt(parts[1].slice(0, 2), 16);
      const h2 = parseInt(parts[1].slice(2, 4), 16);
      const h3 = parseInt(parts[2].slice(0, 2), 16);
      const h4 = parseInt(parts[2].slice(2, 4), 16);
      if (isBlockedIpv4(`${h1}.${h2}.${h3}.${h4}`)) return true;
    }
  }

  return false;
}

export function isBlockedIp(address: string): boolean {
  if (!address) return true;
  const v = address.trim().toLowerCase();
  if (v.includes(':')) return isBlockedIpv6(v);
  return isBlockedIpv4(v);
}

/**
 * Lexical-only validation (synchronous). Does NOT resolve DNS. Use
 * `validateUrlForSsrfAsync` when a real fetch will follow the URL.
 */
export function validateUrlForSsrf(inputUrl: string): { valid: boolean; reason?: string; url?: string } {
  if (!inputUrl || typeof inputUrl !== 'string') {
    return { valid: false, reason: 'URL string is required' };
  }

  const formattedUrl = inputUrl.trim();

  let parsed: URL;
  const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(formattedUrl);
  if (hasScheme) {
    try {
      parsed = new URL(formattedUrl);
    } catch {
      return { valid: false, reason: 'Invalid URL format' };
    }
  } else {
    try {
      parsed = new URL(`https://${formattedUrl}`);
    } catch {
      return { valid: false, reason: 'Invalid URL format' };
    }
  }

  const protocol = parsed.protocol.toLowerCase();
  if (protocol !== 'http:' && protocol !== 'https:') {
    return { valid: false, reason: `Forbidden protocol '${protocol}'. Only http and https are allowed.` };
  }

  const hostname = normalizeHostname(parsed.hostname);

  // Block localhost & loopback domains
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname === '::1' ||
    hostname === '0' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.lan') ||
    hostname.endsWith('.home') ||
    hostname.endsWith('.corp') ||
    hostname.endsWith('.intranet')
  ) {
    return { valid: false, reason: 'Access to localhost and internal loopback addresses is forbidden' };
  }

  // Block Cloud Instance Metadata Service (AWS, GCP, Azure, Alibaba, OpenStack)
  if (
    hostname === '169.254.169.254' ||
    hostname === '169.254.169.253' ||
    hostname === '100.100.100.200' ||
    hostname === 'metadata.google.internal' ||
    hostname === 'metadata' ||
    hostname === 'instance-data' ||
    hostname === 'fd00:ec2::254'
  ) {
    return { valid: false, reason: 'Access to cloud instance metadata services is strictly forbidden' };
  }

  // Block private IPv4 literal addresses
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
    if (isBlockedIpv4(hostname)) {
      return { valid: false, reason: 'Access to private, loopback, or reserved IP addresses is forbidden' };
    }
  }

  // Block private/loopback/ULA/multicast IPv6 literal addresses
  if (hostname.includes(':')) {
    if (isBlockedIpv6(hostname)) {
      return { valid: false, reason: 'Access to private, loopback, or reserved IPv6 addresses is forbidden' };
    }
  }

  return { valid: true, url: parsed.href };
}

const dnsCache = new Map<string, { valid: boolean; reason?: string; expiresAt: number }>();
const DNS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function clearDnsCache(): void {
  dnsCache.clear();
}

/**
 * Async validation: runs lexical checks AND resolves the hostname via DNS,
 * rejecting any target that resolves to a blocked or internal address.
 * Use before any server-side fetch (crawling, asset downloads, proxy requests).
 */
export async function validateUrlForSsrfAsync(inputUrl: string): Promise<{ valid: boolean; reason?: string; url?: string }> {
  const lexical = validateUrlForSsrf(inputUrl);
  if (!lexical.valid || !lexical.url) return lexical;

  const hostname = normalizeHostname(new URL(lexical.url).hostname);

  // Literal IPs already checked lexically.
  if (hostname.includes(':') || /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) return lexical;

  const now = Date.now();
  const cached = dnsCache.get(hostname);
  if (cached && cached.expiresAt > now) {
    if (!cached.valid) {
      return { valid: false, reason: cached.reason };
    }
    return lexical;
  }

  let addresses: Array<{ address: string; family: number }>;
  try {
    addresses = await dns.lookup(hostname, { all: true });
  } catch {
    // Unresolvable hostname cannot reach an internal service — allow and let
    // the actual fetch surface the failure naturally.
    dnsCache.set(hostname, { valid: true, expiresAt: now + DNS_CACHE_TTL_MS });
    return lexical;
  }

  if (!addresses || addresses.length === 0) {
    const reason = 'Target hostname resolved to no addresses';
    dnsCache.set(hostname, { valid: false, reason, expiresAt: now + DNS_CACHE_TTL_MS });
    return { valid: false, reason };
  }

  for (const { address } of addresses) {
    if (isBlockedIp(address)) {
      const reason = `Target resolves to a blocked/internal address (${address})`;
      dnsCache.set(hostname, { valid: false, reason, expiresAt: now + DNS_CACHE_TTL_MS });
      return { valid: false, reason };
    }
  }

  dnsCache.set(hostname, { valid: true, expiresAt: now + DNS_CACHE_TTL_MS });
  return lexical;
}
