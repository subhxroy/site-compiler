/**
 * SiteCompiler Render 24/7 Keep-Alive Script
 * 
 * Runs a 5-minute interval timer that pings the Render backend health router.
 * Prevents Render's free tier instance from entering sleep state (inactivity spin-down).
 * 
 * Usage:
 *   node scripts/keep-alive.js
 *   or:
 *   npm run keep-alive
 * 
 * Environment variables:
 *   RENDER_BACKEND_URL=https://site-compiler.onrender.com
 *   PING_INTERVAL_MINUTES=5
 */

/* eslint-disable @typescript-eslint/no-require-imports */

const https = require('https');
const http = require('http');

const backendUrl = (process.env.RENDER_BACKEND_URL || 'https://site-compiler.onrender.com').replace(/\/$/, '');
const healthUrl = `${backendUrl}/health`;
const intervalMinutes = parseInt(process.env.PING_INTERVAL_MINUTES || '5', 10);
const intervalMs = intervalMinutes * 60 * 1000;

function pingHealthEndpoint() {
  const timeStr = new Date().toISOString();
  console.log(`[${timeStr}] Pinging Render Health Router: ${healthUrl}`);

  const client = healthUrl.startsWith('https') ? https : http;

  const req = client.get(healthUrl, { timeout: 15000 }, (res) => {
    let data = '';
    res.on('data', (chunk) => (data += chunk));
    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log(`[${timeStr}] SUCCESS: Render Backend ACTIVE (HTTP 200 OK)`);
        try {
          const json = JSON.parse(data);
          console.log(`            Uptime: ${json.uptimeSeconds || 0}s | Service: ${json.service || 'ok'}`);
        } catch {}
      } else {
        console.warn(`[${timeStr}] WARNING: Received status code ${res.statusCode}`);
      }
    });
  });

  req.on('error', (err) => {
    console.error(`[${timeStr}] ERROR: Failed to ping Render backend:`, err.message);
  });

  req.on('timeout', () => {
    req.destroy();
    console.error(`[${timeStr}] ERROR: Ping request timed out (15s limit)`);
  });
}

console.log(`=== SiteCompiler Render 24/7 Keep-Alive Service ===`);
console.log(`Target: ${healthUrl}`);
console.log(`Interval: Every ${intervalMinutes} minutes`);
console.log(`Starting keep-alive loop...\n`);

// Immediate initial ping
pingHealthEndpoint();

// Recurring 5-minute schedule
setInterval(pingHealthEndpoint, intervalMs);
