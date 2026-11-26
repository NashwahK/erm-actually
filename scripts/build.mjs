// Builds the extension into dist/ (or dist-test/ with --test).
//   node scripts/build.mjs          production build
//   node scripts/build.mjs --test   build that talks to the local mock API used by the e2e tests
//   node scripts/build.mjs --watch  rebuild on change
import { build, context } from 'esbuild';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const isTest = args.has('--test');
const isWatch = args.has('--watch');
const outdir = path.join(root, isTest ? 'dist-test' : 'dist');

export const MOCK_API_ORIGIN = 'http://127.0.0.1:4599';
const endpoint = isTest
  ? `${MOCK_API_ORIGIN}/v1alpha1/claims:search`
  : 'https://factchecktools.googleapis.com/v1alpha1/claims:search';

const entryPoints = {
  background: 'src/background/index.js',
  content: 'src/content/index.js',
  'popup/popup': 'src/popup/popup.js',
  'dashboard/dashboard': 'src/dashboard/dashboard.js',
  'options/options': 'src/options/options.js',
};

const staticFiles = [
  'assets/icon-16.png',
  'assets/icon-48.png',
  'assets/icon-128.png',
  'content/content.css',
  'popup/popup.html',
  'popup/popup.css',
  'dashboard/dashboard.html',
  'dashboard/dashboard.css',
  'options/options.html',
  'options/options.css',
  'shared/theme.css',
];

const esbuildOptions = {
  absWorkingDir: root,
  entryPoints,
  outdir,
  bundle: true,
  format: 'iife',
  target: 'chrome120',
  minify: !isTest && !isWatch,
  sourcemap: isTest || isWatch ? 'inline' : false,
  define: { __FACTCHECK_ENDPOINT__: JSON.stringify(endpoint) },
  logLevel: 'info',
};

async function writeManifest() {
  const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  const manifest = JSON.parse(await readFile(path.join(root, 'src/manifest.json'), 'utf8'));
  manifest.version = pkg.version;
  if (isTest) {
    // The e2e tests cannot click the toolbar button, so activeTab is never granted.
    // The test build is allowed on the local fixture server instead.
    manifest.host_permissions = [...(manifest.host_permissions ?? []), `${MOCK_API_ORIGIN}/*`];
  }
  await writeFile(path.join(outdir, 'manifest.json'), JSON.stringify(manifest, null, 2));
}

async function copyStatic() {
  await Promise.all(
    staticFiles.map(async (file) => {
      const dest = path.join(outdir, file.replace(/^shared\//, ''));
      await mkdir(path.dirname(dest), { recursive: true });
      await cp(path.join(root, 'src', file), dest);
    }),
  );
}

await rm(outdir, { recursive: true, force: true });
await mkdir(outdir, { recursive: true });

if (isWatch) {
  const ctx = await context(esbuildOptions);
  await Promise.all([ctx.watch(), copyStatic(), writeManifest()]);
  console.log(`Watching… (static files are copied once; re-run for HTML/CSS changes)`);
} else {
  await build(esbuildOptions);
  await Promise.all([copyStatic(), writeManifest()]);
  console.log(`Built ${isTest ? 'test ' : ''}extension → ${path.relative(root, outdir)}/`);
}
