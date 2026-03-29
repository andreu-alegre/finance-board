'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, Pencil, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Category } from '@/lib/database.types'
import { formatCurrency, getRelativeDate } from '@/lib/utils'
import AddExpenseModal from './AddExpenseModal'
import { useRouter } from 'next/navigation'

interface Expense {
  id: string
  description: string
  amount: number
  expense_date: string
  is_shared: boolean
  split_type: '50/50' | 'proportional' | 'custom'
  user_id: string
  category_id: string | null
  notes: string | null
  categories: { name: string; icon: string | null; color: string | null } | null
  profiles: { full_name: string } | null
}

interface Props {
  expenses: Expense[]
  categories: Category[]
  householdId: string
  userId: string
}

type Filter = 'all' | 'shared' | 'mine'

export default function ExpensesClient({ expenses, categories, householdId, userId }: Props) {
  const router = useRouter()
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    let list = expenses
    if (filter === 'shared') list = list.filter((e) => e.is_shared)
    if (filter === 'mine') list = list.filter((e) => e.user_id === userId && !e.is_shared)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(
        (e) =>
          e.description.toLowerCase().includes(q) ||
          e.categories?.name.toLowerCase().includes(q)
      )
    }
    return list
  }, [expenses, filter, search, userId])

  const totalFiltered = filtered.reduce((s, e) => s + e.amount, 0)

  // Group by relative date
  const grouped = useMemo(() => {
    const groups: Record<string, Expense[]> = {}
    for (const exp of filtered) {
      const label = getRelativeDate(exp.expense_date)
      if (!groups[label]) groups[label] = []
      groups[label].push(exp)
    }
    return groups
  }, [filtered])

  const dateOrder = ['Hoy', 'Ayer', 'Esta semana', 'Antes']

  async function handleDelete(id: string) {
    setDeletingId(id)
    const supabase = createClient()
    await supabase.from('expenses').delete().eq('id', id)
    router.refresh()
    setDeletingId(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Gastos</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {filtered.length} gastos · {formatCurrency(totalFiltered)}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all shadow-glow-sm"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Añadir</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Toggle */}
        <div className="flex rounded-xl bg-white/5 border border-white/10 p-1">
          {(['all', 'shared', 'mine'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
                filter === f ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              {f === 'all' ? 'Todos' : f === 'shared' ? 'Compartidos' : 'Míos'}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar gastos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 transition-all text-sm"
          />
        </div>
      </div>

      {/* Expense list */}
      <div className="glass rounded-2xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-500">No hay gastos que mostrar</p>
            <button
              onClick={() => setShowAdd(true)}
              className="mt-3 text-indigo-400 hover:text-indigo-300 text-sm transition-colors"
            >
              Añadir el primero
            </button>
          </div>
        ) : (
          dateOrder.map((label) => {
            const group = grouped[label]
            if (!group || group.length === 0) return null
            return (
              <div key={label}>
                <div className="px-5 py-3 border-b border-white/5 bg-white/2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {label}
                    </span>
                    <span className="text-xs text-slate-600">
                      {formatCurrency(group.reduce((s, e) => s + e.amount, 0))}
                    </span>
                  </div>
                </div>
                <AnimatePresence>
                  {group.map((exp, idx) => (
                    <motion.div
                      key={exp.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 12 }}
                      transition={{ delay: idx * 0.03 }}
                      className="flex items-center gap-4 px-5 py-4 border-b border-white/5 last:border-0 hover:bg-white/2 transition-colors group"
                    >
                      {/* Icon */}
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                        style={{ backgroundColor: `${exp.categories?.color ?? '#6366f1'}20` }}
                      >
                        {exp.categories?.icon ?? '💸'}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{exp.description}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-slate-500">
                            {exp.profiles?.full_name?.split(' ')[0]}
                          </span>
                          {exp.categories && (
                            <>
                              <span className="text-slate-700">·</span>
                              <span className="text-xs text-slate-500">{exp.categories.name}</span>
                            </>
                          )}
                          {exp.is_shared && (
                            <>
                              <span className="text-slate-700">·</span>
                              <span className="text-xs text-indigo-400">Compartido</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Amount */}
                      <p className="text-sm font-semibold text-white flex-shrink-0">
                        {formatCurrency(exp.amount)}
                      </p>

                      {/* Actions (only for own expenses) */}
                      {exp.user_id === userId && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setEditingExpense(exp)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(exp.id)}
                            disabled={deletingId === exp.id}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )
          })
        )}
      </div>

      <AddExpenseModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        householdId={householdId}
        userId={userId}
        categories={categories}
      />

      {editingExpense && (
        <AddExpenseModal
          open={true}
          onClose={() => setEditingExpense(null)}
          householdId={householdId}
          userId={userId}
          categories={categories}
          editExpense={editingExpense}
        />
      )}
    </div>
  )
}
