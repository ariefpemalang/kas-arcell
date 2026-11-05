const fs = require('fs');
const path = require('path');

function copyDirSync(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
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

// Copy css and js
copyDirSync(path.join(__dirname, 'css'), path.join(wwwDir, 'css'));
copyDirSync(path.join(__dirname, 'js'), path.join(wwwDir, 'js'));
if (fs.existsSync(path.join(__dirname, 'assets'))) {
  copyDirSync(path.join(__dirname, 'assets'), path.join(wwwDir, 'assets'));
}

console.log('Successfully built www directory for mobile packaging.');
