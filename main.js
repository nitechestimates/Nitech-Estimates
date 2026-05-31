const fs = require('fs');
const os = require('os');
const path = require('path');

// ── Explicit Environment Variables Loader ─────────────────────────────────────
function loadEnvFiles() {
  const envFiles = ['.env', '.env.local'];
  envFiles.forEach(file => {
    const envPath = path.join(__dirname, file);
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, 'utf8');
        content.split(/\r?\n/).forEach(line => {
          line = line.trim();
          if (!line || line.startsWith('#')) return;
          const index = line.indexOf('=');
          if (index > 0) {
            const key = line.substring(0, index).trim();
            let val = line.substring(index + 1).trim();
            // Remove wrapping quotes if present
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.substring(1, val.length - 1);
            }
            if (key) {
              process.env[key] = val;
            }
          }
        });
        console.log(`✓ Loaded environment variables from ${file}`);
      } catch (err) {
        console.error(`Failed to parse ${file}:`, err);
      }
    }
  });
}
loadEnvFiles();

// ── Global Crash Handling and Logging ─────────────────────────────────────────
function logCrash(err) {
  const logDir = path.join(os.homedir(), 'NitechEstimatesLogs');
  try {
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    const logPath = path.join(logDir, 'crash.log');
    const msg = `[${new Date().toISOString()}] CRASH:\n${err && err.stack ? err.stack : err}\n\n`;
    fs.appendFileSync(logPath, msg);
  } catch (e) {
    try {
      fs.appendFileSync(path.join(os.tmpdir(), 'nitech_crash.log'), `[${new Date().toISOString()}] CRASH:\n${err && err.stack ? err.stack : err}\n\n`);
    } catch (e2) {}
  }
}

process.on('uncaughtException', (err) => {
  logCrash(err);
  try {
    const { dialog } = require('electron');
    dialog.showErrorBox('Critical Startup Error', err && err.stack ? err.stack : String(err));
  } catch (e) {}
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  logCrash(err);
  try {
    const { dialog } = require('electron');
    dialog.showErrorBox('Critical Promise Rejection', err && err.stack ? err.stack : String(err));
  } catch (e) {}
  process.exit(1);
});

const { app, BrowserWindow, session, shell } = require('electron');
const { spawn } = require('child_process');
const net = require('net');

const PORT = 3000;

let mainWindow, splashWindow, nextProcess, loginWindow = null;

// ── Splash screen ──────────────────────────────────────────────────────────────
function showSplash() {
  splashWindow = new BrowserWindow({
    width: 480, height: 300,
    frame: false, resizable: false, center: true,
    backgroundColor: '#1e40af',
    alwaysOnTop: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });

  splashWindow.loadURL(`data:text/html,<!DOCTYPE html><html><head><style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{background:linear-gradient(135deg,#1e3a8a,#2563eb);display:flex;
      flex-direction:column;align-items:center;justify-content:center;
      height:100vh;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
      color:white;user-select:none}
    .logo{font-size:38px;font-weight:900;letter-spacing:3px;margin-bottom:4px}
    .sub{font-size:12px;opacity:.65;letter-spacing:4px;text-transform:uppercase;margin-bottom:40px}
    .spinner{width:36px;height:36px;border:3px solid rgba(255,255,255,.25);
      border-top-color:white;border-radius:50%;animation:spin .8s linear infinite}
    .status{font-size:11px;opacity:.55;margin-top:14px;letter-spacing:1px}
    @keyframes spin{to{transform:rotate(360deg)}}
  </style></head><body>
    <div class=logo>NITECH</div>
    <div class=sub>Estimates</div>
    <div class=spinner></div>
    <div class=status>Starting server&hellip;</div>
  </body></html>`);
}

function closeSplash() {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.close();
    splashWindow = null;
  }
}

// ── Poll until Next.js accepts TCP connections ─────────────────────────────────
function waitForPort(port, timeoutMs = 90000) {
  const t0 = Date.now();
  return new Promise((resolve, reject) => {
    (function attempt() {
      const sock = net.createConnection({ port, host: '127.0.0.1' });
      sock.once('connect', () => { sock.destroy(); resolve(); });
      sock.once('error', () => {
        if (Date.now() - t0 > timeoutMs) return reject(new Error('Server did not start in time'));
        setTimeout(attempt, 600);
      });
    })();
  });
}

// ── Launch Next.js via node directly ──────────────────────────────────────────
async function startNextServer() {
  const nextScript = path.join(__dirname, 'node_modules', 'next', 'dist', 'bin', 'next');

  // Debug log which env vars are available before spawning
  try {
    const logDir = path.join(os.homedir(), 'NitechEstimatesLogs');
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    const debugLog = path.join(logDir, 'startup.log');
    const envDebug = [
      `[${new Date().toISOString()}] Starting Next.js server`,
      `  __dirname: ${__dirname}`,
      `  MONGODB_URI set: ${!!process.env.MONGODB_URI}`,
      `  MONGODB_URI starts: ${(process.env.MONGODB_URI || '').slice(0, 30)}`,
      `  NEXTAUTH_SECRET set: ${!!process.env.NEXTAUTH_SECRET}`,
      `  NEXTAUTH_URL: ${process.env.NEXTAUTH_URL}`,
      `  GOOGLE_CLIENT_ID set: ${!!process.env.GOOGLE_CLIENT_ID}`,
    ].join('\n');
    fs.appendFileSync(debugLog, envDebug + '\n\n');
  } catch (e) { console.warn('Could not write startup log:', e); }

  nextProcess = spawn(
    process.execPath,
    [nextScript, 'start', '--port', String(PORT)],
    {
      cwd: __dirname,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
      // Pass all env vars explicitly so Next.js inherits them
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: '1',
        // Explicitly forward each key so they survive the spawn boundary
        MONGODB_URI: process.env.MONGODB_URI || '',
        NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || '',
        NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
        GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
      }
    }
  );

  // Log Next.js output — wrap in try/catch to avoid crashing on log errors
  try {
    const logDir = path.join(os.homedir(), 'NitechEstimatesLogs');
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    const logFile = path.join(logDir, 'server.log');
    const logStream = fs.createWriteStream(logFile, { flags: 'a' });
    logStream.on('error', (e) => console.warn('Log stream error:', e));
    nextProcess.stdout.on('data', d => { const s = d.toString().trim(); console.log('[Next]', s); try { logStream.write(`[STDOUT] ${s}\n`); } catch(e){} });
    nextProcess.stderr.on('data', d => { const s = d.toString().trim(); console.error('[Next]', s); try { logStream.write(`[STDERR] ${s}\n`); } catch(e){} });
    nextProcess.on('error', err => { console.error('Next spawn error:', err); try { logStream.write(`[SPAWN ERROR] ${err}\n`); } catch(e){} });
  } catch (e) {
    // Fallback: no file logging, just console
    nextProcess.stdout.on('data', d => console.log('[Next]', d.toString().trim()));
    nextProcess.stderr.on('data', d => console.error('[Next]', d.toString().trim()));
    nextProcess.on('error', err => console.error('Next spawn error:', err));
  }

  await waitForPort(PORT);
  console.log('✓ Next.js ready on port', PORT);
}

// ── Kill Next.js child process tree on Windows ────────────────────────────────
function killNextProcess() {
  if (!nextProcess) return;
  try {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(nextProcess.pid), '/f', '/t'], { windowsHide: true });
    } else {
      nextProcess.kill('SIGTERM');
    }
  } catch (e) { /* ignore */ }
  nextProcess = null;
}

// ── Open OAuth login window (stays inside Electron) ───────────────────────────
function openLoginWindow() {
  if (loginWindow && !loginWindow.isDestroyed()) {
    loginWindow.focus();
    return;
  }

  loginWindow = new BrowserWindow({
    width: 800,
    height: 600,
    parent: mainWindow,
    modal: true,
    show: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const loginUrl = `http://localhost:${PORT}/api/auth/signin/google`;
  loginWindow.loadURL(loginUrl);

  loginWindow.on('closed', () => {
    loginWindow = null;
  });

  const closeAndReload = () => {
    setTimeout(() => {
      if (loginWindow && !loginWindow.isDestroyed()) loginWindow.close();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.loadURL(`http://localhost:${PORT}`);
      }
    }, 1500);
  };

  loginWindow.webContents.on('did-navigate', (event, url) => {
    if (url.includes('/api/auth/callback/google') || url.includes('/estimate-builder')) {
      closeAndReload();
    }
  });

  loginWindow.webContents.on('did-redirect-navigation', (event, url) => {
    if (url.includes('/api/auth/callback/google') || url.includes('/estimate-builder')) {
      closeAndReload();
    }
  });
}

// ── Main window ───────────────────────────────────────────────────────────────
async function createWindow() {
  // Intercept login click
  app.on('web-contents-created', (_, contents) => {
    contents.on('will-navigate', (event, url) => {
      try {
        const parsed = new URL(url);
        if (
          parsed.hostname === 'localhost' &&
          parsed.port === String(PORT) &&
          parsed.pathname === '/api/auth/signin/google'
        ) {
          event.preventDefault();
          openLoginWindow();
        }
      } catch (e) {}
    });

    contents.setWindowOpenHandler(({ url }) => {
      try {
        const parsed = new URL(url);
        if (parsed.hostname === 'accounts.google.com') {
          return { action: 'deny' };
        }
      } catch (e) {}
      return { action: 'allow' };
    });
  });

  // Clear cookies on signout
  session.defaultSession.webRequest.onCompleted(
    { urls: ['*://*/api/auth/signout*'] },
    async () => {
      try {
        await session.defaultSession.clearStorageData({ storages: ['cookies'] });
        console.log('Cleared session cookies after logout.');
      } catch (err) {
        console.error('Failed to clear session cookies', err);
      }
    }
  );

  showSplash();

  mainWindow = new BrowserWindow({
    width: 1280, height: 820,
    minWidth: 960, minHeight: 640,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
    autoHideMenuBar: true,
    show: false,
    backgroundColor: '#f9fafb',
  });

  // Uncomment temporarily to debug issues:
  // mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => { mainWindow = null; });

  try {
    if (!app.isPackaged) {
      console.log('Dev mode — connecting to existing Next.js on port', PORT);
    } else {
      await startNextServer();
    }
    await mainWindow.loadURL(`http://localhost:${PORT}`);
    closeSplash();
    mainWindow.show();
  } catch (err) {
    console.error('Startup error:', err);
    closeSplash();
    mainWindow.loadURL(
      `data:text/html,<body style="font-family:sans-serif;padding:2rem;background:#fee2e2">
       <h2 style="color:#dc2626">&#9888; Failed to start server</h2>
       <p style="margin-top:8px;color:#991b1b">${err.message}</p>
       <p style="margin-top:16px;font-size:12px;color:#6b7280">Try restarting the app. If this persists, reinstall it.</p>
       </body>`
    );
    mainWindow.show();
  }
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});

app.on('quit', killNextProcess);