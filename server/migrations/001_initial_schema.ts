import type { Migration } from '../types/index.js'
import type { DatabaseSync } from 'node:sqlite'

export const migration: Migration = {
  name: '001_initial_schema',
  up: async (db: DatabaseSync) => {
    // Create migrations table to track executed migrations
    db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        executed_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `)

    // Create users table
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `)
  },
}
