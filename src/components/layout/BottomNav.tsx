'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  Receipt,
  PiggyBank,
  Target,
  BarChart3,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Inicio' },
  { href: '/expenses', icon: Receipt, label: 'Gastos' },
  { href: '/budgets', icon: PiggyBank, label: 'Presupuestos' },
  { href: '/goals', icon: Target, label: 'Objetivos' },
  { href: '/analytics', icon: BarChart3, label: 'Analítica' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t border-white/5 px-2 pb-safe">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all min-w-0"
            >
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-active"
                  className="absolute inset-0 bg-indigo-500/15 rounded-xl"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                />
              )}
              <item.icon
                className={`relative transition-colors ${
                  isActive ? 'text-indigo-400' : 'text-slate-500'
                }`}
                style={{ width: 20, height: 20 }}
              />
              <span
                className={`relative text-[10px] font-medium transition-colors ${
                  isActive ? 'text-indigo-400' : 'text-slate-600'
                }`}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
