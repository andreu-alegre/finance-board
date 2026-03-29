'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Loader2, AlertTriangle, Pencil, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Budget, Category } from '@/lib/database.types'
import { formatCurrency, getProgressColor } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { containerVariants, itemVariants } from '@/lib/motion'

interface BudgetWithCategory extends Budget {
  categories: { name: string; icon: string | null; color: string | null } | null
}

interface Expense {
  amount: number
  category_id: string | null
  is_shared: boolean
  user_id: string
}

interface Props {
  budgets: BudgetWithCategory[]
  expenses: Expense[]
  categories: Category[]
  householdId: string
  userId: string
}

type Tab = 'shared' | 'personal'

export default function BudgetsClient({ budgets, expenses, categories, householdId, userId }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('shared')
  const [showAdd, setShowAdd] = useState(false)
  const [editBudget, setEditBudget] = useState<BudgetWithCategory | null>(null)
  const [formCategoryId, setFormCategoryId] = useState<string | null>(null)
  const [formAmount, setFormAmount] = useState('')
  const [formShared, setFormShared] = useState(true)
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const filtered = budgets.filter((b) =>
    tab === 'shared' ? b.is_shared : !b.is_shared && b.user_id === userId
  )

  function getSpent(budget: BudgetWithCategory) {
    return expenses
      .filter(
        (e) =>
          e.category_id === budget.category_id &&
          (budget.is_shared ? e.is_shared : !e.is_shared && e.user_id === userId)
      )
      .reduce((s, e) => s + e.amount, 0)
  }

  function openAdd() {
    setEditBudget(null)
    setFormCategoryId(null)
    setFormAmount('')
    setFormShared(tab === 'shared')
    setShowAdd(true)
  }

  function openEdit(b: BudgetWithCategory) {
    setEditBudget(b)
    setFormCategoryId(b.category_id)
    setFormAmount(b.amount.toString())
    setFormShared(b.is_shared)
    setShowAdd(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const amount = parseFloat(formAmount)

    if (editBudget) {
      await supabase
        .from('budgets')
        .update({ category_id: formCategoryId, amount, is_shared: formShared })
        .eq('id', editBudget.id)
    } else {
      await supabase.from('budgets').insert({
        household_id: householdId,
        user_id: formShared ? null : userId,
        category_id: formCategoryId,
        amount,
        is_shared: formShared,
        period: 'monthly',
        start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          .toISOString()
          .split('T')[0],
      })
    }

    router.refresh()
    setShowAdd(false)
    setLoading(false)
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    const supabase = createClient()
    await supabase.from('budgets').delete().eq('id', id)
    router.refresh()
    setDeletingId(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Presupuestos</h1>
          <p className="text-slate-400 text-sm mt-0.5">Control de gasto mensual</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all shadow-glow-sm"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nuevo</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl bg-white/5 border border-white/10 p-1 w-fit">
        {(['shared', 'personal'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 text-sm font-medium rounded-lg transition-all ${
              tab === t ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            {t === 'shared' ? 'Compartidos' : 'Personales'}
          </button>
        ))}
      </div>

      {/* Budget grid */}
      {filtered.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <p className="text-slate-500">No hay presupuestos {tab === 'shared' ? 'compartidos' : 'personales'}</p>
          <button onClick={openAdd} className="mt-3 text-indigo-400 hover:text-indigo-300 text-sm transition-colors">
            Crear el primero
          </button>
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {filtered.map((budget) => {
            const spent = getSpent(budget)
            const pct = budget.amount > 0 ? Math.min((spent / budget.amount) * 100, 100) : 0
            const color = getProgressColor(pct)
            const isOver = pct >= 100
            const isWarning = pct >= 80 && pct < 100

            return (
              <motion.div
                key={budget.id}
                variants={itemVariants}
                className={`glass rounded-2xl p-5 group relative ${
                  isOver ? 'border-red-500/30' : isWarning ? 'border-amber-500/20' : ''
                }`}
              >
                {(isOver || isWarning) && (
                  <div className={`absolute top-3 right-12 ${isOver ? 'text-red-400' : 'text-amber-400'}`}>
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                )}

                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(budget)} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(budget.id)} disabled={deletingId === budget.id}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                    style={{ backgroundColor: `${budget.categories?.color ?? '#6366f1'}20` }}>
                    {budget.categories?.icon ?? '📦'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{budget.categories?.name ?? 'Total'}</p>
                    <p className="text-xs text-slate-500">{budget.is_shared ? 'Compartido' : 'Personal'} · Mensual</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`text-2xl font-semibold ${isOver ? 'text-red-400' : 'text-white'}`}>
                      {pct.toFixed(0)}%
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatCurrency(spent)} / {formatCurrency(budget.amount)}
                    </span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: color }}
                    />
                  </div>
                  <p className={`text-xs ${isOver ? 'text-red-400' : 'text-slate-500'}`}>
                    {isOver
                      ? `Excedido en ${formatCurrency(spent - budget.amount)}`
                      : `Quedan ${formatCurrency(budget.amount - spent)}`}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showAdd && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowAdd(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
              className="fixed inset-x-4 bottom-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-md z-50"
            >
              <div className="glass rounded-2xl p-6 shadow-card">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-semibold text-white">
                    {editBudget ? 'Editar presupuesto' : 'Nuevo presupuesto'}
                  </h2>
                  <button onClick={() => setShowAdd(false)} className="text-slate-500 hover:text-slate-300 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">Categoría</label>
                    <div className="grid grid-cols-5 gap-1.5 max-h-40 overflow-y-auto">
                      {categories.map((cat) => (
                        <button key={cat.id} type="button"
                          onClick={() => setFormCategoryId(cat.id === formCategoryId ? null : cat.id)}
                          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                            formCategoryId === cat.id ? 'border-2 bg-white/10' : 'border border-white/5 hover:border-white/20 hover:bg-white/5'
                          }`}
                          style={formCategoryId === cat.id ? { borderColor: cat.color ?? '#6366f1' } : {}}
                        >
                          <span className="text-lg leading-none">{cat.icon ?? '📦'}</span>
                          <span className="text-[9px] text-slate-500 truncate w-full text-center">{cat.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">Importe mensual</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">€</span>
                      <input type="number" step="0.01" min="0.01" value={formAmount}
                        onChange={(e) => setFormAmount(e.target.value)} required placeholder="0.00"
                        className="w-full pl-9 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/60 transition-all text-xl font-semibold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">Tipo</label>
                    <div className="flex rounded-xl bg-white/5 border border-white/10 p-1">
                      <button type="button" onClick={() => setFormShared(true)}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${formShared ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-300'}`}
                      >Compartido</button>
                      <button type="button" onClick={() => setFormShared(false)}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${!formShared ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-300'}`}
                      >Personal</button>
                    </div>
                  </div>

                  <button type="submit" disabled={loading}
                    className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</> : 'Guardar'}
                  </button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
