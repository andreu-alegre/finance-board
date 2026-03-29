import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentMonthRange, getLastMonthRange } from '@/lib/utils'
import DashboardClient from '@/components/dashboard/DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get household
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
  const { start, end } = getCurrentMonthRange()
  const { start: lastStart, end: lastEnd } = getLastMonthRange()

  // Parallel data fetching
  const [
    { data: profile },
    { data: members },
    { data: currentExpenses },
    { data: lastExpenses },
    { data: budgets },
    { data: goals },
    { data: categories },
    { data: topups },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('household_members')
      .select('user_id, role, profiles(id, full_name, avatar_url, net_salary)')
      .eq('household_id', householdId),
    supabase
      .from('expenses')
      .select('*, categories(name, icon, color), profiles(full_name)')
      .eq('household_id', householdId)
      .gte('expense_date', start)
      .lte('expense_date', end)
      .order('expense_date', { ascending: false }),
    supabase
      .from('expenses')
      .select('amount, is_shared')
      .eq('household_id', householdId)
      .gte('expense_date', lastStart)
      .lte('expense_date', lastEnd),
    supabase
      .from('budgets')
      .select('*, categories(name, icon, color)')
      .eq('household_id', householdId)
      .eq('is_shared', true),
    supabase
      .from('goals')
      .select('*')
      .eq('household_id', householdId)
      .eq('status', 'active')
      .order('created_at', { ascending: false }),
    supabase
      .from('categories')
      .select('*')
      .eq('household_id', householdId)
      .order('sort_order'),
    supabase
      .from('balance_topups')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: false }),
  ])

  return (
    <DashboardClient
      user={user}
      profile={profile}
      householdId={householdId}
      household={membership.households as { id: string; name: string; invite_code: string }}
      members={(members ?? []) as any}
      currentExpenses={currentExpenses ?? []}
      lastMonthExpenses={lastExpenses ?? []}
      budgets={budgets ?? []}
      goals={goals ?? []}
      categories={categories ?? []}
      topups={(topups ?? []) as { id: string; amount: number; note: string | null; created_at: string; user_id: string }[]}
      currentMonth={{ start, end }}
    />
  )
}
