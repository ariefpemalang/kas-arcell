const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function copyDirSync(src, dest, excludeDirs = []) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    if (excludeDirs.includes(entry.name)) continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath, excludeDirs);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

const wwwDir = path.join(__dirname, 'www');
if (fs.existsSync(wwwDir)) {
  fs.rmSync(wwwDir, { recursive: true, force: true });
}
fs.mkdirSync(wwwDir, { recursive: true });

// Copy index.html
fs.copyFileSync(path.join(__dirname, 'index.html'), path.join(wwwDir, 'index.html'));

// Copy css, js, assets
copyDirSync(path.join(__dirname, 'css'), path.join(wwwDir, 'css'));
copyDirSync(path.join(__dirname, 'js'), path.join(wwwDir, 'js'));
if (fs.existsSync(path.join(__dirname, 'assets'))) {
  copyDirSync(path.join(__dirname, 'assets'), path.join(wwwDir, 'assets'));
}

// Copy api directory (backend sync script)
if (fs.existsSync(path.join(__dirname, 'api'))) {
  copyDirSync(path.join(__dirname, 'api'), path.join(wwwDir, 'api'), ['backups']);
}

console.log('Successfully built www directory for mobile packaging.');

// Auto generate updated buku-arcell-web.zip
try {
  const zipPath = path.join(__dirname, 'buku-arcell-web.zip');
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }
  console.log('Generating updated buku-arcell-web.zip...');
  execSync(`powershell.exe -NoProfile -Command "Compress-Archive -Path '${wwwDir}\\*' -DestinationPath '${zipPath}' -Force"`, {
    stdio: 'inherit'
  });
  console.log('buku-arcell-web.zip created successfully.');
} catch (e) {
  console.warn('Could not generate zip archive:', e.message);
}
