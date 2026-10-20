// Usage: npm run new:module -- room --screen I08
// Creates src/modules/<plural>/ with a model, schema, routes, seed and tests. The router is mounted automatically.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const [name, ...rest] = process.argv.slice(2);
const si = rest.indexOf('--screen');
const screen = si >= 0 ? rest[si + 1] : null;

if (!name || !/^[a-z][a-z0-9]*$/.test(name) || !screen) {
  console.error(
    'Usage: npm run new:module -- <singular-name-in-lowercase> --screen <screen id, e.g. I08>',
  );
  process.exit(1);
}
const plural = name.endsWith('y')
  ? name.slice(0, -1) + 'ies'
  : name.endsWith('s')
    ? name + 'es'
    : name + 's';
const Pascal = name[0].toUpperCase() + name.slice(1);
const dir = path.join(root, 'src', 'modules', plural);
if (fs.existsSync(dir)) {
  console.error(`src/modules/${plural} already exists`);
  process.exit(1);
}
fs.mkdirSync(dir, { recursive: true });
const fill = (s) =>
  s
    .replaceAll('__NAME__', name)
    .replaceAll('__PLURAL__', plural)
    .replaceAll('__PASCAL__', Pascal)
    .replaceAll('__SCREEN__', screen);
const files = {
  'model.ts': `import { Schema, model } from 'mongoose';

// TODO: replace the fields with the ones your screen needs (see the screen's SPEC.md and the API contract)
const __NAME__Schema = new Schema(
  {
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    name: { type: String, required: true, trim: true },
  },
  { timestamps: true, collection: '__PLURAL__' },
);
__NAME__Schema.index({ institutionId: 1, name: 1 }, { unique: true });

export const __PASCAL__ = model('__PASCAL__', __NAME__Schema);
`,
  'schema.ts': `import { z } from 'zod';

export const create__PASCAL__Schema = z.object({
  name: z.string().trim().min(2, 'חובה שם (לפחות 2 תווים)').max(80),
});
export const update__PASCAL__Schema = create__PASCAL__Schema.partial();

export type Create__PASCAL__ = z.infer<typeof create__PASCAL__Schema>;
`,
  'routes.ts': `import { Router } from 'express';
import { Types } from 'mongoose';
import { authorize } from '../../middleware/authorize';
import { validateBody } from '../../middleware/validate';
import { AppError } from '../../utils/AppError';
import { asyncHandler } from '../../utils/asyncHandler';
import { parsePagination, toPage } from '../../utils/pagination';
import { __PASCAL__ } from './model';
import { create__PASCAL__Schema, update__PASCAL__Schema } from './schema';

const router = Router();

// GET /api/__PLURAL__?page=1&size=25
router.get(
  '/__PLURAL__',
  authorize('__SCREEN__', 'read'),
  asyncHandler(async (req, res) => {
    const { page, size, skip } = parsePagination(req.query);
    const filter = { institutionId: req.user!.institutionId };
    const [items, total] = await Promise.all([
      __PASCAL__.find(filter).sort({ name: 1 }).skip(skip).limit(size).lean(),
      __PASCAL__.countDocuments(filter),
    ]);
    res.json(toPage(items.map((i) => ({ id: String(i._id), name: i.name })), total, page, size));
  }),
);

// POST /api/__PLURAL__
router.post(
  '/__PLURAL__',
  authorize('__SCREEN__', 'write'),
  validateBody(create__PASCAL__Schema),
  asyncHandler(async (req, res) => {
    const created = await __PASCAL__.create({ ...req.body, institutionId: req.user!.institutionId });
    res.status(201).json({ id: String(created._id) });
  }),
);

// PUT /api/__PLURAL__/:id
router.put(
  '/__PLURAL__/:id',
  authorize('__SCREEN__', 'write'),
  validateBody(update__PASCAL__Schema),
  asyncHandler(async (req, res) => {
    if (!Types.ObjectId.isValid(req.params.id)) throw new AppError(400, 'BAD_ID', 'מזהה לא תקין');
    const updated = await __PASCAL__.findOneAndUpdate(
      { _id: req.params.id, institutionId: req.user!.institutionId },
      { $set: req.body },
      { new: true },
    );
    if (!updated) throw new AppError(404, 'NOT_FOUND', 'הרשומה לא נמצאה');
    res.status(204).end();
  }),
);

// DELETE /api/__PLURAL__/:id
router.delete(
  '/__PLURAL__/:id',
  authorize('__SCREEN__', 'write'),
  asyncHandler(async (req, res) => {
    if (!Types.ObjectId.isValid(req.params.id)) throw new AppError(400, 'BAD_ID', 'מזהה לא תקין');
    const removed = await __PASCAL__.findOneAndDelete({ _id: req.params.id, institutionId: req.user!.institutionId });
    if (!removed) throw new AppError(404, 'NOT_FOUND', 'הרשומה לא נמצאה');
    res.status(204).end();
  }),
);

export default router;
`,
  'seed.ts': `import { Institution } from '../../models';
import { __PASCAL__ } from './model';

/** Demo data for your screen. Must be idempotent: running it twice must not create duplicates. */
export async function seed(): Promise<void> {
  const inst = await Institution.findOne({ name: 'בית ספר לדוגמה' });
  if (!inst) return;
  // TODO: replace with realistic demo data that shows the screen with a few rows
  for (const name of ['דוגמה א', 'דוגמה ב']) {
    await __PASCAL__.updateOne({ institutionId: inst._id, name }, { $setOnInsert: { institutionId: inst._id, name } }, { upsert: true });
  }
}
`,
  'routes.test.ts': `import request from 'supertest';
import { createApp } from '../../app';
import { signToken } from '../../middleware/auth';
import { create__PASCAL__Schema } from './schema';

const app = createApp();
const token = (roles: Parameters<typeof signToken>[0]['roles']) =>
  signToken({ sub: '64b000000000000000000001', institutionId: '64b000000000000000000002', roles });

describe('__PLURAL__ (without a database)', () => {
  it('requires a token', async () => {
    const res = await request(app).get('/api/__PLURAL__');
    expect(res.status).toBe(401);
  });
  it('validates the body', () => {
    expect(create__PASCAL__Schema.safeParse({ name: '' }).success).toBe(false);
    expect(create__PASCAL__Schema.safeParse({ name: 'שם תקין' }).success).toBe(true);
  });
  it('rejects an invalid body with the uniform error format', async () => {
    const res = await request(app).post('/api/__PLURAL__').set('Authorization', \`Bearer \${token(['management'])}\`).send({ name: '' });
    // management must have write access to __SCREEN__ in src/permissions/matrix.json; otherwise this is 403
    expect([400, 403]).toContain(res.status);
  });
});
`,
};
for (const [file, content] of Object.entries(files))
  fs.writeFileSync(path.join(dir, file), fill(content));
console.log(
  `Created src/modules/${plural}: model, schema, routes, seed, test. The router is mounted automatically.`,
);
console.log('Next: edit the model and schema, then run: npm run verify');
