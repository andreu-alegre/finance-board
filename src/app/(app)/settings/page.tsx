import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SettingsClient from '@/components/settings/SettingsClient'

export default async function SettingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membershipRaw } = await supabase
    .from('household_members')
    .select('household_id, role, households(id, name, invite_code)')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  const membership = membershipRaw as {
    household_id: string
    role: string
    households: { id: string; name: string; invite_code: string } | null
  } | null

  if (!membership) return redirect('/signup')

  const householdId = membership.household_id

  const [{ data: profile }, { data: members }, { data: categories }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('household_members')
      .select('user_id, role, profiles(id, full_name, avatar_url, net_salary)')
      .eq('household_id', householdId),
    supabase
      .from('categories')
      .select('*')
      .eq('household_id', householdId)
      .order('sort_order'),
  ])

  return (
    <SettingsClient
      user={user}
      profile={profile}
      household={membership.households as { id: string; name: string; invite_code: string }}
      householdId={householdId}
      isAdmin={membership.role === 'admin'}
      members={(members ?? []) as any}
      categories={categories ?? []}
    />
  )
}
