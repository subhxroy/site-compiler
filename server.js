/**
 * SiteCompiler Multi-Portal Development Server Runner
 * 
 * Simultaneously boots:
 *   1. User Portal  --> http://localhost:3000
 *   2. Express Backend --> http://localhost:3001
 *   3. Admin Portal --> http://localhost:3002
 */

/* eslint-disable @typescript-eslint/no-require-imports */

const { spawn } = require('child_process');
const path = require('path');

const isWindows = process.platform === 'win32';
const npxCmd = isWindows ? 'npx.cmd' : 'npx';

console.log('\x1b[36m%s\x1b[0m', '===============================================================');
console.log('\x1b[35m%s\x1b[0m', '   🚀 SITECOMPILER MULTI-PORTAL SYSTEM BOOTSTRAPPER');
console.log('\x1b[36m%s\x1b[0m', '===============================================================\n');

function runService(name, command, args, color, cwd = process.cwd()) {
  const child = spawn(command, args, {
    cwd,
    stdio: 'pipe',
    shell: false,
    env: { ...process.env, PORT: name === 'Express Backend' ? '3001' : undefined },
  });

  child.stdout.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach((line) => {
      if (line) console.log(`${color}[${name}]\x1b[0m ${line}`);
    });
  });

  child.stderr.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach((line) => {
      if (line) console.log(`\x1b[31m[${name} Error]\x1b[0m ${line}`);
    });
  });

  child.on('close', (code) => {
    console.log(`\x1b[33m[${name}]\x1b[0m process exited with code ${code}`);
  });

  return child;
}

// 1. Boot User Portal on Port 3000
const userPortal = runService('User Portal (Frontend)', npxCmd, ['next', 'dev', '-p', '3000'], '\x1b[32m');

// 2. Boot Express Crawler Backend on Port 3001
const backendEngine = runService('Express Backend Engine', npxCmd, ['tsx', 'server/index.ts'], '\x1b[33m');

// 3. Boot Standalone Admin Portal on Port 3002
const adminPortal = runService('Standalone Admin Portal', npxCmd, ['next', 'dev', '-p', '3002'], '\x1b[34m', path.join(process.cwd(), 'admin-portal'));

setTimeout(() => {
  console.log('\n\x1b[36m%s\x1b[0m', '===============================================================');
  console.log('\x1b[32m%s\x1b[0m', '  🌐 USER PORTAL:       http://localhost:3000');
  console.log('\x1b[33m%s\x1b[0m', '  ⚙️  EXPRESS BACKEND:   http://localhost:3001');
  console.log('\x1b[34m%s\x1b[0m', '  🛡️  ADMIN PORTAL:      http://localhost:3002');
  console.log('\x1b[36m%s\x1b[0m', '===============================================================\n');
}, 3000);

process.on('SIGINT', () => {
  console.log('\nShutting down all SiteCompiler services...');
  userPortal.kill();
  backendEngine.kill();
  adminPortal.kill();
  process.exit(0);
});
