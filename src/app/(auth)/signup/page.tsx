'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Loader2, Wallet, Home, Users } from 'lucide-react'

type Step = 'account' | 'household'

export default function SignupPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('account')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [householdAction, setHouseholdAction] = useState<'create' | 'join'>('create')
  const [householdName, setHouseholdName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleAccountStep(e: React.FormEvent) {
    e.preventDefault()
    setStep('household')
  }

  async function handleHouseholdStep(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()

    // Sign up
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })

    if (authError || !authData.user) {
      setError(authError?.message || 'Error al crear la cuenta')
      setLoading(false)
      return
    }

    // Wait a moment for profile trigger to execute
    await new Promise((r) => setTimeout(r, 800))

    if (householdAction === 'create') {
      const { error: householdError } = await supabase
        .from('households')
        .insert({ name: householdName, created_by: authData.user.id })

      if (householdError) {
        setError('Error al crear el hogar')
        setLoading(false)
        return
      }
    } else {
      // Join by invite code
      const { data: household, error: findError } = await supabase
        .from('households')
        .select('id')
        .eq('invite_code', inviteCode.trim().toLowerCase())
        .single()

      if (findError || !household) {
        setError('Código de invitación no válido')
        setLoading(false)
        return
      }

      const { error: joinError } = await supabase
        .from('household_members')
        .insert({ household_id: household.id, user_id: authData.user.id, role: 'member' })

      if (joinError) {
        setError('Error al unirse al hogar')
        setLoading(false)
        return
      }
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 mb-4">
            <Wallet className="w-7 h-7 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-semibold text-white">FinanceBoard</h1>
          <p className="text-slate-400 text-sm mt-1">
            {step === 'account' ? 'Crea tu cuenta' : 'Configura tu hogar'}
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          <div className="flex-1 h-1 rounded-full bg-indigo-500" />
          <div className={`flex-1 h-1 rounded-full transition-colors ${step === 'household' ? 'bg-indigo-500' : 'bg-white/10'}`} />
        </div>

        <AnimatePresence mode="wait">
          {step === 'account' ? (
            <motion.div
              key="account"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="glass rounded-2xl p-6">
                <form onSubmit={handleAccountStep} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Nombre completo</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      placeholder="Andreu García"
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 transition-all text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="tu@email.com"
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 transition-all text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Contraseña</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        placeholder="Mínimo 6 caracteres"
                        className="w-full px-4 py-3 pr-11 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 transition-all text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all mt-2"
                  >
                    Continuar
                  </button>
                </form>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="household"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="glass rounded-2xl p-6">
                {/* Toggle */}
                <div className="flex rounded-xl bg-white/5 p-1 mb-5">
                  <button
                    type="button"
                    onClick={() => setHouseholdAction('create')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                      householdAction === 'create'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    <Home className="w-3.5 h-3.5" />
                    Crear hogar
                  </button>
                  <button
                    type="button"
                    onClick={() => setHouseholdAction('join')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                      householdAction === 'join'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    Unirse
                  </button>
                </div>

                <form onSubmit={handleHouseholdStep} className="space-y-4">
                  {householdAction === 'create' ? (
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">
                        Nombre del hogar
                      </label>
                      <input
                        type="text"
                        value={householdName}
                        onChange={(e) => setHouseholdName(e.target.value)}
                        required
                        placeholder="Andreu & María"
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 transition-all text-sm"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">
                        Código de invitación
                      </label>
                      <input
                        type="text"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value)}
                        required
                        placeholder="ej: a3f8c2"
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 transition-all text-sm font-mono"
                      />
                      <p className="text-xs text-slate-500 mt-1.5">
                        Pídele el código a quien creó el hogar
                      </p>
                    </div>
                  )}

                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
                    >
                      {error}
                    </motion.p>
                  )}

                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setStep('account')}
                      className="flex-1 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-medium text-sm transition-all border border-white/10"
                    >
                      Atrás
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Creando...</>
                      ) : (
                        'Empezar'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-center text-slate-500 text-sm mt-6">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-indigo-400 hover:text-indigo-300 transition-colors">
            Entrar
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
