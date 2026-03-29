import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'
import BottomNav from '@/components/layout/BottomNav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get profile and household
  const { data: profileRaw } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const profile = profileRaw as { full_name: string } | null

  const { data: membershipRaw } = await supabase
    .from('household_members')
    .select('household_id, households(name)')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  const membership = membershipRaw as { household_id: string; households: { name: string } | null } | null
  const householdName = membership?.households?.name ?? 'Mi Hogar'
  const userName = profile?.full_name ?? user.email ?? 'Usuario'

  return (
    <div className="flex min-h-screen">
      <Sidebar userName={userName} householdName={householdName} />
      <main className="flex-1 flex flex-col min-h-screen lg:ml-0 pb-20 lg:pb-0">
        <div className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  )
}
