import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AnalyticsClient from '@/components/analytics/AnalyticsClient'

export default async function AnalyticsPage() {
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

  // Get last 12 months of expenses
  const twelveMonthsAgo = new Date()
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11)
  const startDate = new Date(twelveMonthsAgo.getFullYear(), twelveMonthsAgo.getMonth(), 1)
    .toISOString()
    .split('T')[0]

  const [{ data: expenses }, { data: categories }, { data: budgets }] = await Promise.all([
    supabase
      .from('expenses')
      .select('*, categories(name, icon, color), profiles(full_name)')
      .eq('household_id', householdId)
      .gte('expense_date', startDate)
      .order('expense_date', { ascending: true }),
    supabase
      .from('categories')
      .select('*')
      .eq('household_id', householdId)
      .order('sort_order'),
    supabase
      .from('budgets')
      .select('*, categories(name, icon, color)')
      .eq('household_id', householdId)
      .eq('is_shared', true),
  ])

  return (
    <AnalyticsClient
      expenses={expenses ?? []}
      categories={categories ?? []}
      budgets={budgets ?? []}
      userId={user.id}
    />
  )
}
