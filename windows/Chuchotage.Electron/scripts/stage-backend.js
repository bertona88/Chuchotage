const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const publish = path.resolve(root, '../Chuchotage.Windows/bin/Release/net8.0-windows10.0.19041.0/win-x64/publish');
const target = path.join(root, 'backend');

if (!fs.existsSync(path.join(publish, 'Chuchotage.exe'))) {
  throw new Error(`Backend publish output is missing: ${publish}`);
}

fs.rmSync(target, { recursive: true, force: true });
fs.mkdirSync(target, { recursive: true });
fs.cpSync(publish, target, { recursive: true });

console.log(`Staged backend in ${target}`);
