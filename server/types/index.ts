import type { DatabaseSync } from 'node:sqlite'

export interface User {
  id: number
  email: string
  name: string
  role: 'user' | 'admin'
  created_at: string
  updated_at: string
}

export interface UserWithoutPassword extends Omit<User, 'password_hash'> {}

export interface JWTPayload {
  userId: number
  email: string
  role: 'user' | 'admin'
}

export interface Migration {
  name: string
  up: (db: DatabaseSync) => Promise<void>
  down?: (db: DatabaseSync) => Promise<void>
}
