const { execSync } = require('child_process');
const fs = require('fs');

const GH = '"C:\\Program Files\\GitHub CLI\\gh.exe"';

function run(cmd, ignoreError = false) {
  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch (err) {
    if (ignoreError) return '';
    const errText = err.stderr ? err.stderr.toString() : err.message;
    throw new Error(`Command failed: ${cmd}\n${errText}`);
  }
}

const manifest = JSON.parse(fs.readFileSync('pr-manifest.json', 'utf-8'));

const args = process.argv.slice(2);
let startIndex = 0;
let batchCount = manifest.length;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--start' && args[i + 1]) {
    startIndex = parseInt(args[i + 1], 10);
  }
  if (args[i] === '--count' && args[i + 1]) {
    batchCount = parseInt(args[i + 1], 10);
  }
}

const endIndex = Math.min(startIndex + batchCount, manifest.length);

console.log(`\n🚀 Running PR Replay: items ${startIndex + 1} to ${endIndex} of ${manifest.length}...`);

for (let i = startIndex; i < endIndex; i++) {
  const item = manifest[i];
  console.log(`\n[${i + 1}/${manifest.length}] Processing PR: ${item.branch} - "${item.title}"`);

  try {
    // 1. Return to clean main
    run('git checkout main');
    run('git pull origin main', true);

    // 2. Delete existing local branch if any
    run(`git branch -D ${item.branch}`, true);

    // 3. Create fresh feature branch
    run(`git checkout -b ${item.branch}`);

    // 4. Pull files from backup branch
    for (const p of item.paths) {
      run(`git checkout backup-full-expansion -- "${p}"`, true);
      run(`git add "${p}"`, true);
    }

    // 5. Check if staged changes exist
    const status = run('git status --porcelain');
    if (!status) {
      console.log(`  ℹ️ No changes detected for ${item.branch}, skipping.`);
    } else {
      run(`git commit -m "${item.title}"`);
      run(`git push -u origin ${item.branch} --force`);

      // 6. Create PR via GitHub CLI
      const prBody = `${item.body}\n\nAutomated modular PR for architectural decomposition.`;
      console.log(`  Creating Pull Request on GitHub...`);
      const prUrl = run(`${GH} pr create --title "${item.title}" --body "${prBody}" --base main`);
      console.log(`  ✓ PR Created: ${prUrl}`);

      // 7. Merge PR via GitHub CLI
      console.log(`  Merging Pull Request...`);
      run(`${GH} pr merge --squash --delete-branch --admin`, true);
      console.log(`  ✓ PR Merged successfully!`);
    }

    // 8. Return to main
    run('git checkout main');
    run('git pull origin main', true);

    // 1.5 second cooldown between PRs
    execSync('node -e "setTimeout(() => {}, 1500)"');
  } catch (err) {
    console.error(`  ❌ Error processing ${item.branch}:`, err.message);
    run('git checkout main', true);
  }
}

console.log(`\n✨ Batch execution complete for items ${startIndex + 1} to ${endIndex}!`);
