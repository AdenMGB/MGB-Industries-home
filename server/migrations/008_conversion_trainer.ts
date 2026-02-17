import type { Migration } from '../types/index.js'
import type { DatabaseSync } from 'node:sqlite'

export const migration: Migration = {
  name: '008_conversion_trainer',
  up: async (db: DatabaseSync) => {
    // Scores table (leaderboard)
    db.exec(`
      CREATE TABLE IF NOT EXISTS conversion_trainer_scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        mode TEXT NOT NULL,
        score INTEGER NOT NULL,
        metadata TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `)
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_conversion_trainer_scores_mode_score
      ON conversion_trainer_scores(mode, score DESC)
    `)

    // Progress table (XP, level, best streaks)
    db.exec(`
      CREATE TABLE IF NOT EXISTS conversion_trainer_progress (
        user_id TEXT PRIMARY KEY,
        total_xp INTEGER NOT NULL DEFAULT 0,
        level INTEGER NOT NULL DEFAULT 1,
        best_streak INTEGER NOT NULL DEFAULT 0,
        best_speed_round INTEGER NOT NULL DEFAULT 0,
        best_survival INTEGER NOT NULL DEFAULT 0,
        best_nibble_sprint INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `)

    // Achievements table (unlocked badges)
    db.exec(`
      CREATE TABLE IF NOT EXISTS conversion_trainer_achievements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        achievement_id TEXT NOT NULL,
        unlocked_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(user_id, achievement_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `)
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_conversion_trainer_achievements_user
      ON conversion_trainer_achievements(user_id)
    `)
  },
}
