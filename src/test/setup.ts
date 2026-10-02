import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'
import { db } from '../db'

beforeEach(async () => {
  await db.spots.clear()
  await db.visits.clear()
})

afterEach(() => cleanup())
