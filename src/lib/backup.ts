import { db, type Spot, type Visit } from '../db'

export interface Backup {
  app: 'crabby'
  version: 1
  exportedAt: string
  spots: Spot[]
  visits: Visit[]
}

export async function createBackup(): Promise<Backup> {
  const [spots, visits] = await Promise.all([db.spots.toArray(), db.visits.toArray()])
  return { app: 'crabby', version: 1, exportedAt: new Date().toISOString(), spots, visits }
}

export function parseBackup(text: string): Backup {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('That file is not valid JSON.')
  }
  const b = data as Partial<Backup>
  if (b?.app !== 'crabby' || b.version !== 1 || !Array.isArray(b.spots) || !Array.isArray(b.visits)) {
    throw new Error('That file is not a Crabby backup.')
  }
  const spotIds = new Set(b.spots.map((s) => s.id))
  const orphan = b.visits.find((v) => !spotIds.has(v.spotId))
  if (orphan) throw new Error(`Backup is damaged: visit ${orphan.id} has no matching spot.`)
  return b as Backup
}

/** Merges a backup into the local database. Records with the same id are overwritten. */
export async function restoreBackup(backup: Backup): Promise<{ spots: number; visits: number }> {
  await db.transaction('rw', db.spots, db.visits, async () => {
    await db.spots.bulkPut(backup.spots)
    await db.visits.bulkPut(backup.visits)
  })
  return { spots: backup.spots.length, visits: backup.visits.length }
}
