/**
 * Execute un point d'entree TypeScript hors Electron (scripts et tests).
 * Le fichier est empaquete a la volee par esbuild puis lance dans Node.
 */
import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const entree = process.argv[2];
if (!entree) {
  console.error('Usage: node scripts/run-ts.mjs <fichier.ts> [args...]');
  process.exit(1);
}

const dossier = mkdtempSync(path.join(tmpdir(), 'olmix-'));
const sortie = path.join(dossier, 'script.cjs');

await build({
  entryPoints: [entree],
  outfile: sortie,
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  external: ['electron'],
  logLevel: 'warning',
});

const res = spawnSync(process.execPath, [sortie, ...process.argv.slice(3)], { stdio: 'inherit' });
rmSync(dossier, { recursive: true, force: true });
process.exit(res.status ?? 1);
