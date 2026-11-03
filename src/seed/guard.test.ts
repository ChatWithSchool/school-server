import { assertSafeToSeed } from './guard';

describe('assertSafeToSeed', () => {
  it('allows a local database with the default demo password', () => {
    expect(() => assertSafeToSeed('mongodb://localhost:27017/school', undefined)).not.toThrow();
    expect(() => assertSafeToSeed('mongodb://127.0.0.1/school', undefined)).not.toThrow();
  });

  it('refuses a remote database without a seed password', () => {
    expect(() =>
      assertSafeToSeed('mongodb+srv://u:p@cluster.mongodb.net/cws_dev', undefined),
    ).toThrow(/SEED_PASSWORD/);
  });

  it('refuses a remote database with a short seed password', () => {
    expect(() =>
      assertSafeToSeed('mongodb+srv://u:p@cluster.mongodb.net/cws_dev', 'short'),
    ).toThrow();
  });

  it('allows a remote database with a long seed password', () => {
    expect(() =>
      assertSafeToSeed('mongodb+srv://u:p@cluster.mongodb.net/cws_dev', 'a-long-random-password-1'),
    ).not.toThrow();
  });

  it('does not treat a host that only starts with localhost as local', () => {
    expect(() => assertSafeToSeed('mongodb://localhost.evil.example/school', undefined)).toThrow();
  });
});
