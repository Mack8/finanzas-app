import { createClient } from '@/lib/supabase/server'
import { ThemeToggle } from './ThemeToggle'
import { LogoutButton } from './LogoutButton'

export async function Navbar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <header className="h-14 border-b bg-card flex items-center justify-between px-4">
      <div />
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground hidden sm:block">
          {user?.email}
        </span>
        <ThemeToggle />
        <LogoutButton />
      </div>
    </header>
  )
}
