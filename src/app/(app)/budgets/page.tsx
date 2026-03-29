import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BudgetsClient from '@/components/budgets/BudgetsClient'
import { getCurrentMonthRange } from '@/lib/utils'

export default async function BudgetsPage() {
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
  const { start, end } = getCurrentMonthRange()

  const [{ data: budgets }, { data: expenses }, { data: categories }] = await Promise.all([
    supabase
      .from('budgets')
      .select('*, categories(name, icon, color)')
      .eq('household_id', householdId)
      .order('created_at'),
    supabase
      .from('expenses')
      .select('amount, category_id, is_shared, user_id')
      .eq('household_id', householdId)
      .gte('expense_date', start)
      .lte('expense_date', end),
    supabase
      .from('categories')
      .select('*')
      .eq('household_id', householdId)
      .order('sort_order'),
  ])

  return (
    <BudgetsClient
      budgets={budgets ?? []}
      expenses={expenses ?? []}
      categories={categories ?? []}
      householdId={householdId}
      userId={user.id}
    />
  )
}
