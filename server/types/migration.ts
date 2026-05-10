import type { DatabaseSync } from 'node:sqlite'

export interface Migration {
  name: string
  up: (db: DatabaseSync) => Promise<void>
  down?: (db: DatabaseSync) => Promise<void>
}
