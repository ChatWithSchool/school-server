import { env } from '../config/env';
import { connectDb, disconnectDb } from '../db/connect';
import { runModuleSeeds } from '../routes/loader';
import { DEMO_PASSWORD, seedCore } from './core';
import { assertSafeToSeed } from './guard';
import { stfMail } from './names';
import { seedShared } from './shared';

async function main(): Promise<void> {
  assertSafeToSeed(env.MONGODB_URI, process.env.SEED_PASSWORD);
  await connectDb();
  const counts = await seedCore();
  // the shared collections before the modules: module seeds may read them
  const shared = await seedShared();
  const modules = await runModuleSeeds();
  console.log('core seed:', counts);
  console.log('shared seed:', shared);
  console.log('module seeds:', modules.length ? modules.join(', ') : '(none)');
  console.log(`demo login: ${stfMail(0)} / ${DEMO_PASSWORD} (management)`);
  await disconnectDb();
}

main().catch(async (err) => {
  console.error(err);
  await disconnectDb();
  process.exit(1);
});
