// Cross-platform packaging script for npm run package
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
const extName = 'obsidian-markdown-viewer';
const version = manifest.version;
const zipName = `${extName}-${version}.zip`;

function zipWithNode() {
  const archiver = require('archiver');
  const output = fs.createWriteStream(zipName);
  const archive = archiver('zip', { zlib: { level: 9 } });
  return new Promise((resolve, reject) => {
    output.on('close', resolve);
    archive.on('error', reject);
    archive.pipe(output);
    fs.readdirSync('.').forEach(file => {
      if (file === '.git' || file === zipName || file === 'node_modules' || file === 'scripts') return;
      archive.glob(file + '/**', { ignore: ['.git/**', 'node_modules/**', 'scripts/**'] });
      if (fs.lstatSync(file).isFile()) archive.file(file, { name: file });
    });
    archive.finalize();
  });
}

(async () => {
  try {
    // Try native zip first
    if (process.platform === 'win32') {
      try {
        execSync(`powershell -Command "Compress-Archive -Path * -DestinationPath ${zipName}"`, { stdio: 'inherit' });
        process.exit(0);
      } catch {}
    } else {
      try {
        execSync(`zip -r ${zipName} . -x '*.git*' -x 'node_modules/*' -x 'scripts/*'`, { stdio: 'inherit' });
        process.exit(0);
      } catch {}
    }
    // Fallback to Node archiver
    console.log('Native zip not available, using Node archiver...');
    await zipWithNode();
    console.log(`Packaged as ${zipName}`);
  } catch (e) {
    console.error('Packaging failed:', e);
    process.exit(1);
  }
})();
