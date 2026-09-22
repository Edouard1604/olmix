/** Compile puis execute le test de bout en bout dans Electron (affichage virtuel). */
import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const dossier = mkdtempSync(path.join(tmpdir(), 'olmix-e2e-build-'));
const sortie = path.join(dossier, 'main.cjs');

await build({
  entryPoints: ['scripts/e2e/main.ts'],
  outfile: sortie,
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  external: ['electron'],
  logLevel: 'warning',
});

const electron = process.platform === 'win32'
  ? 'node_modules/electron/dist/electron.exe'
  : 'node_modules/electron/dist/electron';

const lanceur = process.platform === 'linux' ? 'xvfb-run' : electron;
const args = process.platform === 'linux'
  ? ['-a', electron, '--no-sandbox', sortie]
  : ['--no-sandbox', sortie];

const res = spawnSync(lanceur, args, {
  stdio: 'inherit',
  env: { ...process.env, OLMIX_RACINE: process.cwd(), ELECTRON_DISABLE_SECURITY_WARNINGS: '1' },
});
rmSync(dossier, { recursive: true, force: true });
process.exit(res.status ?? 1);
