const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const packaged = path.join(root, 'dist', 'Chuchotage-win32-x64');
const electronExe = path.join(root, 'node_modules', 'electron', 'dist', 'electron.exe');
const hostExe = path.join(packaged, 'ChuchotageHost.exe');
const launcherExe = path.join(packaged, 'Chuchotage.exe');

if (!fs.existsSync(electronExe)) {
  throw new Error(`Electron runtime launcher is missing: ${electronExe}`);
}

if (!fs.existsSync(hostExe)) {
  throw new Error(`Packaged Electron host is missing: ${hostExe}`);
}

fs.copyFileSync(electronExe, launcherExe);
fs.rmSync(hostExe, { force: true });

console.log(`Staged clean Electron launcher in ${launcherExe}`);
