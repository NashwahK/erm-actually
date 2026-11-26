// Zips dist/ into release/erm-actually-<version>.zip for the Chrome Web Store.
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const out = path.join(root, 'release', `erm-actually-${version}.zip`);

await mkdir(path.dirname(out), { recursive: true });
await rm(out, { force: true });
execFileSync('zip', ['-r', '-q', out, '.'], { cwd: path.join(root, 'dist'), stdio: 'inherit' });
console.log(`Packaged → ${path.relative(root, out)}`);
