import type { Migration } from '../types/index.js'
import type { DatabaseSync } from 'node:sqlite'

export const migration: Migration = {
  name: '012_multiplayer_sessions',
  up: async (db: DatabaseSync) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS multiplayer_rooms (
        id TEXT PRIMARY KEY,
        host_user_id TEXT,
        mode TEXT NOT NULL,
        conv TEXT NOT NULL DEFAULT 'binary-standalone',
        goal_type TEXT NOT NULL,
        goal_value TEXT NOT NULL,
        visibility TEXT NOT NULL DEFAULT 'private',
        password_hash TEXT,
        max_players INTEGER NOT NULL DEFAULT 32,
        show_leaderboard INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        started_at TEXT,
        ended_at TEXT,
        status TEXT NOT NULL DEFAULT 'lobby',
        last_activity_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (host_user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `)
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_multiplayer_rooms_status
      ON multiplayer_rooms(status)
    `)
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_multiplayer_rooms_created_at
      ON multiplayer_rooms(created_at)
    `)
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_multiplayer_rooms_visibility
      ON multiplayer_rooms(visibility)
    `)

    db.exec(`
      CREATE TABLE IF NOT EXISTS multiplayer_room_participants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id TEXT NOT NULL,
        user_id TEXT,
        guest_display_name TEXT,
        guest_id TEXT,
        role TEXT NOT NULL DEFAULT 'player',
        score INTEGER NOT NULL DEFAULT 0,
        current_question_index INTEGER NOT NULL DEFAULT 0,
        lives INTEGER NOT NULL DEFAULT 3,
        streak INTEGER NOT NULL DEFAULT 0,
        joined_at TEXT NOT NULL DEFAULT (datetime('now')),
        left_at TEXT,
        FOREIGN KEY (room_id) REFERENCES multiplayer_rooms(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `)
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_multiplayer_room_participants_room
      ON multiplayer_room_participants(room_id)
    `)

    db.exec(`
      CREATE TABLE IF NOT EXISTS multiplayer_room_questions (
        room_id TEXT NOT NULL,
        question_index INTEGER NOT NULL,
        value TEXT NOT NULL,
        answer TEXT NOT NULL,
        PRIMARY KEY (room_id, question_index),
        FOREIGN KEY (room_id) REFERENCES multiplayer_rooms(id) ON DELETE CASCADE
      )
    `)

    db.exec(`
      CREATE TABLE IF NOT EXISTS multiplayer_room_chat (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id TEXT NOT NULL,
        user_id TEXT,
        guest_display_name TEXT,
        message TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (room_id) REFERENCES multiplayer_rooms(id) ON DELETE CASCADE
      )
    `)
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_multiplayer_room_chat_room
      ON multiplayer_room_chat(room_id)
    `)
  },
}
