import type { Migration } from '../types/index.js'
import type { DatabaseSync } from 'node:sqlite'
import { randomUUID } from 'node:crypto'

export const migration: Migration = {
  name: '003_uuid_user_ids',
  up: async (db: DatabaseSync) => {
    // Step 1: Add new uuid column to users table
    db.exec(`
      ALTER TABLE users ADD COLUMN id_uuid TEXT
    `)

    // Step 2: Generate UUIDs for all existing users
    const users = db.prepare('SELECT id FROM users').all() as { id: number }[]
    
    for (const user of users) {
      const uuid = randomUUID()
      db.prepare('UPDATE users SET id_uuid = ? WHERE id = ?').run(uuid, user.id)
    }

    // Step 3: Create new users table with UUID primary key
    db.exec(`
      CREATE TABLE users_new (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `)

    // Step 4: Copy data from old table to new table
    db.exec(`
      INSERT INTO users_new (id, email, password_hash, name, role, created_at, updated_at)
      SELECT id_uuid, email, password_hash, name, role, created_at, updated_at
      FROM users
    `)

    // Step 5: Update password_reset_tokens to use UUIDs
    db.exec(`
      CREATE TABLE password_reset_tokens_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at TEXT NOT NULL,
        used INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users_new(id) ON DELETE CASCADE
      )
    `)

    // Step 6: Migrate password_reset_tokens data
    const tokens = db.prepare(`
      SELECT prt.*, u.id_uuid
      FROM password_reset_tokens prt
      JOIN users u ON prt.user_id = u.id
    `).all() as Array<{
      id: number
      user_id: number
      token: string
      expires_at: string
      used: number
      created_at: string
      id_uuid: string
    }>

    for (const token of tokens) {
      db.prepare(`
        INSERT INTO password_reset_tokens_new (user_id, token, expires_at, used, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(token.id_uuid, token.token, token.expires_at, token.used, token.created_at)
    }

    // Step 7: Drop old tables
    db.exec('DROP TABLE password_reset_tokens')
    db.exec('DROP TABLE users')

    // Step 8: Rename new tables
    db.exec('ALTER TABLE users_new RENAME TO users')
    db.exec('ALTER TABLE password_reset_tokens_new RENAME TO password_reset_tokens')

    // Step 9: Recreate indexes
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token)
    `)
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id)
    `)
  },
}
