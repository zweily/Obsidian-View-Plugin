// scripts/changelog.js
// Generates a simple changelog from recent git commits
const { execSync } = require('child_process');
const fs = require('fs');

try {
  const log = execSync('git log --pretty=format:"- %s" -n 10').toString();
  const changelog = `# Changelog\n\n## Latest Changes\n${log}\n`;
  fs.writeFileSync('CHANGELOG.md', changelog, { flag: 'w' });
  console.log('CHANGELOG.md updated.');
} catch (e) {
  console.error('Failed to generate changelog:', e);
  process.exit(1);
}
