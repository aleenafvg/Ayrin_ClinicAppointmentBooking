import path from 'path';
import fs from 'fs';
import { pool } from './index';

// Dynamically resolve migrations directory to support both development (ts-node-dev / src)
// and production (compiled node / dist), as well as standalone invocations.
function getMigrationsDir(): string {
  const candidates = [
    path.resolve(__dirname, 'migrations'),
    path.resolve(__dirname, '../../src/db/migrations'),
    path.resolve(process.cwd(), 'src/db/migrations'),
    path.resolve(process.cwd(), 'dist/db/migrations'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `Migrations directory not found. Checked candidate paths:\n${candidates.map((c) => `  - ${c}`).join('\n')}`
  );
}

const MIGRATIONS_DIR = getMigrationsDir();

async function ensureMigrationsTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id              SERIAL          PRIMARY KEY,
      filename        VARCHAR(255)    NOT NULL UNIQUE,
      applied_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
    );
  `);
}

async function getAppliedMigrations(): Promise<Set<string>> {
  const result = await pool.query<{ filename: string }>(
    'SELECT filename FROM schema_migrations ORDER BY id'
  );
  return new Set(result.rows.map((row) => row.filename));
}

async function getMigrationFiles(): Promise<string[]> {
  const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql'));
  files.sort();
  return files;
}

async function runMigrations(): Promise<void> {
  console.log('Starting database migrations...');

  await ensureMigrationsTable();
  const applied = await getAppliedMigrations();
  const files = await getMigrationFiles();

  const pending = files.filter((f) => !applied.has(f));

  if (pending.length === 0) {
    console.log('All migrations are already applied. Nothing to do.');
    return;
  }

  console.log(`Found ${pending.length} pending migration(s).`);

  for (const filename of pending) {
    const filePath = path.join(MIGRATIONS_DIR, filename);
    const sql = fs.readFileSync(filePath, 'utf-8');

    console.log(`Applying migration: ${filename}...`);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(
        'INSERT INTO schema_migrations (filename) VALUES ($1)',
        [filename]
      );
      await client.query('COMMIT');
      console.log(`  ✓ ${filename} applied successfully.`);
    } catch (err) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackErr) {
        console.error(
          'Error during ROLLBACK:',
          rollbackErr instanceof Error ? rollbackErr.message : rollbackErr
        );
      }
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ ${filename} failed: ${message}`);
      throw new Error(`Migration ${filename} failed. All changes rolled back.`);
    } finally {
      client.release();
    }
  }

  console.log('All migrations applied successfully.');
}

runMigrations()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error(
      'Migration runner failed:',
      err instanceof Error ? err.message : err
    );
    await pool.end().catch(() => {});
    process.exit(1);
  });
