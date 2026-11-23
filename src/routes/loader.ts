import fs from 'node:fs';
import path from 'node:path';
import type { Express, Router } from 'express';

const modulesDir = path.join(__dirname, '..', 'modules');

function findFile(dir: string, base: string): string | null {
  for (const ext of ['.ts', '.js']) {
    const f = path.join(dir, base + ext);
    if (fs.existsSync(f)) return f;
  }
  return null;
}

/**
 * Every folder in src/modules that has a routes file is mounted automatically under /api.
 * Nobody edits a shared registry file: this removes merge conflicts between developers.
 */
export function mountModules(app: Express, middleware: Router[] = []): string[] {
  const mounted: string[] = [];
  if (!fs.existsSync(modulesDir)) return mounted;
  for (const name of fs.readdirSync(modulesDir).sort()) {
    const dir = path.join(modulesDir, name);
    if (!fs.statSync(dir).isDirectory()) continue;
    const file = findFile(dir, 'routes');
    if (!file) continue;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require(file) as { default?: Router };
    if (mod.default) {
      app.use('/api', ...middleware, mod.default);
      mounted.push(name);
    }
  }
  return mounted;
}

/** Seed files of the modules (src/modules/<name>/seed.ts exporting seed()). */
export async function runModuleSeeds(): Promise<string[]> {
  const ran: string[] = [];
  if (!fs.existsSync(modulesDir)) return ran;
  for (const name of fs.readdirSync(modulesDir).sort()) {
    const dir = path.join(modulesDir, name);
    if (!fs.statSync(dir).isDirectory()) continue;
    const file = findFile(dir, 'seed');
    if (!file) continue;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require(file) as { seed?: () => Promise<void> };
    if (mod.seed) {
      await mod.seed();
      ran.push(name);
    }
  }
  return ran;
}
