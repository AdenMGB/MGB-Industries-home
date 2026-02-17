import type { Migration } from '../types/index.js'
import type { DatabaseSync } from 'node:sqlite'

export const migration: Migration = {
  name: '010_conversion_trainer_streaks_conv',
  up: async (db: DatabaseSync) => {
    // Add conv column to scores for leaderboard filtering by conversion type
    try {
      db.exec(`ALTER TABLE conversion_trainer_scores ADD COLUMN conv TEXT`)
    } catch {
      // Column may already exist
    }

    // Add daily streak and classic streak to progress
    try {
      db.exec(`ALTER TABLE conversion_trainer_progress ADD COLUMN daily_streak INTEGER NOT NULL DEFAULT 0`)
    } catch {
      /* already exists */
    }
    try {
      db.exec(`ALTER TABLE conversion_trainer_progress ADD COLUMN last_played_date TEXT`)
    } catch {
      /* already exists */
    }
    try {
      db.exec(`ALTER TABLE conversion_trainer_progress ADD COLUMN best_classic_streak INTEGER NOT NULL DEFAULT 0`)
    } catch {
      /* already exists */
    }

    // Index for leaderboard by mode + conv
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_conversion_trainer_scores_mode_conv_score
      ON conversion_trainer_scores(mode, conv, score DESC)
    `)

    // Dedupe: keep best score per (user_id, mode, conv)
    db.exec(`
      DELETE FROM conversion_trainer_scores
      WHERE id NOT IN (
        SELECT id FROM (
          SELECT id,
            ROW_NUMBER() OVER (
              PARTITION BY user_id, mode, COALESCE(conv, 'binary-standalone')
              ORDER BY score DESC, created_at DESC
            ) as rn
          FROM conversion_trainer_scores
        ) WHERE rn = 1
      )
    `)
  },
}
