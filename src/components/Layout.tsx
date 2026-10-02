import { Link, NavLink, Outlet } from 'react-router-dom'

export function Layout() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-bg/95 px-4 py-3 backdrop-blur">
        <Link to="/" className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
          <span aria-hidden>🦀</span> Crabby
        </Link>
        <NavLink
          to="/backup"
          className="rounded-lg px-3 py-2 text-sm font-semibold text-muted hover:bg-surface"
        >
          Backup
        </NavLink>
      </header>
      <main className="flex-1 px-4 pt-4 pb-28">
        <Outlet />
      </main>
    </div>
  )
}
