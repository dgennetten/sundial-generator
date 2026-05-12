/**
 * Migration: Supabase → MySQL
 * Fetches all sundial_prints rows from Supabase and writes MySQL INSERT statements to stdout.
 *
 * Usage:
 *   node scripts/migrate-supabase-to-mysql.js > migration.sql
 *   mysql -u dgennetten -p -h mysql.precisionsundial.com sundials < migration.sql
 */

const SUPABASE_URL = 'https://vuisznmoippkwkcxquzx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1aXN6bm1vaXBwa3drY3hxdXp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNjM2MDUsImV4cCI6MjA4MzczOTYwNX0.vNKa1TCgAh2Kop5xOSYAropkYTP4XUNanpn7Xykk5NQ';

function sqlStr(val) {
  if (val === null || val === undefined) return 'NULL';
  return "'" + String(val).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
}

async function fetchAll() {
  const records = [];
  const limit = 1000;
  let offset = 0;

  while (true) {
    const url = `${SUPABASE_URL}/rest/v1/sundial_prints?select=*&order=created_at.asc&limit=${limit}&offset=${offset}`;
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    });

    if (!res.ok) {
      process.stderr.write(`Supabase error ${res.status}: ${await res.text()}\n`);
      process.exit(1);
    }

    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    records.push(...batch);
    process.stderr.write(`  fetched ${records.length} rows...\n`);
    if (batch.length < limit) break;
    offset += limit;
  }

  return records;
}

process.stderr.write('Fetching from Supabase...\n');
const rows = await fetchAll();
process.stderr.write(`Done. ${rows.length} rows fetched.\n`);

if (rows.length === 0) {
  process.stderr.write('Nothing to migrate.\n');
  process.exit(0);
}

process.stdout.write('SET NAMES utf8mb4;\n\n');

for (const r of rows) {
  process.stdout.write(
    `INSERT INTO sundial_prints (location,latitude,longitude,inclination,declination,gnomon_type,notes_type,date_range,created_at) VALUES (` +
    `${sqlStr(r.location)},${r.latitude},${r.longitude},${r.inclination},${r.declination},` +
    `${sqlStr(r.gnomon_type)},${sqlStr(r.notes_type)},${sqlStr(r.date_range)},${sqlStr(r.created_at)});\n`
  );
}

process.stderr.write('SQL written to stdout. Pipe to MySQL to import.\n');
