import { build, context } from 'esbuild';
import { rmSync } from 'node:fs';

const watch = process.argv.includes('--watch');

/** @type {import('esbuild').BuildOptions} */
const common = {
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  sourcemap: watch,
  minify: !watch,
  // `electron` is provided by the runtime; exceljs is bundled so no runtime install is needed.
  external: ['electron'],
  logLevel: 'info',
};

rmSync('dist/electron', { recursive: true, force: true });

const targets = [
  { ...common, entryPoints: ['electron/main.ts'], outfile: 'dist/electron/main.js' },
  { ...common, entryPoints: ['electron/preload.ts'], outfile: 'dist/electron/preload.js' },
];

if (watch) {
  for (const t of targets) {
    const ctx = await context(t);
    await ctx.watch();
  }
  console.log('[electron] watch mode');
} else {
  await Promise.all(targets.map((t) => build(t)));
}
