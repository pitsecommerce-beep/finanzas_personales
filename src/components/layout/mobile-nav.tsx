'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, CreditCard, ArrowDownCircle, PiggyBank, BarChart3, Settings } from 'lucide-react'

const tabs = [
  { href: '/inicio', label: 'Inicio', icon: Home },
  { href: '/tarjetas', label: 'Tarjetas', icon: CreditCard },
  { href: '/gastos', label: 'Gastos', icon: ArrowDownCircle },
  { href: '/ahorro', label: 'Ahorro', icon: PiggyBank },
  { href: '/reportes', label: 'Reportes', icon: BarChart3 },
  { href: '/configuracion', label: 'Más', icon: Settings },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border z-40 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around py-2">
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 text-[11px] ${
                isActive ? 'text-accent font-medium' : 'text-muted'
              }`}
            >
              <tab.icon size={20} />
              <span>{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
