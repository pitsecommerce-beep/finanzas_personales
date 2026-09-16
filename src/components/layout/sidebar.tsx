'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  CreditCard,
  ArrowDownCircle,
  ArrowUpCircle,
  Pin,
  HandCoins,
  BarChart3,
  MessageCircle,
  Calendar,
  Settings,
  LogOut,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useProfileContext } from '@/lib/context/profile-context'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

const links = [
  { href: '/inicio', label: 'Inicio', icon: Home },
  { href: '/tarjetas', label: 'Tarjetas', icon: CreditCard },
  { href: '/gastos', label: 'Gastos', icon: ArrowDownCircle },
  { href: '/ingresos', label: 'Ingresos', icon: ArrowUpCircle },
  { href: '/gastos-fijos', label: 'Gastos fijos', icon: Pin },
  { href: '/cuentas', label: 'Cuentas', icon: HandCoins },
  { href: '/reportes', label: 'Reportes', icon: BarChart3 },
  { href: '/asesor', label: 'Asesor IA', icon: MessageCircle },
  { href: '/calendario', label: 'Calendario', icon: Calendar, badge: 'Pronto' },
  { href: '/configuracion', label: 'Configuración', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { firstName } = useProfileContext()
  const [showLogout, setShowLogout] = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-primary text-white min-h-screen">
      <div className="p-6">
        <div className="flex items-center gap-2">
          <img src="/favicon_nummo.png" alt="Nummo" className="h-8 w-8 rounded-lg" />
          <h1 className="text-xl font-bold text-accent">Nummo</h1>
        </div>
        {firstName ? (
          <p className="text-xs text-gray-400 mt-1">Hola, {firstName}</p>
        ) : (
          <p className="text-xs text-gray-400 mt-1">Control financiero inteligente</p>
        )}
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {links.map((link) => {
          const isActive = pathname.startsWith(link.href)
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-accent/20 text-accent font-medium'
                  : 'text-gray-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <link.icon size={18} />
              <span>{link.label}</span>
              {link.badge && (
                <span className="ml-auto text-[10px] bg-accent/20 text-accent px-1.5 py-0.5 rounded-full">
                  {link.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-white/10">
        <button
          onClick={() => setShowLogout(true)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors w-full"
        >
          <LogOut size={18} />
          <span>Cerrar sesión</span>
        </button>
      </div>

      <ConfirmDialog
        open={showLogout}
        title="Cerrar sesión"
        message="¿Seguro que deseas cerrar tu sesión?"
        confirmLabel="Cerrar sesión"
        variant="warning"
        onConfirm={handleLogout}
        onCancel={() => setShowLogout(false)}
      />
    </aside>
  )
}
