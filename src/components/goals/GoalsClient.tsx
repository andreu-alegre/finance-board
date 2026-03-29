'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Loader2, Target, Pencil, Trash2, PlusCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Goal, GoalContribution } from '@/lib/database.types'
import { formatCurrency, getDaysRemaining } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { containerVariants, itemVariants } from '@/lib/motion'

interface ContributionWithProfile extends GoalContribution {
  profiles: { full_name: string } | null
}

interface Props {
  goals: Goal[]
  contributions: ContributionWithProfile[]
  householdId: string
  userId: string
}

type Tab = 'shared' | 'personal'

const GOAL_ICONS = ['✈️', '🏠', '🚗', '💻', '📱', '🎓', '💍', '🌴', '🎵', '🏋️', '🎯', '💰', '🐾', '🍕', '⛵']

export default function GoalsClient({ goals, contributions, householdId, userId }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('shared')
  const [showAdd, setShowAdd] = useState(false)
  const [editGoal, setEditGoal] = useState<Goal | null>(null)
  const [contributeGoal, setContributeGoal] = useState<Goal | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formIcon, setFormIcon] = useState('🎯')
  const [formTarget, setFormTarget] = useState('')
  const [formDate, setFormDate] = useState('')
  const [formShared, setFormShared] = useState(true)
  const [contributeAmount, setContributeAmount] = useState('')
  const [contributeNote, setContributeNote] = useState('')
  const [loading, setLoading] = useState(false)

  const filtered = goals.filter((g) =>
    tab === 'shared' ? g.is_shared : !g.is_shared && g.user_id === userId
  )

  function openAdd() {
    setEditGoal(null)
    setFormName('')
    setFormIcon('🎯')
    setFormTarget('')
    setFormDate('')
    setFormShared(tab === 'shared')
    setShowAdd(true)
  }

  function openEdit(goal: Goal) {
    setEditGoal(goal)
    setFormName(goal.name)
    setFormIcon(goal.icon ?? '🎯')
    setFormTarget(goal.target_amount.toString())
    setFormDate(goal.target_date ?? '')
    setFormShared(goal.is_shared)
    setShowAdd(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()

    if (editGoal) {
      await supabase
        .from('goals')
        .update({
          name: formName,
          icon: formIcon,
          target_amount: parseFloat(formTarget),
          target_date: formDate || null,
          is_shared: formShared,
        })
        .eq('id', editGoal.id)
    } else {
      await supabase.from('goals').insert({
        household_id: householdId,
        user_id: formShared ? null : userId,
        name: formName,
        icon: formIcon,
        target_amount: parseFloat(formTarget),
        target_date: formDate || null,
        is_shared: formShared,
        status: 'active',
      })
    }

    router.refresh()
    setShowAdd(false)
    setLoading(false)
  }

  async function handleContribute(e: React.FormEvent) {
    e.preventDefault()
    if (!contributeGoal) return
    setLoading(true)
    const supabase = createClient()

    await supabase.from('goal_contributions').insert({
      goal_id: contributeGoal.id,
      user_id: userId,
      amount: parseFloat(contributeAmount),
      note: contributeNote || null,
    })

    router.refresh()
    setContributeGoal(null)
    setContributeAmount('')
    setContributeNote('')
    setLoading(false)
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    const supabase = createClient()
    await supabase.from('goals').delete().eq('id', id)
    router.refresh()
    setDeletingId(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Objetivos</h1>
          <p className="text-slate-400 text-sm mt-0.5">Ahorra para lo que importa</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all shadow-glow-sm"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nuevo objetivo</span>
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

      {/* Goals grid */}
      {filtered.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Target className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500">No hay objetivos {tab === 'shared' ? 'compartidos' : 'personales'}</p>
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
          {filtered.map((goal) => {
            const pct = Math.min((goal.current_amount / goal.target_amount) * 100, 100)
            const daysLeft = goal.target_date ? getDaysRemaining(goal.target_date) : null
            const goalContribs = contributions.filter((c) => c.goal_id === goal.id)
            const isCompleted = goal.status === 'completed'
            const circumference = 2 * Math.PI * 28
            const strokeDashoffset = circumference * (1 - pct / 100)

            return (
              <motion.div key={goal.id} variants={itemVariants} className="glass rounded-2xl p-5 group relative">
                {/* Actions */}
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(goal)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(goal.id)} disabled={deletingId === goal.id}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-start gap-4">
                  {/* Progress ring */}
                  <div className="relative flex-shrink-0">
                    <svg width="68" height="68" viewBox="0 0 68 68">
                      <circle cx="34" cy="34" r="28" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                      <circle
                        cx="34" cy="34" r="28" fill="none"
                        stroke={isCompleted ? '#22c55e' : '#6366f1'}
                        strokeWidth="4" strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        transform="rotate(-90 34 34)"
                        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl">{goal.icon ?? '🎯'}</span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-white truncate">{goal.name}</p>
                      {isCompleted && (
                        <span className="text-xs text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded-full">✓</span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-white mt-1">
                      {formatCurrency(goal.current_amount)}
                      <span className="text-slate-500 font-normal text-xs"> / {formatCurrency(goal.target_amount)}</span>
                    </p>
                    {daysLeft !== null && !isCompleted && (
                      <p className={`text-xs mt-1 ${daysLeft < 0 ? 'text-red-400' : daysLeft < 30 ? 'text-amber-400' : 'text-slate-500'}`}>
                        {daysLeft < 0 ? `Vencido hace ${Math.abs(daysLeft)} días` : `${daysLeft} días restantes`}
                      </p>
                    )}
                    {isCompleted && <p className="text-xs text-green-400 mt-1">Objetivo completado 🎉</p>}
                  </div>
                </div>

                {/* Recent contributions */}
                {goalContribs.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/5">
                    <p className="text-xs text-slate-500 mb-2">Últimas aportaciones</p>
                    {goalContribs.slice(0, 2).map((c) => (
                      <div key={c.id} className="flex justify-between text-xs py-0.5">
                        <span className="text-slate-400">{c.profiles?.full_name?.split(' ')[0]}</span>
                        <span className="text-white font-medium">+{formatCurrency(c.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {!isCompleted && (
                  <button
                    onClick={() => setContributeGoal(goal)}
                    className="mt-4 w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-sm font-medium transition-all border border-indigo-500/20"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Aportar
                  </button>
                )}
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
              className="fixed inset-x-4 bottom-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-md z-50 max-h-[90vh] overflow-y-auto"
            >
              <div className="glass rounded-2xl p-6 shadow-card">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-semibold text-white">{editGoal ? 'Editar objetivo' : 'Nuevo objetivo'}</h2>
                  <button onClick={() => setShowAdd(false)} className="text-slate-500 hover:text-slate-300 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">Icono</label>
                    <div className="flex flex-wrap gap-2">
                      {GOAL_ICONS.map((icon) => (
                        <button key={icon} type="button" onClick={() => setFormIcon(icon)}
                          className={`w-9 h-9 rounded-xl text-xl flex items-center justify-center transition-all ${
                            formIcon === icon ? 'bg-indigo-500/30 border-2 border-indigo-500' : 'bg-white/5 border border-white/10 hover:bg-white/10'
                          }`}>
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">Nombre</label>
                    <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} required
                      placeholder="ej: Viaje a Tailandia"
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 transition-all text-sm" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">Objetivo (€)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">€</span>
                        <input type="number" step="0.01" min="0.01" value={formTarget}
                          onChange={(e) => setFormTarget(e.target.value)} required placeholder="0.00"
                          className="w-full pl-7 pr-3 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/60 transition-all text-sm" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">Fecha límite</label>
                      <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)}
                        className="w-full px-3 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-indigo-500/60 transition-all text-sm" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">Tipo</label>
                    <div className="flex rounded-xl bg-white/5 border border-white/10 p-1">
                      <button type="button" onClick={() => setFormShared(true)}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${formShared ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-300'}`}>
                        Compartido
                      </button>
                      <button type="button" onClick={() => setFormShared(false)}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${!formShared ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-300'}`}>
                        Personal
                      </button>
                    </div>
                  </div>

                  <button type="submit" disabled={loading}
                    className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                    {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</> : 'Guardar objetivo'}
                  </button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Contribute Modal */}
      <AnimatePresence>
        {contributeGoal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setContributeGoal(null)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
              className="fixed inset-x-4 bottom-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-sm z-50"
            >
              <div className="glass rounded-2xl p-6 shadow-card">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-semibold text-white">
                    Aportar a {contributeGoal.icon} {contributeGoal.name}
                  </h2>
                  <button onClick={() => setContributeGoal(null)} className="text-slate-500 hover:text-slate-300 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleContribute} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">Importe</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg font-medium">€</span>
                      <input type="number" step="0.01" min="0.01" value={contributeAmount}
                        onChange={(e) => setContributeAmount(e.target.value)} required placeholder="0.00"
                        className="w-full pl-9 pr-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/60 transition-all text-2xl font-semibold" />
                    </div>
                  </div>
                  <input type="text" value={contributeNote} onChange={(e) => setContributeNote(e.target.value)}
                    placeholder="Nota opcional..."
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/60 transition-all text-sm" />
                  <p className="text-xs text-slate-500">
                    Progreso: {formatCurrency(contributeGoal.current_amount)} / {formatCurrency(contributeGoal.target_amount)}
                  </p>
                  <button type="submit" disabled={loading}
                    className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                    {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Aportando...</> : 'Aportar'}
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
