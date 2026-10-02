# Crabby

A crabbing log built to replace a spiral notebook. It records every visit to a spot: when it was, where it was, keepers and throwbacks, a 1–5 quality rating and notes. It's designed for a phone on a boat first and a desktop at home second.

The design and roadmap are in [DESIGN.md](./DESIGN.md).

## Status

Phase 1 (foundation) is done:
- Log a catch, with a GPS fix matched to the nearest saved spot (or a new spot created on the spot)
- Recent activity feed grouped by day, with season totals
- Edit or delete visits, with undo
- Data is stored on the device (IndexedDB) and works offline
- JSON backup download and restore

## Development

```sh
npm install
npm run dev      # http://localhost:5173
npm test         # unit + UI tests (Vitest, jsdom)
npm run lint
npm run build
```

Phone GPS only works over HTTPS or on `localhost`. To try the app on a phone during development, use `npm run dev -- --host` together with an HTTPS tunnel, or test on a deployed build.
