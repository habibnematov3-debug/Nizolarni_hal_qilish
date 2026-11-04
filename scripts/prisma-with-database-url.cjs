const { spawnSync } = require('node:child_process');
const path = require('node:path');

// Use Supabase first, including the common Vercel integration prefixes.
// Migrations should use the direct/non-pooler URL when available.
const databaseUrl =
  process.env.DATABASE_POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_SUPABASE_POSTGRES_URL_NON_POOLING ||
  process.env.SUPABASE_POSTGRES_URL_NON_POOLING ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_POSTGRES_URL ||
  process.env.DATABASE_SUPABASE_POSTGRES_URL ||
  process.env.SUPABASE_POSTGRES_URL ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_POSTGRES_PRISMA_URL ||
  process.env.DATABASE_SUPABASE_POSTGRES_PRISMA_URL ||
  process.env.SUPABASE_POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error(
    'PostgreSQL ulanishi topilmadi. Supabase/Vercel env o‘zgaruvchilari nomlarini tekshiring.',
  );
  process.exit(1);
}

process.env.DATABASE_URL = databaseUrl;

const prismaCli = path.resolve(__dirname, '../node_modules/prisma/build/index.js');
const result = spawnSync(process.execPath, [prismaCli, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: process.env,
});

process.exit(result.status ?? 1);
