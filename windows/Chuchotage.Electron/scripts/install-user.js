const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const packaged = path.join(root, 'dist', 'Chuchotage-win32-x64');
const install = path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'Programs', 'Chuchotage Electron');
const launcherExe = 'Chuchotage.exe';
const exe = path.join(install, launcherExe);

if (!fs.existsSync(path.join(packaged, launcherExe))) {
  throw new Error(`Packaged Electron app is missing: ${packaged}`);
}

function assertLauncherPresent() {
  if (!fs.existsSync(exe)) {
    throw new Error(
      `Installed launcher is missing: ${exe}\n` +
      'Windows Defender or another security product may have quarantined it. ' +
      'Check Windows Security > Protection history for the latest Chuchotage detection.'
    );
  }
}

try {
  const stopScript = `
$install = ${JSON.stringify(install)}
$installRoot = (Resolve-Path -LiteralPath $install -ErrorAction SilentlyContinue).Path
if ($installRoot) {
  $processes = @(
    Get-CimInstance Win32_Process |
      Where-Object {
        $_.ExecutablePath -and
        $_.ExecutablePath.StartsWith($installRoot, [StringComparison]::OrdinalIgnoreCase)
      }
  )
  $processes | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  $processes | ForEach-Object { Wait-Process -Id $_.ProcessId -Timeout 5 -ErrorAction SilentlyContinue }
}
`;
  execFileSync('powershell', ['-NoProfile', '-Command', stopScript], { stdio: 'ignore' });
} catch {
  // No running process is fine.
}

fs.rmSync(install, { recursive: true, force: true, maxRetries: 10, retryDelay: 500 });
fs.mkdirSync(path.dirname(install), { recursive: true });
fs.cpSync(packaged, install, { recursive: true });
assertLauncherPresent();

const shortcutScript = `
$exe = ${JSON.stringify(exe)}
$install = ${JSON.stringify(install)}
$icon = Join-Path $install 'resources/app/src/assets/chuchotage.ico'
$startMenuDir = Join-Path $env:APPDATA 'Microsoft/Windows/Start Menu/Programs/Chuchotage'
New-Item -ItemType Directory -Force -Path $startMenuDir | Out-Null
$desktop = [Environment]::GetFolderPath('DesktopDirectory')
$shell = New-Object -ComObject WScript.Shell
foreach ($shortcutPath in @((Join-Path $startMenuDir 'Chuchotage.lnk'), (Join-Path $desktop 'Chuchotage.lnk'))) {
    $shortcut = $shell.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = $exe
    $shortcut.WorkingDirectory = $install
    $shortcut.IconLocation = "$icon,0"
    $shortcut.Description = 'Chuchotage Windows audio translation'
    $shortcut.Save()
}
`;

execFileSync('powershell', ['-NoProfile', '-Command', shortcutScript], { stdio: 'inherit' });
assertLauncherPresent();
console.log(`Installed Electron app to ${install}`);
