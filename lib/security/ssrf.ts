import { URL } from 'url';

/**
 * Anti-SSRF (Server-Side Request Forgery) Validator
 * Rejects localhost, private IP ranges, cloud metadata endpoints, and dangerous protocols.
 */
export function validateUrlForSsrf(inputUrl: string): { valid: boolean; reason?: string; url?: string } {
  if (!inputUrl || typeof inputUrl !== 'string') {
    return { valid: false, reason: 'URL string is required' };
  }

  let formattedUrl = inputUrl.trim();
  if (!/^https?:\/\//i.test(formattedUrl)) {
    formattedUrl = `https://${formattedUrl}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(formattedUrl);
  } catch {
    return { valid: false, reason: 'Invalid URL format' };
  }

  const protocol = parsed.protocol.toLowerCase();
  if (protocol !== 'http:' && protocol !== 'https:') {
    return { valid: false, reason: `Forbidden protocol '${protocol}'. Only http and https are allowed.` };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block localhost & loopback
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname === '::1' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local')
  ) {
    return { valid: false, reason: 'Access to localhost and internal loopback addresses is forbidden' };
  }

  // Block Cloud Instance Metadata Service (AWS, GCP, Azure)
  if (hostname === '169.254.169.254' || hostname === '169.254.169.253' || hostname === 'metadata.google.internal') {
    return { valid: false, reason: 'Access to cloud instance metadata services is strictly forbidden' };
  }

  // Block Private IPv4 Address Ranges (RFC 1918 & RFC 6598)
  const ipMatch = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipMatch) {
    const oct1 = parseInt(ipMatch[1], 10);
    const oct2 = parseInt(ipMatch[2], 10);

    // 10.0.0.0/8 (Private)
    if (oct1 === 10) return { valid: false, reason: 'Access to private 10.x.x.x IP range is forbidden' };

    // 172.16.0.0/12 (Private)
    if (oct1 === 172 && oct2 >= 16 && oct2 <= 31) return { valid: false, reason: 'Access to private 172.16-31.x.x IP range is forbidden' };

    // 192.168.0.0/16 (Private)
    if (oct1 === 192 && oct2 === 168) return { valid: false, reason: 'Access to private 192.168.x.x IP range is forbidden' };

    // 169.254.0.0/16 (Link-local)
    if (oct1 === 169 && oct2 === 254) return { valid: false, reason: 'Access to link-local 169.254.x.x IP range is forbidden' };

    // 100.64.0.0/10 (CGNAT)
    if (oct1 === 100 && oct2 >= 64 && oct2 <= 127) return { valid: false, reason: 'Access to CGNAT 100.64.x.x IP range is forbidden' };

    // 0.0.0.0/8
    if (oct1 === 0) return { valid: false, reason: 'Access to 0.x.x.x IP range is forbidden' };
  }

  return { valid: true, url: parsed.href };
}
