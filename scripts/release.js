// scripts/release.js
// Automates GitHub release creation using the GitHub CLI (gh)
const { execSync } = require('child_process');
const fs = require('fs');

const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
const version = manifest.version;
const zipName = `obsidian-markdown-viewer-${version}.zip`;
const tag = `v${version}`;

try {
  // Ensure changelog and package exist
  if (!fs.existsSync('CHANGELOG.md')) {
    throw new Error('CHANGELOG.md not found. Run changelog script first.');
  }
  if (!fs.existsSync(zipName)) {
    throw new Error(`${zipName} not found. Run package script first.');
  }
  // Create a git tag if it doesn't exist
  try {
    execSync(`git tag ${tag}`);
    execSync(`git push origin ${tag}`);
  } catch {}
  // Create GitHub release using gh CLI
  execSync(`gh release create ${tag} ${zipName} --title "${tag}" --notes-file CHANGELOG.md`, { stdio: 'inherit' });
  console.log('GitHub release created.');
} catch (e) {
  console.error('Failed to create GitHub release:', e);
  process.exit(1);
}
