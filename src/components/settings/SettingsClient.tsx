'use client'

import { containerVariants, itemVariants } from '@/lib/motion'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { User } from '@supabase/supabase-js'
import { Loader2, Copy, Check, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Category } from '@/lib/database.types'
import { getInitials } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface Member {
  user_id: string
  role: string
  profiles: { id: string; full_name: string; avatar_url: string | null } | null
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


export default function SettingsClient({ user, profile, household, householdId, isAdmin, members, categories }: Props) {
  const router = useRouter()
  const [name, setName] = useState(profile?.full_name ?? '')
  const [householdName, setHouseholdName] = useState(household.name)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingHousehold, setSavingHousehold] = useState(false)
  const [copied, setCopied] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState(false)
  const [householdSuccess, setHouseholdSuccess] = useState(false)

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSavingProfile(true)
    const supabase = createClient()
    await supabase.from('profiles').update({ full_name: name }).eq('id', user.id)
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

        {/* Members */}
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
                    <p className="text-xs text-slate-500 capitalize">{member.role}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </motion.div>

      {/* Categories */}
      <motion.div variants={itemVariants} className="glass rounded-2xl p-6">
        <h2 className="text-base font-semibold text-white mb-4">Categorías</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center gap-2.5 p-3 rounded-xl bg-white/5 border border-white/5"
            >
              <span className="text-lg">{cat.icon ?? '📦'}</span>
              <span className="text-sm text-slate-300 truncate">{cat.name}</span>
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
