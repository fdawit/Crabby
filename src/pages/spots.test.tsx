import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { App } from '../App'
import { db } from '../db'
import { currentSeason } from '../lib/stats'
import { addSpot, makeVisit } from '../test/fixtures'

const Y = currentSeason()

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

async function seed() {
  await addSpot('jetty', 'Rock jetty')
  await addSpot('flats', 'Mud flats')
  await addSpot('old', 'Old pier')
  await db.visits.bulkAdd([
    makeVisit('jetty', new Date(Y, 6, 10), 20, 5),
    makeVisit('jetty', new Date(Y, 6, 17), 14, 4),
    makeVisit('flats', new Date(Y, 6, 11), 3, 2),
    makeVisit('old', new Date(Y - 1, 6, 11), 30, 5),
  ])
}

const rowNames = () =>
  within(screen.getByRole('list'))
    .getAllByRole('link')
    .map((a) => a.querySelector('.font-semibold')?.textContent)

describe('Spots list', () => {
  it('ranks by this season’s score, with unvisited spots last', async () => {
    await seed()
    renderAt('/spots')
    await screen.findByText('Rock jetty')
    expect(rowNames()).toEqual(['Rock jetty', 'Mud flats', 'Old pier'])
    expect(screen.getByLabelText('Score 4.5 of 5')).toBeInTheDocument()
    expect(screen.getByText('No visits this season')).toBeInTheDocument()
  })

  it('switches seasons and filters by name', async () => {
    await seed()
    const user = userEvent.setup()
    renderAt('/spots')
    await screen.findByText('Rock jetty')

    await user.selectOptions(screen.getByLabelText('Season'), String(Y - 1))
    expect(rowNames()[0]).toBe('Old pier')

    await user.type(screen.getByLabelText('Find a spot'), 'mud')
    expect(rowNames()).toEqual(['Mud flats'])
  })
})

describe('Spot detail', () => {
  it('shows season and all-time stats and the visit history', async () => {
    await seed()
    renderAt('/spots/jetty')
    expect(await screen.findByRole('heading', { name: 'Rock jetty' })).toBeInTheDocument()
    expect(screen.getByText(/Score 4.5 this season/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /log a visit here/i })).toHaveAttribute(
      'href',
      '/log?spot=jetty',
    )
    expect(screen.getAllByRole('link', { name: /\d+\s*\+0 back/ })).toHaveLength(2)
  })

  it('renames a spot and merges a duplicate into it', async () => {
    await seed()
    const user = userEvent.setup()
    renderAt('/spots/jetty')
    await user.click(await screen.findByRole('button', { name: 'Edit' }))

    const name = screen.getByLabelText('Name')
    await user.clear(name)
    await user.type(name, 'North jetty')

    await user.selectOptions(screen.getByLabelText('Spot to merge in'), 'old')
    await user.click(screen.getByRole('button', { name: /merge old pier into/i }))
    await user.click(screen.getByRole('button', { name: 'Merge' }))
    expect(await screen.findByText(/1 visit moved here/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Save spot' }))
    expect(await screen.findByRole('heading', { name: 'North jetty' })).toBeInTheDocument()
    expect(await db.spots.get('old')).toBeUndefined()
    expect(await db.visits.where('spotId').equals('jetty').count()).toBe(3)
  })
})

describe('Log from a spot', () => {
  it('preselects the spot', async () => {
    await seed()
    renderAt('/log?spot=flats')
    expect(await screen.findByLabelText('Spot')).toHaveValue('flats')
  })
})

describe('Map', () => {
  it('shows a pin per spot and a card for the tapped spot', async () => {
    await seed()
    const user = userEvent.setup()
    renderAt('/map')
    const pin = await screen.findByTitle('Rock jetty')
    expect(screen.getByTitle('Old pier')).toHaveTextContent('–')
    expect(pin).toHaveTextContent('4.5')

    await user.click(pin)
    const card = await screen.findByRole('region', { name: 'Rock jetty' })
    expect(within(card).getByText(/over 2 visits, this season/)).toBeInTheDocument()
    expect(within(card).getByRole('link', { name: 'Log here' })).toHaveAttribute(
      'href',
      '/log?spot=jetty',
    )
  })
})
