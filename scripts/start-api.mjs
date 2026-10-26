import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const localAppData = process.env.LOCALAPPDATA ?? '';
const candidates = [];

if (process.env.CSILAB_PYTHON) {
  candidates.push({ command: process.env.CSILAB_PYTHON, args: [] });
}

if (process.platform === 'win32' && localAppData) {
  candidates.push({
    command: path.join(localAppData, 'Programs', 'Python', 'Python312', 'python.exe'),
    args: [],
  });
}

if (process.platform === 'win32') {
  candidates.push({ command: 'py', args: ['-3.12'] });
}
candidates.push({ command: 'python3.12', args: [] }, { command: 'python', args: [] });

let selected;
for (const candidate of candidates) {
  if (candidate.command.includes(path.sep) && !existsSync(candidate.command)) continue;
  const probe = spawnSync(candidate.command, [...candidate.args, '--version'], {
    cwd: root,
    encoding: 'utf8',
    windowsHide: true,
  });
  if (probe.status === 0) {
    selected = candidate;
    break;
  }
}

if (!selected) {
  console.error('No encontré Python. Instala Python 3.12 para los modelos de perros y gatos.');
  process.exit(1);
}

const api = spawn(selected.command, [...selected.args, 'backend.py'], {
  cwd: root,
  stdio: 'inherit',
  windowsHide: true,
});
api.on('error', (error) => {
  console.error(`No se pudo iniciar la API con Python: ${error.message}`);
  process.exit(1);
});
api.on('exit', (code) => process.exit(code ?? 1));
