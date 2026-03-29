import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ExpensesClient from '@/components/expenses/ExpensesClient'

export default async function ExpensesPage() {
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

  const [{ data: expenses }, { data: categories }] = await Promise.all([
    supabase
      .from('expenses')
      .select('*, categories(name, icon, color), profiles(full_name)')
      .eq('household_id', householdId)
      .order('expense_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(200),
    supabase
      .from('categories')
      .select('*')
      .eq('household_id', householdId)
      .order('sort_order'),
  ])

  return (
    <ExpensesClient
      expenses={expenses ?? []}
      categories={categories ?? []}
      householdId={householdId}
      userId={user.id}
    />
  )
}
