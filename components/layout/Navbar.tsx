import { createClient } from '@/lib/supabase/server'
import { ThemeToggle } from './ThemeToggle'
import { LogoutButton } from './LogoutButton'
import { Breadcrumb } from './Breadcrumb'
import { HamburgerButton } from './HamburgerButton'

export async function Navbar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <header className="sticky top-0 z-30 flex h-[70px] items-center justify-between border-b border-border bg-card px-4 md:px-6">
      <div className="flex items-center gap-3">
        <HamburgerButton />
        <Breadcrumb />
      </div>
      <div className="flex items-center gap-1">
        <span className="hidden text-sm text-muted-foreground sm:block mr-2">
          {user?.email}
        </span>
        <ThemeToggle />
        <LogoutButton />
      </div>
    </header>
  )
}
