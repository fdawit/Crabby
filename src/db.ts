import Dexie, { type EntityTable } from 'dexie'

export type Rating = 1 | 2 | 3 | 4 | 5

export interface Spot {
  id: string
  name: string
  lat: number
  lng: number
  /** Standing notes about the place itself, not any one visit. */
  notes: string
  createdAt: string
  archived: boolean
}

export interface Visit {
  id: string
  spotId: string
  /** ISO 8601 timestamp (UTC). Displayed and grouped in local time. */
  startedAt: string
  keepers: number
  throwbacks: number
  /** Pots or traps fished; null when not recorded. */
  pots: number | null
  rating: Rating
  notes: string
  createdAt: string
  updatedAt: string
}

class CrabbyDB extends Dexie {
  spots!: EntityTable<Spot, 'id'>
  visits!: EntityTable<Visit, 'id'>

  constructor() {
    super('crabby')
    this.version(1).stores({
      spots: 'id, name, createdAt',
      visits: 'id, spotId, startedAt, [spotId+startedAt]',
    })
  }
}

export const db = new CrabbyDB()
