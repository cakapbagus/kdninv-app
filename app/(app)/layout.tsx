import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { sql } from '@/lib/db'
import Sidebar from '@/components/Sidebar'
import type { Profile } from '@/types'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')

  const rows = await sql`
    SELECT id, username, full_name, role, created_at, updated_at
    FROM users WHERE id = ${session.sub}
  `
  const profile = rows[0] as Profile | undefined
  if (!profile) redirect('/login')

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg-page)' }}>
      <Sidebar profile={profile} />
      <main className="flex-1 pt-16 lg:pt-0 min-h-screen overflow-x-hidden">
        <div className="p-5 md:p-7 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
