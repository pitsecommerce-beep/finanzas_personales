import Link from 'next/link'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CreditCard, BarChart3, MessageCircle, Shield } from 'lucide-react'

export default async function LandingPage() {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) redirect('/inicio')
    } catch {
      console.warn('[FinanzApp] No se pudo verificar sesión en landing')
    }
  }

  return (
    <div className="min-h-screen bg-primary text-white">
      <header className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 gap-3 max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-accent">FinanzApp</h1>
        <div className="flex gap-3">
          <Link
            href="/login"
            className="px-4 py-2 text-sm rounded-lg border border-white/20 hover:bg-white/5 transition"
          >
            Iniciar sesion
          </Link>
          <Link
            href="/registro"
            className="px-4 py-2 text-sm rounded-lg bg-accent text-white hover:bg-accent-hover transition"
          >
            Crear cuenta
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center max-w-2xl mx-auto mb-20">
          <h2 className="text-4xl sm:text-5xl font-bold leading-tight mb-6">
            Toma el control de tus <span className="text-accent">finanzas personales</span>
          </h2>
          <p className="text-lg text-gray-400 mb-8">
            Registra gastos, administra tus tarjetas, rastrea pagos diferidos y recibe
            recomendaciones inteligentes con IA.
          </p>
          <Link
            href="/registro"
            className="inline-block px-8 py-3 bg-accent text-white rounded-xl text-lg font-medium hover:bg-accent-hover transition"
          >
            Comenzar gratis
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: CreditCard,
              title: 'Tarjetas',
              desc: 'Gestiona tus tarjetas de crédito y débito con fechas de corte y pago.',
            },
            {
              icon: BarChart3,
              title: 'Dashboard',
              desc: 'Visualiza tus gastos por categoría, ahorros y tendencias mensuales.',
            },
            {
              icon: MessageCircle,
              title: 'Asesor IA',
              desc: 'Recibe consejos financieros personalizados basados en tus datos.',
            },
            {
              icon: Shield,
              title: 'Seguro',
              desc: 'Tus datos están protegidos con cifrado y políticas de acceso estrictas.',
            },
          ].map((feature) => (
            <div key={feature.title} className="bg-secondary rounded-xl p-6">
              <feature.icon size={28} className="text-accent mb-3" />
              <h3 className="font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-400">{feature.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
