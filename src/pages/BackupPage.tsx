import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type ChangeEvent } from 'react'
import { db } from '../db'
import { createBackup, parseBackup, restoreBackup } from '../lib/backup'
import { localDayKey } from '../lib/dates'

export function BackupPage() {
  const counts = useLiveQuery(async () => ({
    spots: await db.spots.count(),
    visits: await db.visits.count(),
  }))
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  async function download() {
    const backup = await createBackup()
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `crabby-backup-${localDayKey(backup.exportedAt)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function restore(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const result = await restoreBackup(parseBackup(await file.text()))
      setMessage({
        kind: 'ok',
        text: `Restored ${result.visits} visits at ${result.spots} spots.`,
      })
    } catch (err) {
      setMessage({ kind: 'error', text: err instanceof Error ? err.message : String(err) })
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">Backup</h1>
      <p className="text-muted">
        Your log is saved on this device. Until syncing is added, download a backup now and then
        so nothing is lost if the phone is.
      </p>
      {counts && (
        <p className="font-semibold">
          {counts.visits} visits at {counts.spots} spots on this device.
        </p>
      )}
      <button
        type="button"
        onClick={download}
        className="w-full rounded-2xl bg-accent py-4 text-lg font-bold text-accent-ink"
      >
        Download backup
      </button>
      <div>
        <label
          htmlFor="restore"
          className="block w-full cursor-pointer rounded-2xl border-2 border-line py-4 text-center text-lg font-bold"
        >
          Restore from backup…
        </label>
        <input
          id="restore"
          type="file"
          accept="application/json,.json"
          onChange={restore}
          className="sr-only"
        />
        <p className="mt-2 text-sm text-muted">
          Restoring adds the backup’s entries to this device. Entries already here are kept.
        </p>
      </div>
      {message && (
        <p role="status" className={message.kind === 'error' ? 'text-danger' : 'font-semibold'}>
          {message.text}
        </p>
      )}
    </div>
  )
}
