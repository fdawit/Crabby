import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { db } from './db'

function mockGps(lat: number, lng: number) {
  vi.stubGlobal('navigator', {
    ...navigator,
    geolocation: {
      getCurrentPosition: (ok: PositionCallback) =>
        ok({ coords: { latitude: lat, longitude: lng } } as GeolocationPosition),
    },
  })
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

afterEach(() => vi.unstubAllGlobals())

describe('logging a catch', () => {
  it('creates a new spot from GPS and shows the visit on Home', async () => {
    const user = userEvent.setup()
    mockGps(38.97843, -76.49212)
    renderAt('/log')

    await user.click(await screen.findByRole('button', { name: /use my location/i }))
    expect(screen.getByRole('status')).toHaveTextContent(/no saved spot/i)
    await user.type(screen.getByLabelText(/new spot name/i), 'Pier 4 ladder')
    for (let i = 0; i < 3; i++) await user.click(screen.getByLabelText('Increase Keepers'))
    await user.click(screen.getByLabelText('Increase Throwbacks'))
    await user.click(screen.getByRole('button', { name: /4\s*Good/ }))
    await user.click(screen.getByRole('button', { name: /save catch/i }))

    expect(await screen.findByText('Pier 4 ladder')).toBeInTheDocument()
    const [v] = await db.visits.toArray()
    expect(v).toMatchObject({ keepers: 3, throwbacks: 1, rating: 4, pots: null })
    const [s] = await db.spots.toArray()
    expect(s).toMatchObject({ lat: 38.97843, lng: -76.49212 })
  })

  it('matches a GPS fix to a nearby saved spot', async () => {
    await db.spots.add({
      id: 'jetty',
      name: 'Rock jetty',
      lat: 38.9,
      lng: -76.4,
      notes: '',
      createdAt: '',
      archived: false,
    })
    const user = userEvent.setup()
    mockGps(38.9002, -76.4) // ~22 m away
    renderAt('/log')

    await user.click(await screen.findByRole('button', { name: /use my location/i }))
    expect(screen.getByRole('status')).toHaveTextContent(/you’re at rock jetty/i)
    expect(screen.getByLabelText('Spot')).toHaveValue('jetty')
  })

  it('requires a rating before saving', async () => {
    const user = userEvent.setup()
    renderAt('/log')
    await user.type(await screen.findByLabelText(/new spot name/i), 'Somewhere')
    await user.type(screen.getByLabelText('Latitude'), '38.9')
    await user.type(screen.getByLabelText('Longitude'), '-76.4')
    await user.click(screen.getByRole('button', { name: /save catch/i }))
    expect(screen.getByRole('alert')).toHaveTextContent(/rate how good/i)
    expect(await db.visits.count()).toBe(0)
  })
})

describe('editing a visit', () => {
  it('can delete and undo', async () => {
    await db.spots.add({
      id: 's',
      name: 'Mud flats',
      lat: 1,
      lng: 1,
      notes: '',
      createdAt: '',
      archived: false,
    })
    await db.visits.add({
      id: 'v',
      spotId: 's',
      startedAt: new Date().toISOString(),
      keepers: 6,
      throwbacks: 0,
      pots: null,
      rating: 2,
      notes: '',
      createdAt: '',
      updatedAt: '',
    })
    const user = userEvent.setup()
    renderAt('/visits/v')

    expect(await screen.findByRole('heading', { name: 'Edit visit' })).toBeInTheDocument()
    expect(screen.getByLabelText('Keepers')).toHaveValue(6)
    await user.click(screen.getByRole('button', { name: /delete this visit/i }))
    expect(await screen.findByText('Visit deleted')).toBeInTheDocument()
    expect(await db.visits.count()).toBe(0)

    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(await screen.findByText('Mud flats')).toBeInTheDocument()
    expect(await db.visits.count()).toBe(1)
  })
})
