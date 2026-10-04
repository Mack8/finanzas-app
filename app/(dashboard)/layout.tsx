import { Sidebar } from '@/components/layout/Sidebar'
import { Navbar } from '@/components/layout/Navbar'
import { SidebarProvider } from '@/components/layout/sidebar-context'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background text-foreground">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Navbar />
          <main className="mx-auto w-full max-w-[1600px] flex-1 p-4 md:p-6 xl:p-8">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
