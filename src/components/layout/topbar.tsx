'use client'

import { useState } from 'react'
import { Menu, X, LogOut } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

const links = [
  { href: '/inicio', label: 'Inicio' },
  { href: '/tarjetas', label: 'Tarjetas' },
  { href: '/gastos', label: 'Gastos' },
  { href: '/ingresos', label: 'Ingresos' },
  { href: '/gastos-fijos', label: 'Gastos fijos' },
  { href: '/cuentas', label: 'Cuentas' },
  { href: '/reportes', label: 'Reportes' },
  { href: '/asesor', label: 'Asesor IA' },
  { href: '/configuracion', label: 'Configuración' },
]

export function Topbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [showLogout, setShowLogout] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="lg:hidden bg-primary text-white">
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <div className="flex items-center gap-2">
            <img src="/favicon_nummo.png" alt="Nummo" className="h-7 w-7 rounded-md" />
            <h1 className="text-lg font-bold text-accent">Nummo</h1>
          </div>
          <p className="text-[10px] text-gray-400 -mt-0.5">Control financiero inteligente</p>
        </div>
        <button onClick={() => setMenuOpen(!menuOpen)} className="p-1">
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {menuOpen && (
        <nav className="px-4 pb-4 space-y-1 border-t border-white/10 pt-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm ${
                pathname.startsWith(link.href)
                  ? 'bg-accent/20 text-accent font-medium'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <button
            onClick={() => setShowLogout(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white w-full"
          >
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </nav>
      )}

      <ConfirmDialog
        open={showLogout}
        title="Cerrar sesión"
        message="¿Seguro que deseas cerrar tu sesión?"
        confirmLabel="Cerrar sesión"
        variant="warning"
        onConfirm={handleLogout}
        onCancel={() => setShowLogout(false)}
      />
    </header>
  )
}
