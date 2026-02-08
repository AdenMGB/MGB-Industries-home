import type { Migration } from '../types/index.js'
import type { DatabaseSync } from 'node:sqlite'

export const migration: Migration = {
  name: '004_game_saves',
  up: async (db: DatabaseSync) => {
    // Create game_saves table
    db.exec(`
      CREATE TABLE IF NOT EXISTS game_saves (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        game_id TEXT NOT NULL,
        save_data TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, game_id)
      )
    `)

    // Create index for faster lookups
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_game_saves_user_game ON game_saves(user_id, game_id)
    `)
  },
}
