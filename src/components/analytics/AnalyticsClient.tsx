'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { Budget } from '@/lib/database.types'
import { formatCurrency, getMonthName } from '@/lib/utils'

interface Expense {
  id: string
  amount: number
  expense_date: string
  is_shared: boolean
  user_id: string
  category_id: string | null
  categories: { name: string; icon: string | null; color: string | null } | null
  profiles: { full_name: string } | null
}

interface BudgetWithCat extends Budget {
  categories: { name: string; icon: string | null; color: string | null } | null
}

interface Props {
  expenses: Expense[]
  categories: { id: string; name: string }[]
  budgets: BudgetWithCat[]
  userId: string
}

type Range = 'month' | '3months' | '6months' | 'year'

const TOOLTIP_STYLE = {
  backgroundColor: 'rgba(15, 23, 42, 0.95)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '12px',
  color: '#f8fafc',
  fontSize: '13px',
}

const SPRING = { duration: 0.4, ease: 'easeOut' } as const

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: SPRING },
}

export default function AnalyticsClient({ expenses, budgets }: Props) {
  const [range, setRange] = useState<Range>('month')

  const now = new Date()

  const filteredExpenses = useMemo(() => {
    const months = range === 'month' ? 1 : range === '3months' ? 3 : range === '6months' ? 6 : 12
    const cutoff = new Date(now.getFullYear(), now.getMonth() - months + 1, 1)
    return expenses.filter((e) => new Date(e.expense_date) >= cutoff)
  }, [expenses, range, now])

  // Monthly trend data
  const monthlyData = useMemo(() => {
    const months = range === 'month' ? 1 : range === '3months' ? 3 : range === '6months' ? 6 : 12
    const result: { name: string; total: number; shared: number; personal: number }[] = []
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const monthExpenses = expenses.filter((e) => e.expense_date.startsWith(monthStr))
      const shared = monthExpenses.filter((e) => e.is_shared).reduce((s, e) => s + e.amount, 0)
      const personal = monthExpenses.filter((e) => !e.is_shared).reduce((s, e) => s + e.amount, 0)
      result.push({ name: getMonthName(d), total: shared + personal, shared, personal })
    }
    return result
  }, [expenses, range, now])

  // Category breakdown
  const categoryData = useMemo(() => {
    const map: Record<string, { name: string; icon: string; color: string; amount: number }> = {}
    for (const exp of filteredExpenses) {
      const catId = exp.category_id ?? 'uncategorized'
      const cat = exp.categories
      if (!map[catId]) {
        map[catId] = { name: cat?.name ?? 'Sin categoría', icon: cat?.icon ?? '📦', color: cat?.color ?? '#94a3b8', amount: 0 }
      }
      map[catId].amount += exp.amount
    }
    return Object.values(map).sort((a, b) => b.amount - a.amount).slice(0, 8)
  }, [filteredExpenses])

  const totalAmount = filteredExpenses.reduce((s, e) => s + e.amount, 0)

  // Per-person (current month)
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const currentMonthExpenses = expenses.filter((e) => e.expense_date.startsWith(currentMonthStr))

  const perPersonData = useMemo(() => {
    const map: Record<string, { name: string; amount: number }> = {}
    for (const exp of currentMonthExpenses) {
      const name = exp.profiles?.full_name?.split(' ')[0] ?? 'Usuario'
      if (!map[exp.user_id]) map[exp.user_id] = { name, amount: 0 }
      map[exp.user_id].amount += exp.amount
    }
    return Object.values(map)
  }, [currentMonthExpenses])

  // Budget vs actual
  const budgetData = useMemo(() => {
    return budgets
      .filter((b) => b.category_id)
      .map((b) => {
        const spent = currentMonthExpenses
          .filter((e) => e.category_id === b.category_id && e.is_shared)
          .reduce((s, e) => s + e.amount, 0)
        return { name: b.categories?.name ?? '—', budget: b.amount, gastado: spent, color: b.categories?.color ?? '#6366f1' }
      })
  }, [budgets, currentMonthExpenses])

  // Top categories with trend
  const prevMonthStr = `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`
  const prevExpenses = expenses.filter((e) => e.expense_date.startsWith(prevMonthStr))

  const topCategories = useMemo(() => {
    return categoryData.slice(0, 5).map((cat) => {
      const prevAmt = prevExpenses.filter((e) => e.categories?.name === cat.name).reduce((s, e) => s + e.amount, 0)
      const trend = prevAmt > 0 ? ((cat.amount - prevAmt) / prevAmt) * 100 : 0
      return { ...cat, trend }
    })
  }, [categoryData, prevExpenses])

  const ranges: { label: string; value: Range }[] = [
    { label: 'Este mes', value: 'month' },
    { label: '3 meses', value: '3months' },
    { label: '6 meses', value: '6months' },
    { label: '1 año', value: 'year' },
  ]

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Analítica</h1>
          <p className="text-slate-400 text-sm mt-0.5">Total: {formatCurrency(totalAmount)}</p>
        </div>
        <div className="flex rounded-xl bg-white/5 border border-white/10 p-1">
          {ranges.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
                range === r.value ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Monthly trend */}
      <motion.div variants={itemVariants} className="glass rounded-2xl p-5">
        <h2 className="font-semibold text-white mb-4">Tendencia mensual</h2>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={monthlyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorShared" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorPersonal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false}
              tickFormatter={(v) => `${((v as number) / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(v, name) => [formatCurrency(Number(v ?? 0)), name === 'shared' ? 'Compartido' : 'Personal']}
            />
            <Area type="monotone" dataKey="shared" stroke="#6366f1" strokeWidth={2} fill="url(#colorShared)" name="shared" />
            <Area type="monotone" dataKey="personal" stroke="#8b5cf6" strokeWidth={2} fill="url(#colorPersonal)" name="personal" />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Category donut */}
        <motion.div variants={itemVariants} className="glass rounded-2xl p-5">
          <h2 className="font-semibold text-white mb-4">Por categoría</h2>
          {categoryData.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">Sin datos</div>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="amount">
                    {categoryData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [formatCurrency(Number(v ?? 0))]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {categoryData.slice(0, 5).map((cat, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="text-xs text-slate-400 truncate max-w-[80px]">{cat.name}</span>
                    </div>
                    <span className="text-xs text-white font-medium">{formatCurrency(cat.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Budget vs actual */}
        <motion.div variants={itemVariants} className="glass rounded-2xl p-5">
          <h2 className="font-semibold text-white mb-4">Presupuesto vs. gasto real</h2>
          {budgetData.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">Sin presupuestos configurados</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={budgetData} margin={{ top: 0, right: 5, left: -25, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `${((v as number) / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v, name) => [formatCurrency(Number(v ?? 0)), name === 'budget' ? 'Presupuesto' : 'Gastado']}
                />
                <Bar dataKey="budget" fill="rgba(99,102,241,0.3)" radius={[4, 4, 0, 0]} name="budget" />
                <Bar dataKey="gastado" fill="#6366f1" radius={[4, 4, 0, 0]} name="gastado" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top categories */}
        <motion.div variants={itemVariants} className="glass rounded-2xl p-5">
          <h2 className="font-semibold text-white mb-4">Top categorías</h2>
          {topCategories.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">Sin datos</div>
          ) : (
            <div className="space-y-3">
              {topCategories.map((cat, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-base w-6 text-center">{cat.icon}</span>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-slate-300">{cat.name}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs ${cat.trend > 0 ? 'text-red-400' : cat.trend < 0 ? 'text-green-400' : 'text-slate-500'}`}>
                          {cat.trend > 0 ? '↑' : cat.trend < 0 ? '↓' : '—'}
                          {cat.trend !== 0 ? ` ${Math.abs(cat.trend).toFixed(0)}%` : ''}
                        </span>
                        <span className="text-sm font-medium text-white">{formatCurrency(cat.amount)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${totalAmount > 0 ? (cat.amount / totalAmount) * 100 : 0}%`, backgroundColor: cat.color }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Per person */}
        <motion.div variants={itemVariants} className="glass rounded-2xl p-5">
          <h2 className="font-semibold text-white mb-4">Gasto por persona (este mes)</h2>
          {perPersonData.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">Sin gastos este mes</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={perPersonData} margin={{ top: 0, right: 5, left: -25, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `${((v as number) / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [formatCurrency(Number(v ?? 0)), 'Gastado']} />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                  {perPersonData.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? '#6366f1' : '#8b5cf6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </div>
    </motion.div>
  )
}
