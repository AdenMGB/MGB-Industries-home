import type { Migration } from '../types/index.js'
import type { DatabaseSync } from 'node:sqlite'

export const migration: Migration = {
  name: '014_conversion_trainer_octet_sprint',
  up: async (db: DatabaseSync) => {
    try {
      db.exec(`ALTER TABLE conversion_trainer_progress ADD COLUMN best_octet_sprint INTEGER NOT NULL DEFAULT 0`)
    } catch {
      /* already exists */
    }
  },
}
