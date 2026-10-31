// Short git commit of the code a build came from, shown in Settings → About so a phone can be
// matched to a commit. CI passes GITHUB_SHA; a local build asks git; neither gives null.
const { execSync } = require('child_process');

function buildCommit() {
  const fromCi = process.env.GITHUB_SHA;
  if (fromCi && /^[0-9a-f]{7,40}$/.test(fromCi)) return fromCi.slice(0, 7);
  try {
    const head = execSync('git rev-parse --short=7 HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    return /^[0-9a-f]{7}$/.test(head) ? head : null;
  } catch {
    return null;
  }
}

module.exports = { buildCommit };
