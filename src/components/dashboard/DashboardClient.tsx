'use client'

import { containerVariants, itemVariants } from '@/lib/motion'

import { motion } from 'framer-motion'
import { User } from '@supabase/supabase-js'
import type { Profile, Category, Budget, Goal } from '@/lib/database.types'
import { formatCurrency, formatDateShort, getInitials, getProgressColor } from '@/lib/utils'
import { ArrowUpRight, ArrowDownRight, Plus, TrendingUp, Users, Target, CreditCard } from 'lucide-react'
import Link from 'next/link'
import AddExpenseModal from '@/components/expenses/AddExpenseModal'
import { useState } from 'react'

interface Expense {
  id: string
  description: string
  amount: number
  expense_date: string
  is_shared: boolean
  user_id: string
  category_id: string | null
  categories: { name: string; icon: string | null; color: string | null } | null
  profiles: { full_name: string } | null
}

interface Member {
  user_id: string
  role: string
  profiles: { id: string; full_name: string; avatar_url: string | null } | null
}

interface Topup {
  id: string
  amount: number
  note: string | null
  created_at: string
  user_id: string
}

interface Props {
  user: User
  profile: Profile | null
  householdId: string
  household: { id: string; name: string; invite_code: string }
  members: Member[]
  currentExpenses: Expense[]
  lastMonthExpenses: { amount: number; is_shared: boolean }[]
  budgets: (Budget & { categories: { name: string; icon: string | null; color: string | null } | null })[]
  goals: Goal[]
  categories: Category[]
  topups: Topup[]
  currentMonth: { start: string; end: string }
}



export default function DashboardClient({
  user,
  profile,
  householdId,
  members,
  currentExpenses,
  lastMonthExpenses,
  budgets,
  goals,
  categories,
  topups,
}: Props) {
  const [showAddExpense, setShowAddExpense] = useState(false)

  const totalThisMonth = currentExpenses.reduce((s, e) => s + e.amount, 0)
  const totalLastMonth = lastMonthExpenses.reduce((s, e) => s + e.amount, 0)
  const monthChange = totalLastMonth > 0
    ? ((totalThisMonth - totalLastMonth) / totalLastMonth) * 100
    : 0
  const isUp = monthChange > 0

  // Shared card balance: total topped up minus shared-card expenses
  const totalTopups = topups.reduce((s, t) => s + t.amount, 0)
  const sharedCardSpent = currentExpenses
    .filter((e) => e.is_shared && (e as any).paid_from_shared_card !== false)
    .reduce((s, e) => s + e.amount, 0)
  const sharedCardBalance = totalTopups - sharedCardSpent

  const recentExpenses = currentExpenses.slice(0, 6)

  const now = new Date()

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            Hola, {profile?.full_name?.split(' ')[0] ?? 'Usuario'} 👋
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(now)}
          </p>
        </div>
        <button
          onClick={() => setShowAddExpense(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all shadow-glow-sm"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Añadir gasto</span>
        </button>
      </motion.div>

      {/* Top stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Monthly total */}
        <motion.div variants={itemVariants} className="glass rounded-2xl p-5 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <CreditCard className="w-4 h-4" />
              Este mes
            </div>
            <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
              isUp ? 'text-red-400 bg-red-500/10' : 'text-green-400 bg-green-500/10'
            }`}>
              {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(monthChange).toFixed(0)}% vs mes ant.
            </div>
          </div>
          <p className="text-3xl font-semibold text-white">{formatCurrency(totalThisMonth)}</p>
          <p className="text-slate-500 text-xs mt-1">
            Mes anterior: {formatCurrency(totalLastMonth)}
          </p>
        </motion.div>

        {/* Shared card balance */}
        <motion.div variants={itemVariants} className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-3">
            <Users className="w-4 h-4" />
            Saldo tarjeta común
          </div>
          <p className={`text-3xl font-semibold ${sharedCardBalance >= 0 ? 'text-white' : 'text-red-400'}`}>
            {formatCurrency(sharedCardBalance)}
          </p>
          <p className="text-slate-500 text-xs mt-1">
            {formatCurrency(totalTopups)} ingresado · {formatCurrency(sharedCardSpent)} gastado
          </p>
        </motion.div>

        {/* Goals progress */}
        <motion.div variants={itemVariants} className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-3">
            <Target className="w-4 h-4" />
            Objetivos activos
          </div>
          <p className="text-3xl font-semibold text-white">{goals.length}</p>
          {goals.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {goals.slice(0, 2).map((g) => {
                const pct = Math.min((g.current_amount / g.target_amount) * 100, 100)
                return (
                  <div key={g.id}>
                    <div className="flex justify-between text-xs text-slate-500 mb-0.5">
                      <span className="truncate">{g.icon} {g.name}</span>
                      <span>{pct.toFixed(0)}%</span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: '#6366f1' }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Recent expenses */}
        <motion.div variants={itemVariants} className="glass rounded-2xl p-5 lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">Últimos gastos</h2>
            <Link href="/expenses" className="text-indigo-400 hover:text-indigo-300 text-sm transition-colors">
              Ver todos →
            </Link>
          </div>
          {recentExpenses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-500 text-sm">No hay gastos este mes</p>
              <button
                onClick={() => setShowAddExpense(true)}
                className="mt-3 text-indigo-400 hover:text-indigo-300 text-sm transition-colors"
              >
                Añadir el primero
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {recentExpenses.map((exp) => (
                <div key={exp.id} className="flex items-center gap-3 py-2">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                    style={{ backgroundColor: `${exp.categories?.color ?? '#6366f1'}20` }}
                  >
                    {exp.categories?.icon ?? '💸'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{exp.description}</p>
                    <p className="text-xs text-slate-500">
                      {exp.profiles?.full_name?.split(' ')[0]} · {formatDateShort(exp.expense_date)}
                      {exp.is_shared && <span className="ml-1 text-indigo-400">· Compartido</span>}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-white flex-shrink-0">
                    {formatCurrency(exp.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Budget health */}
        <motion.div variants={itemVariants} className="glass rounded-2xl p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">Presupuestos</h2>
            <Link href="/budgets" className="text-indigo-400 hover:text-indigo-300 text-sm transition-colors">
              Ver todos →
            </Link>
          </div>
          {budgets.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-500 text-sm">No hay presupuestos configurados</p>
              <Link
                href="/budgets"
                className="mt-3 inline-block text-indigo-400 hover:text-indigo-300 text-sm transition-colors"
              >
                Crear presupuesto
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {budgets.slice(0, 4).map((budget) => {
                const spent = currentExpenses
                  .filter((e) => e.category_id === budget.category_id && e.is_shared === budget.is_shared)
                  .reduce((s, e) => s + e.amount, 0)
                const pct = budget.amount > 0 ? Math.min((spent / budget.amount) * 100, 100) : 0
                const color = getProgressColor(pct)
                return (
                  <div key={budget.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{budget.categories?.icon ?? '📦'}</span>
                        <span className="text-sm text-slate-300 truncate max-w-[100px]">
                          {budget.categories?.name ?? 'Total'}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500">
                        {formatCurrency(spent)} / {formatCurrency(budget.amount)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: color }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* Members */}
      {members.length > 1 && (
        <motion.div variants={itemVariants} className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-slate-400" />
            <h2 className="font-semibold text-white">Gastos por persona este mes</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {members.map((member) => {
              const memberSpent = currentExpenses
                .filter((e) => e.user_id === member.user_id)
                .reduce((s, e) => s + e.amount, 0)
              const memberName = member.profiles?.full_name ?? 'Usuario'
              return (
                <div key={member.user_id} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-white">{getInitials(memberName)}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{memberName.split(' ')[0]}</p>
                    <p className="text-lg font-semibold text-white">{formatCurrency(memberSpent)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>
      )}

      <AddExpenseModal
        open={showAddExpense}
        onClose={() => setShowAddExpense(false)}
        householdId={householdId}
        userId={user.id}
        categories={categories}
      />
    </motion.div>
  )
}
