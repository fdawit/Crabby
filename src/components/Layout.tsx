import { Suspense, type ReactNode } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'

const TABS = [
  { to: '/', label: 'Home', icon: '⌂', end: true },
  { to: '/map', label: 'Map', icon: '◎', end: false },
  { to: '/spots', label: 'Spots', icon: '☰', end: false },
]

/**
 * Phones: header on top, tab bar at the bottom within thumb reach.
 * Desktop: a sidebar. Only <main> scrolls, so the map page can fill the space exactly.
 */
export function Layout() {
  return (
    <div className="flex h-dvh flex-col md:flex-row">
      <header className="flex items-center justify-between border-b border-line px-4 py-3 md:hidden">
        <Logo />
        <NavLink to="/backup" className="rounded-lg px-3 py-2 text-sm font-semibold text-muted">
          Backup
        </NavLink>
      </header>

      <aside className="hidden w-60 shrink-0 flex-col gap-1 border-r border-line p-4 md:flex">
        <div className="mb-4 px-2">
          <Logo />
        </div>
        <Link
          to="/log"
          className="mb-4 rounded-xl bg-accent py-3 text-center font-bold text-accent-ink active:bg-accent-strong"
        >
          + Log catch
        </Link>
        {TABS.map((t) => (
          <SideLink key={t.to} to={t.to} end={t.end}>
            <span aria-hidden className="w-5 text-center">
              {t.icon}
            </span>
            {t.label}
          </SideLink>
        ))}
        <div className="mt-auto">
          <SideLink to="/backup">Backup</SideLink>
        </div>
      </aside>

      <main className="relative min-h-0 flex-1 overflow-y-auto">
        <Suspense fallback={<p className="p-4 text-muted">Loading…</p>}>
          <Outlet />
        </Suspense>
      </main>

      <nav
        aria-label="Main"
        className="grid grid-cols-4 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {TABS.slice(0, 2).map((t) => (
          <Tab key={t.to} {...t} />
        ))}
        <div className="flex items-center justify-center p-1.5">
          <Link
            to="/log"
            aria-label="Log catch"
            className="flex h-full w-full flex-col items-center justify-center rounded-xl bg-accent font-bold text-accent-ink active:bg-accent-strong"
          >
            <span aria-hidden className="text-2xl leading-none">
              +
            </span>
            <span className="text-xs">Log</span>
          </Link>
        </div>
        {TABS.slice(2).map((t) => (
          <Tab key={t.to} {...t} />
        ))}
      </nav>
    </div>
  )
}

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
      <span aria-hidden>🦀</span> Crabby
    </Link>
  )
}

function Tab({ to, label, icon, end }: (typeof TABS)[number]) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex min-h-16 flex-col items-center justify-center gap-0.5 text-xs font-semibold ${
          isActive ? 'text-accent' : 'text-muted'
        }`
      }
    >
      <span aria-hidden className="text-xl leading-none">
        {icon}
      </span>
      {label}
    </NavLink>
  )
}

function SideLink({ to, end, children }: { to: string; end?: boolean; children: ReactNode }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2 font-semibold ${
          isActive ? 'bg-surface text-ink' : 'text-muted hover:bg-surface'
        }`
      }
    >
      {children}
    </NavLink>
  )
}

/** Standard padded, centered column for content pages. */
export function Page({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-2xl px-4 pt-4 pb-10">{children}</div>
}
