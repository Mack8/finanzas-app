import { createClient } from '@/lib/supabase/server'
import { ThemeToggle } from './ThemeToggle'
import { LogoutButton } from './LogoutButton'
import { Breadcrumb } from './Breadcrumb'
import { HamburgerButton } from './HamburgerButton'

export async function Navbar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const email = user?.email ?? ''
  const initial = email ? email.charAt(0).toUpperCase() : '?'

  return (
    <header className="glass-header sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/80 px-4 md:px-6">
      <div className="flex min-w-0 items-center gap-2 md:gap-3">
        <HamburgerButton />
        <Breadcrumb />
      </div>
      <div className="flex items-center gap-1.5">
        {email ? (
          <div className="mr-1 hidden items-center gap-2 rounded-full border border-border bg-card px-2.5 py-1 sm:flex">
            <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {initial}
            </span>
            <span className="max-w-[160px] truncate text-sm text-muted-foreground">
              {email}
            </span>
          </div>
        ) : null}
        <ThemeToggle />
        <LogoutButton />
      </div>
    </header>
  )
}
