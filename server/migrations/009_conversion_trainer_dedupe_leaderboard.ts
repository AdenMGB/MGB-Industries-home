import type { Migration } from '../types/index.js'
import type { DatabaseSync } from 'node:sqlite'

export const migration: Migration = {
  name: '009_conversion_trainer_dedupe_leaderboard',
  up: async (db: DatabaseSync) => {
    // Deduplicate conversion_trainer_scores: keep only the best score per (user_id, mode).
    // For ties, keep the most recent (created_at DESC).
    db.exec(`
      DELETE FROM conversion_trainer_scores
      WHERE id NOT IN (
        SELECT id FROM (
          SELECT id,
            ROW_NUMBER() OVER (PARTITION BY user_id, mode ORDER BY score DESC, created_at DESC) as rn
          FROM conversion_trainer_scores
        ) WHERE rn = 1
      )
    `)
  },
}
