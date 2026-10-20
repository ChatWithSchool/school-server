import { connectDb, disconnectDb } from '../db/connect';
import { runModuleSeeds } from '../routes/loader';
import { DEMO_PASSWORD, seedCore } from './core';
import { stfMail } from './names';

async function main(): Promise<void> {
  await connectDb();
  const counts = await seedCore();
  const modules = await runModuleSeeds();
  console.log('core seed:', counts);
  console.log('module seeds:', modules.length ? modules.join(', ') : '(none)');
  console.log(`demo login: ${stfMail(0)} / ${DEMO_PASSWORD} (management)`);
  await disconnectDb();
}

main().catch(async (err) => {
  console.error(err);
  await disconnectDb();
  process.exit(1);
});
