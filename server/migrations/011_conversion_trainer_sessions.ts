import type { Migration } from '../types/index.js'
import type { DatabaseSync } from 'node:sqlite'

export const migration: Migration = {
  name: '011_conversion_trainer_sessions',
  up: async (db: DatabaseSync) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS conversion_trainer_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        mode TEXT NOT NULL,
        conv TEXT NOT NULL DEFAULT 'binary-standalone',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        expires_at TEXT NOT NULL,
        used_at TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `)
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_conversion_trainer_sessions_user_expires
      ON conversion_trainer_sessions(user_id, expires_at)
    `)
  },
}
