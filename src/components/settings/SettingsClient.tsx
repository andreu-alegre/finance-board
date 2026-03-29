'use client'

import { containerVariants, itemVariants } from '@/lib/motion'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User } from '@supabase/supabase-js'
import { Loader2, Copy, Check, LogOut, Plus, X, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Category } from '@/lib/database.types'
import { getInitials, formatCurrency } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface Member {
  user_id: string
  role: string
  profiles: { id: string; full_name: string; avatar_url: string | null; net_salary: number | null } | null
}

interface Props {
  user: User
  profile: Profile | null
  household: { id: string; name: string; invite_code: string }
  householdId: string
  isAdmin: boolean
  members: Member[]
  categories: Category[]
}

const EMOJI_PRESETS = ['🛒','🍔','🚗','🏠','💊','👕','🎬','✈️','📚','💻','🎮','🐾','🏋️','☕','🎁','💈','🌿','🔧','📱','💰','🏥','🎵','🍷','🧴','🚿']
const COLOR_PRESETS = ['#6366f1','#8b5cf6','#ec4899','#f43f5e','#f97316','#eab308','#22c55e','#14b8a6','#06b6d4','#3b82f6']

export default function SettingsClient({ user, profile, household, householdId, isAdmin, members, categories }: Props) {
  const router = useRouter()
  const [name, setName] = useState(profile?.full_name ?? '')
  const [salary, setSalary] = useState(profile?.net_salary?.toString() ?? '')
  const [householdName, setHouseholdName] = useState(household.name)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingHousehold, setSavingHousehold] = useState(false)
  const [copied, setCopied] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState(false)
  const [householdSuccess, setHouseholdSuccess] = useState(false)

  // New category form
  const [showCatForm, setShowCatForm] = useState(false)
  const [catName, setCatName] = useState('')
  const [catIcon, setCatIcon] = useState('📦')
  const [catColor, setCatColor] = useState('#6366f1')
  const [savingCat, setSavingCat] = useState(false)
  const [deletingCatId, setDeletingCatId] = useState<string | null>(null)

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSavingProfile(true)
    const supabase = createClient()
    const updates: Record<string, unknown> = { full_name: name }
    const parsedSalary = parseFloat(salary)
    updates.net_salary = salary && !isNaN(parsedSalary) ? parsedSalary : null
    await supabase.from('profiles').update(updates).eq('id', user.id)
    setSavingProfile(false)
    setProfileSuccess(true)
    setTimeout(() => setProfileSuccess(false), 2000)
    router.refresh()
  }

  async function handleSaveHousehold(e: React.FormEvent) {
    e.preventDefault()
    if (!isAdmin) return
    setSavingHousehold(true)
    const supabase = createClient()
    await supabase.from('households').update({ name: householdName }).eq('id', householdId)
    setSavingHousehold(false)
    setHouseholdSuccess(true)
    setTimeout(() => setHouseholdSuccess(false), 2000)
    router.refresh()
  }

  async function copyInviteCode() {
    await navigator.clipboard.writeText(household.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault()
    if (!catName.trim()) return
    setSavingCat(true)
    const supabase = createClient()
    await supabase.from('categories').insert({
      household_id: householdId,
      name: catName.trim(),
      icon: catIcon,
      color: catColor,
      is_default: false,
      sort_order: 999,
    })
    setSavingCat(false)
    setCatName('')
    setCatIcon('📦')
    setCatColor('#6366f1')
    setShowCatForm(false)
    router.refresh()
  }

  async function handleDeleteCategory(id: string) {
    setDeletingCatId(id)
    const supabase = createClient()
    await supabase.from('categories').delete().eq('id', id)
    setDeletingCatId(null)
    router.refresh()
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6 max-w-2xl">
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-semibold text-white">Ajustes</h1>
        <p className="text-slate-400 text-sm mt-0.5">Gestiona tu perfil y hogar</p>
      </motion.div>

      {/* Profile */}
      <motion.div variants={itemVariants} className="glass rounded-2xl p-6">
        <h2 className="text-base font-semibold text-white mb-5">Perfil</h2>
        <div className="flex items-center gap-4 mb-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-semibold text-white">{getInitials(name || 'U')}</span>
          </div>
          <div>
            <p className="font-medium text-white">{name}</p>
            <p className="text-sm text-slate-500">{user.email}</p>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
              Nombre completo
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 transition-all text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
              Email
            </label>
            <input
              type="email"
              value={user.email}
              disabled
              className="w-full px-4 py-3 rounded-xl bg-white/3 border border-white/5 text-slate-500 text-sm cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
              Salario neto mensual
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">€</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                placeholder="0.00"
                className="w-full pl-9 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 transition-all text-sm"
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">Se usa para el reparto proporcional de gastos compartidos</p>
          </div>
          <button
            type="submit"
            disabled={savingProfile}
            className={`px-6 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ${
              profileSuccess
                ? 'bg-green-600 text-white'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-60'
            }`}
          >
            {savingProfile ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
            ) : profileSuccess ? (
              <><Check className="w-4 h-4" /> Guardado</>
            ) : (
              'Guardar perfil'
            )}
          </button>
        </form>
      </motion.div>

      {/* Household */}
      <motion.div variants={itemVariants} className="glass rounded-2xl p-6">
        <h2 className="text-base font-semibold text-white mb-5">Hogar</h2>

        {/* Invite code */}
        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 mb-5">
          <p className="text-xs text-slate-400 mb-1.5">Código de invitación</p>
          <div className="flex items-center justify-between">
            <p className="text-xl font-mono font-semibold text-white tracking-widest">
              {household.invite_code}
            </p>
            <button
              onClick={copyInviteCode}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
                copied
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-white/10 hover:bg-white/15 text-slate-300'
              }`}
            >
              {copied ? <><Check className="w-3.5 h-3.5" /> Copiado</> : <><Copy className="w-3.5 h-3.5" /> Copiar</>}
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Comparte este código con tu pareja para que se una al hogar
          </p>
        </div>

        {isAdmin && (
          <form onSubmit={handleSaveHousehold} className="space-y-4 mb-5">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
                Nombre del hogar
              </label>
              <input
                type="text"
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 transition-all text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={savingHousehold}
              className={`px-6 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ${
                householdSuccess
                  ? 'bg-green-600 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-60'
              }`}
            >
              {savingHousehold ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
              ) : householdSuccess ? (
                <><Check className="w-4 h-4" /> Guardado</>
              ) : (
                'Guardar nombre'
              )}
            </button>
          </form>
        )}

        {/* Members with salary info */}
        <div>
          <p className="text-xs font-medium text-slate-400 mb-3 uppercase tracking-wide">Miembros</p>
          <div className="space-y-3">
            {members.map((member) => {
              const memberName = member.profiles?.full_name ?? 'Usuario'
              return (
                <div key={member.user_id} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-white">{getInitials(memberName)}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">
                      {memberName}
                      {member.user_id === user.id && (
                        <span className="text-xs text-slate-500 ml-2">(tú)</span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500 capitalize">
                      {member.role}
                      {member.profiles?.net_salary ? ` · ${formatCurrency(member.profiles.net_salary)}/mes` : ''}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </motion.div>

      {/* Categories */}
      <motion.div variants={itemVariants} className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white">Categorías</h2>
          <button
            onClick={() => setShowCatForm(!showCatForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-all"
          >
            {showCatForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {showCatForm ? 'Cancelar' : 'Nueva'}
          </button>
        </div>

        {/* New category form */}
        <AnimatePresence>
          {showCatForm && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleAddCategory}
              className="overflow-hidden mb-4"
            >
              <div className="space-y-3 p-4 rounded-xl bg-white/5 border border-white/10 mb-2">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">Nombre</label>
                  <input
                    type="text"
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    required
                    placeholder="ej: Mascotas"
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">Emoji</label>
                  <div className="flex flex-wrap gap-1.5">
                    {EMOJI_PRESETS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setCatIcon(emoji)}
                        className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all ${
                          catIcon === emoji ? 'bg-indigo-500/30 ring-2 ring-indigo-500' : 'bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">Color</label>
                  <div className="flex gap-1.5">
                    {COLOR_PRESETS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setCatColor(color)}
                        className={`w-7 h-7 rounded-full transition-all ${
                          catColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-transparent scale-110' : ''
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                    style={{ backgroundColor: `${catColor}20` }}
                  >
                    {catIcon}
                  </div>
                  <span className="text-sm text-white font-medium">{catName || 'Preview'}</span>
                </div>
                <button
                  type="submit"
                  disabled={savingCat}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {savingCat ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</> : 'Crear categoría'}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center gap-2.5 p-3 rounded-xl bg-white/5 border border-white/5 group relative"
            >
              <span className="text-lg">{cat.icon ?? '📦'}</span>
              <span className="text-sm text-slate-300 truncate flex-1">{cat.name}</span>
              {!cat.is_default && (
                <button
                  onClick={() => handleDeleteCategory(cat.id)}
                  disabled={deletingCatId === cat.id}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-600 hover:text-red-400 transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Danger zone */}
      <motion.div variants={itemVariants} className="glass rounded-2xl p-6 border border-red-500/10">
        <h2 className="text-base font-semibold text-white mb-4">Sesión</h2>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-sm font-medium transition-all"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </motion.div>
    </motion.div>
  )
}
