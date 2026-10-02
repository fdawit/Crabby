import { describe, expect, it } from 'vitest'
import { db } from '../db'
import { createBackup, parseBackup, restoreBackup } from './backup'
import { saveVisit } from './visits'

describe('backup', () => {
  it('round-trips through JSON', async () => {
    await saveVisit({
      spot: { name: 'Mud flats', lat: 38.9, lng: -76.4 },
      startedAt: '2026-07-04T12:00:00.000Z',
      keepers: 4,
      throwbacks: 2,
      pots: 6,
      rating: 2,
      notes: '',
    })
    const text = JSON.stringify(await createBackup())
    await db.visits.clear()
    await db.spots.clear()

    expect(await restoreBackup(parseBackup(text))).toEqual({ spots: 1, visits: 1 })
    expect((await db.visits.toArray())[0]).toMatchObject({ keepers: 4, pots: 6 })
  })

  it('rejects files that are not Crabby backups', () => {
    expect(() => parseBackup('nope')).toThrow(/not valid JSON/)
    expect(() => parseBackup('{"app":"other"}')).toThrow(/not a Crabby backup/)
    expect(() =>
      parseBackup(
        JSON.stringify({
          app: 'crabby',
          version: 1,
          spots: [],
          visits: [{ id: 'v', spotId: 'missing' }],
        }),
      ),
    ).toThrow(/no matching spot/)
  })
})
