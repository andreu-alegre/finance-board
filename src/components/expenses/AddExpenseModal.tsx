'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Category } from '@/lib/database.types'
import { useRouter } from 'next/navigation'

interface Props {
  open: boolean
  onClose: () => void
  householdId: string
  userId: string
  categories: Category[]
  editExpense?: {
    id: string
    description: string
    amount: number
    expense_date: string
    is_shared: boolean
    split_type: '50/50' | 'proportional' | 'custom'
    category_id: string | null
    notes: string | null
  }
}

export default function AddExpenseModal({
  open,
  onClose,
  householdId,
  userId,
  categories,
  editExpense,
}: Props) {
  const router = useRouter()
  const [description, setDescription] = useState(editExpense?.description ?? '')
  const [amount, setAmount] = useState(editExpense?.amount?.toString() ?? '')
  const [categoryId, setCategoryId] = useState<string | null>(editExpense?.category_id ?? null)
  const [expenseDate, setExpenseDate] = useState(
    editExpense?.expense_date ?? new Date().toISOString().split('T')[0]
  )
  const [isShared, setIsShared] = useState(editExpense?.is_shared ?? true)
  const [splitType, setSplitType] = useState<'50/50' | 'proportional' | 'custom'>(
    editExpense?.split_type ?? '50/50'
  )
  const [notes, setNotes] = useState(editExpense?.notes ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isEdit = !!editExpense

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const parsedAmount = parseFloat(amount)

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Importe inválido')
      setLoading(false)
      return
    }

    if (isEdit) {
      const { error } = await supabase
        .from('expenses')
        .update({
          description,
          amount: parsedAmount,
          category_id: categoryId,
          expense_date: expenseDate,
          is_shared: isShared,
          split_type: splitType,
          notes: notes || null,
        })
        .eq('id', editExpense.id)

      if (error) {
        setError('Error al actualizar el gasto')
        setLoading(false)
        return
      }
    } else {
      const { error } = await supabase.from('expenses').insert({
        household_id: householdId,
        user_id: userId,
        description,
        amount: parsedAmount,
        category_id: categoryId,
        expense_date: expenseDate,
        is_shared: isShared,
        split_type: splitType,
        notes: notes || null,
      })

      if (error) {
        setError('Error al guardar el gasto')
        setLoading(false)
        return
      }
    }

    router.refresh()
    onClose()
    setLoading(false)
    // Reset
    if (!isEdit) {
      setDescription('')
      setAmount('')
      setCategoryId(null)
      setExpenseDate(new Date().toISOString().split('T')[0])
      setIsShared(true)
      setNotes('')
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          {/* Modal */}
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
                  {isEdit ? 'Editar gasto' : 'Nuevo gasto'}
                </h2>
                <button
                  onClick={onClose}
                  className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded-lg hover:bg-white/5"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Amount */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
                    Importe
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg font-medium">€</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                      placeholder="0.00"
                      className="w-full pl-9 pr-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/60 transition-all text-2xl font-semibold"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
                    Descripción
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    placeholder="ej: Cena en restaurante"
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 transition-all text-sm"
                  />
                </div>

                {/* Category grid */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">
                    Categoría
                  </label>
                  <div className="grid grid-cols-5 gap-1.5 max-h-36 overflow-y-auto">
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategoryId(cat.id === categoryId ? null : cat.id)}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                          categoryId === cat.id
                            ? 'border-2 bg-white/10'
                            : 'border border-white/5 hover:border-white/20 hover:bg-white/5'
                        }`}
                        style={categoryId === cat.id ? { borderColor: cat.color ?? '#6366f1' } : {}}
                        title={cat.name}
                      >
                        <span className="text-lg leading-none">{cat.icon ?? '📦'}</span>
                        <span className="text-[9px] text-slate-500 truncate w-full text-center">
                          {cat.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Date */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
                      Fecha
                    </label>
                    <input
                      type="date"
                      value={expenseDate}
                      onChange={(e) => setExpenseDate(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-indigo-500/60 transition-all text-sm"
                    />
                  </div>

                  {/* Shared toggle */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
                      Tipo
                    </label>
                    <div className="flex rounded-xl bg-white/5 border border-white/10 p-1 h-[42px]">
                      <button
                        type="button"
                        onClick={() => setIsShared(true)}
                        className={`flex-1 text-xs font-medium rounded-lg transition-all ${
                          isShared ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-300'
                        }`}
                      >
                        Compartido
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsShared(false)}
                        className={`flex-1 text-xs font-medium rounded-lg transition-all ${
                          !isShared ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-300'
                        }`}
                      >
                        Personal
                      </button>
                    </div>
                  </div>
                </div>

                {/* Split type (only for shared) */}
                {isShared && (
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
                      División
                    </label>
                    <div className="flex rounded-xl bg-white/5 border border-white/10 p-1">
                      {(['50/50', 'proportional'] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setSplitType(type)}
                          className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${
                            splitType === type
                              ? 'bg-white/10 text-white'
                              : 'text-slate-400 hover:text-slate-300'
                          }`}
                        >
                          {type === '50/50' ? '50/50' : 'Proporcional'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Nota opcional..."
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/60 transition-all text-sm"
                  />
                </div>

                {error && (
                  <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
                  ) : (
                    isEdit ? 'Actualizar' : 'Guardar gasto'
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
