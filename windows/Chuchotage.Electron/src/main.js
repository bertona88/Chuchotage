const { app, BrowserWindow, ipcMain, shell } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const readline = require('readline');

let mainWindow;
let backend;

const iconPath = path.resolve(__dirname, '../assets/chuchotage.ico');

class BackendBridge {
  constructor() {
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Set();
    this.process = null;
  }

  start() {
    if (this.process) {
      return;
    }

    const backendPath = process.env.CHUCHOTAGE_BACKEND
      || packagedBackendPath()
      || path.resolve(__dirname, '../../Chuchotage.Windows/bin/Release/net8.0-windows10.0.19041.0/win-x64/publish/Chuchotage.exe');

    this.process = spawn(backendPath, ['--server'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });

    const lines = readline.createInterface({ input: this.process.stdout });
    lines.on('line', (line) => this.handleLine(line));

    this.process.stderr.on('data', (data) => {
      this.emit('backendLog', { level: 'error', message: data.toString() });
    });

    this.process.on('exit', (code) => {
      this.emit('backendExit', { code });
      for (const { reject } of this.pending.values()) {
        reject(new Error('Chuchotage backend exited.'));
      }
      this.pending.clear();
      this.process = null;
    });
  }

  request(command, payload = {}) {
    this.start();
    const id = String(this.nextId++);
    const message = JSON.stringify({ id, command, ...payload });

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.process.stdin.write(`${message}\n`, (error) => {
        if (error) {
          this.pending.delete(id);
          reject(error);
        }
      });
    });
  }

  handleLine(line) {
    let envelope;
    try {
      envelope = JSON.parse(line);
    } catch (error) {
      this.emit('backendLog', { level: 'error', message: line });
      return;
    }

    if (envelope.type === 'response') {
      const pending = this.pending.get(envelope.id);
      if (!pending) {
        return;
      }
      this.pending.delete(envelope.id);
      if (envelope.ok) {
        pending.resolve(envelope.data);
      } else {
        pending.reject(new Error(envelope.error || 'Chuchotage backend command failed.'));
      }
      return;
    }

    if (envelope.type === 'event') {
      this.emit(envelope.event, envelope.data);
    }
  }

  on(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(event, data) {
    for (const listener of this.listeners) {
      listener(event, data);
    }
  }

  stop() {
    if (!this.process) {
      return;
    }

    this.request('shutdown').catch(() => {});
    setTimeout(() => {
      if (this.process) {
        this.process.kill();
      }
    }, 1200).unref();
  }
}

function packagedBackendPath() {
  const candidates = [
    path.join(process.resourcesPath || '', 'app', 'backend', 'Chuchotage.exe'),
    path.resolve(__dirname, '../backend/Chuchotage.exe'),
  ];

  for (const candidate of candidates) {
    try {
      require('fs').accessSync(candidate);
      return candidate;
    } catch {
      // Try the next runtime layout.
    }
  }

  return null;
}

function createWindow() {
  backend = new BackendBridge();
  backend.start();

  mainWindow = new BrowserWindow({
    width: 920,
    height: 820,
    minWidth: 760,
    minHeight: 700,
    title: 'Chuchotage',
    icon: iconPath,
    backgroundColor: '#02070c',
    titleBarStyle: 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  backend.on((event, data) => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      return;
    }
    mainWindow.webContents.send('backend:event', { event, data });
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));
}

ipcMain.handle('bridge:request', async (_event, command, payload) => {
  return backend.request(command, payload);
});

ipcMain.handle('shell:openExternal', async (_event, url) => {
  const parsed = new URL(String(url));
  if (parsed.protocol !== 'https:') {
    throw new Error('Only https links can be opened externally.');
  }

  await shell.openExternal(parsed.toString());
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (backend) {
    backend.stop();
  }
  app.quit();
});

app.on('before-quit', () => {
  if (backend) {
    backend.stop();
  }
});
