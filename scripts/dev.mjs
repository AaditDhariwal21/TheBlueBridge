/**
 * `npm run dev`: runs the client (Vite) and server (Node) dev processes
 * together with prefixed output. If either exits, both stop. Ctrl+C stops both.
 * No dependency needed: a few lines of node:child_process.
 */
import { spawn, spawnSync } from 'node:child_process';

const TASKS = [
  { name: 'server', color: 35 }, // magenta
  { name: 'client', color: 36 }, // cyan
];

const children = TASKS.map(({ name, color }) => {
  const child = spawn('npm', ['run', 'dev', '-w', name], {
    shell: process.platform === 'win32', // npm is npm.cmd on Windows
    env: { ...process.env, FORCE_COLOR: '1' },
  });
  const prefix = `\x1b[${color}m[${name}]\x1b[0m `;
  const pipe = (stream, out) => {
    let buffer = '';
    stream.on('data', (chunk) => {
      buffer += chunk;
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? '';
      for (const line of lines) out.write(prefix + line + '\n');
    });
  };
  pipe(child.stdout, process.stdout);
  pipe(child.stderr, process.stderr);
  child.on('exit', (code) => {
    console.log(`${prefix}exited with code ${code ?? 'null'}`);
    stopAll(code ?? 0);
  });
  return child;
});

let stopping = false;
function stopAll(code) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.exitCode !== null || child.pid === undefined) continue;
    if (process.platform === 'win32') {
      // Kill the whole tree (npm → node) on Windows.
      spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      child.kill('SIGTERM');
    }
  }
  process.exitCode = code;
}

process.on('SIGINT', () => {
  stopAll(0);
});
process.on('SIGTERM', () => {
  stopAll(0);
});
