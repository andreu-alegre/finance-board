import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import GoalsClient from '@/components/goals/GoalsClient'

export default async function GoalsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membershipRaw } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  const membership = membershipRaw as { household_id: string } | null
  if (!membership) return redirect('/signup')

  const householdId = membership.household_id

  const [{ data: goals }, { data: contributions }] = await Promise.all([
    supabase
      .from('goals')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: false }),
    supabase
      .from('goal_contributions')
      .select('*, profiles(full_name)')
      .in(
        'goal_id',
        (
          await supabase
            .from('goals')
            .select('id')
            .eq('household_id', householdId)
        ).data?.map((g) => (g as { id: string }).id) ?? []
      )
      .order('contributed_at', { ascending: false }),
  ])

  return (
    <GoalsClient
      goals={goals ?? []}
      contributions={contributions ?? []}
      householdId={householdId}
      userId={user.id}
    />
  )
}
