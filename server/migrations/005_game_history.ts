import type { Migration } from '../types/index.js'
import type { DatabaseSync } from 'node:sqlite'

export const migration: Migration = {
  name: '005_game_history',
  up: async (db: DatabaseSync) => {
    // Create game_history table
    db.exec(`
      CREATE TABLE IF NOT EXISTS game_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        game_id TEXT NOT NULL,
        game_name TEXT NOT NULL,
        game_href TEXT NOT NULL,
        visited_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `)

    // Create index for faster lookups
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_game_history_user_visited ON game_history(user_id, visited_at DESC)
    `)
  },
}
