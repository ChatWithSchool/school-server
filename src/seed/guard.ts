const LOCAL_DB = /^mongodb:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/;
const MIN_PASSWORD_LENGTH = 12;

/**
 * The demo users share one password. That is fine on a local database, but a remote database
 * (Atlas) sits behind a site that anyone can open, so seeding it needs its own strong password.
 */
export function assertSafeToSeed(uri: string, seedPassword: string | undefined): void {
  if (LOCAL_DB.test(uri)) return;
  if (!seedPassword || seedPassword.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `Refusing to seed a remote database with the public demo password. Set SEED_PASSWORD to at least ${MIN_PASSWORD_LENGTH} random characters first.`,
    );
  }
}
