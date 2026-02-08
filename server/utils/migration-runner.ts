import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { DatabaseSync } from 'node:sqlite'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export async function runMigrations(db: DatabaseSync): Promise<void> {
  // Ensure migrations table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      executed_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  // Get list of executed migrations
  const executedMigrations = db.prepare('SELECT name FROM migrations ORDER BY name').all() as { name: string }[]
  const executedNames = executedMigrations.map((r) => r.name)

  // Read migration files
  const migrationsDir = join(__dirname, '../migrations')
  const files = await readdir(migrationsDir)
  const migrationFiles = files.filter((f) => f.endsWith('.ts')).sort()

  // Run all migrations in order
  for (const file of migrationFiles) {
    const migrationName = file.replace('.ts', '')
    if (executedNames.includes(migrationName)) {
      continue
    }

    console.log(`Running migration: ${migrationName}`)
    const migrationPath = join(migrationsDir, file)
    // Convert to file:// URL for Windows compatibility
    const migrationUrl = pathToFileURL(migrationPath).href + '?t=' + Date.now()
    const migration = await import(migrationUrl)

    await migration.migration.up(db)
    db.prepare('INSERT INTO migrations (name) VALUES (?)').run(migrationName)
  }
}
