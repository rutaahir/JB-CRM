const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '..');
const backendDir = path.join(rootDir, 'backend');
const frontendDir = path.join(rootDir, 'frontend');

// Determine Python path
let pythonCmd = 'python';
const venvWin = path.join(backendDir, 'venv', 'Scripts', 'python.exe');
const venvUnix = path.join(backendDir, 'venv', 'bin', 'python');

if (fs.existsSync(venvWin)) {
  pythonCmd = venvWin;
} else if (fs.existsSync(venvUnix)) {
  pythonCmd = venvUnix;
}

const isBackendOnly = process.argv.includes('backend-only');

console.log('\x1b[32m%s\x1b[0m', '==================================================');
console.log('\x1b[32m%s\x1b[0m', `   Starting Jalaram Brokers CRM (${isBackendOnly ? 'Backend Only' : 'Backend + Frontend'})   `);
console.log('\x1b[32m%s\x1b[0m', '==================================================');
console.log(`Backend:  http://127.0.0.1:8000 (Python: ${pythonCmd})`);
if (!isBackendOnly) console.log(`Frontend: http://localhost:5173`);
console.log('\x1b[33m%s\x1b[0m', 'Press Ctrl+C to stop.\n');

const backend = spawn(pythonCmd, ['manage.py', 'runserver', '127.0.0.1:8000'], {
  cwd: backendDir,
  shell: false,
  stdio: 'inherit'
});

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const frontend = !isBackendOnly ? spawn(npmCmd, ['run', 'dev'], {
  cwd: frontendDir,
  shell: true,
  stdio: 'inherit'
}) : null;

let isCleaningUp = false;
function cleanup() {
  if (isCleaningUp) return;
  isCleaningUp = true;
  console.log('\n\x1b[31m%s\x1b[0m', '🛑 Shutting down servers...');

  if (process.platform === 'win32') {
    if (backend && backend.pid) spawn('taskkill', ['/pid', backend.pid, '/f', '/t']);
    if (frontend && frontend.pid) spawn('taskkill', ['/pid', frontend.pid, '/f', '/t']);
  } else {
    if (backend) backend.kill('SIGTERM');
    if (frontend) frontend.kill('SIGTERM');
  }
  setTimeout(() => process.exit(0), 500);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

backend.on('exit', (code) => {
  if (!isCleaningUp && code !== 0 && code !== null) {
    console.error(`[backend] exited with code ${code}`);
  }
});

if (frontend) {
  frontend.on('exit', (code) => {
    if (!isCleaningUp && code !== 0 && code !== null) {
      console.error(`[frontend] exited with code ${code}`);
    }
  });
}
