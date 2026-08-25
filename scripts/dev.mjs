import { spawn } from 'node:child_process';

const children = [
  spawn(process.execPath, ['build.mjs', '--watch'], { stdio: 'inherit' }),
  spawn(process.execPath, ['server.js'], { stdio: 'inherit' }),
];

let stopping = false;
function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (!child.killed) child.kill();
  }
  process.exitCode = exitCode;
}

for (const child of children) {
  child.on('error', () => stop(1));
  child.on('exit', code => {
    if (!stopping) stop(code || 0);
  });
}

process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
