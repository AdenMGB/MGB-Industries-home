import type { Migration } from '../types/index.js'
import type { DatabaseSync } from 'node:sqlite'

export const migration: Migration = {
  name: '013_tournaments',
  up: async (db: DatabaseSync) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS tournaments (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        config TEXT NOT NULL,
        bracket_size INTEGER NOT NULL,
        max_players INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'lobby',
        created_by_admin_id TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        started_at TEXT,
        ended_at TEXT,
        FOREIGN KEY (created_by_admin_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `)
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status)
    `)
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_tournaments_created_at ON tournaments(created_at)
    `)

    db.exec(`
      CREATE TABLE IF NOT EXISTS tournament_brackets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tournament_id TEXT NOT NULL,
        bracket_index INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'lobby',
        started_at TEXT,
        ended_at TEXT,
        UNIQUE(tournament_id, bracket_index),
        FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
      )
    `)
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_tournament_brackets_tournament
      ON tournament_brackets(tournament_id)
    `)

    db.exec(`
      CREATE TABLE IF NOT EXISTS tournament_participants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tournament_id TEXT NOT NULL,
        bracket_id INTEGER NOT NULL,
        participant_uuid TEXT NOT NULL UNIQUE,
        user_id TEXT,
        guest_id TEXT,
        guest_display_name TEXT,
        display_name TEXT NOT NULL,
        score INTEGER NOT NULL DEFAULT 0,
        current_question_index INTEGER NOT NULL DEFAULT 0,
        lives INTEGER NOT NULL DEFAULT 3,
        streak INTEGER NOT NULL DEFAULT 0,
        joined_at TEXT NOT NULL DEFAULT (datetime('now')),
        left_at TEXT,
        FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
        FOREIGN KEY (bracket_id) REFERENCES tournament_brackets(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `)
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_tournament_participants_tournament
      ON tournament_participants(tournament_id)
    `)
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_tournament_participants_bracket
      ON tournament_participants(bracket_id)
    `)
  },
}
