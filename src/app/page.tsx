import Link from 'next/link'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  CreditCard,
  BarChart3,
  MessageCircle,
  Shield,
  PiggyBank,
  ArrowLeftRight,
  TrendingUp,
  Wallet,
  Bell,
  FileSpreadsheet,
} from 'lucide-react'

export default async function LandingPage() {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) redirect('/inicio')
    } catch {
      console.warn('[Nummo] No se pudo verificar sesión en landing')
    }
  }

  const features = [
    {
      icon: CreditCard,
      title: 'Tarjetas',
      desc: 'Gestiona crédito, débito, ahorro, efectivo y vales de despensa en un solo lugar.',
    },
    {
      icon: BarChart3,
      title: 'Dashboard',
      desc: 'Visualiza gastos por categoría, liquidez disponible y tendencias mensuales.',
    },
    {
      icon: MessageCircle,
      title: 'Asesor IA',
      desc: 'Recibe consejos financieros personalizados basados en tus datos reales.',
    },
    {
      icon: Shield,
      title: 'Seguro',
      desc: 'Tus datos están protegidos con cifrado y políticas de acceso estrictas.',
    },
  ]

  const highlights = [
    {
      icon: PiggyBank,
      title: 'Metas de ahorro',
      desc: 'Define cuánto ahorrar cada mes y Nummo te avisa si gastas ese dinero.',
    },
    {
      icon: ArrowLeftRight,
      title: 'Traspasos',
      desc: 'Mueve dinero entre cuentas y registra pagos a tarjetas de crédito.',
    },
    {
      icon: TrendingUp,
      title: 'Rendimientos',
      desc: 'Calcula rendimientos de cuentas de ahorro con tasa dual (límite regulatorio de $25,000).',
    },
    {
      icon: Wallet,
      title: 'Gastos fijos',
      desc: 'Controla MSI y suscripciones mensuales con fechas de inicio y fin.',
    },
    {
      icon: Bell,
      title: 'Alertas de pago',
      desc: 'Recibe recordatorios cuando se acercan los pagos de tus tarjetas.',
    },
    {
      icon: FileSpreadsheet,
      title: 'Estado de resultados',
      desc: 'Genera tu P&L por mes, semestre o año y descárgalo en Excel.',
    },
  ]

  return (
    <div className="min-h-screen bg-primary text-white flex flex-col">
      <header className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 gap-3 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <img src="/favicon_nummo.png" alt="Nummo" className="h-12 w-12 rounded-xl" />
          <h1 className="text-3xl font-bold text-accent">Nummo</h1>
        </div>
        <div className="flex gap-3">
          <Link
            href="/login"
            className="px-4 py-2 text-sm rounded-lg border border-white/20 hover:bg-white/5 transition"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/registro"
            className="px-4 py-2 text-sm rounded-lg bg-accent text-white hover:bg-accent-hover transition"
          >
            Crear cuenta
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto px-6">
        <section className="py-20 text-center max-w-2xl mx-auto">
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
        </section>

        <section className="py-12">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f) => (
              <div key={f.title} className="bg-secondary rounded-xl p-6">
                <f.icon size={28} className="text-accent mb-3" />
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-gray-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="py-16">
          <h2 className="text-2xl font-bold text-center mb-3">¿Qué es Nummo?</h2>
          <p className="text-center text-gray-400 max-w-xl mx-auto mb-12">
            Nummo es tu asistente financiero personal. Centraliza tus cuentas, controla tus
            gastos y toma mejores decisiones con datos claros y un asesor con inteligencia artificial.
          </p>

          <div className="bg-secondary rounded-2xl border border-white/10 p-8 mb-12">
            <div className="aspect-video bg-white/5 rounded-xl flex items-center justify-center border border-dashed border-white/20">
              <div className="text-center text-gray-500">
                <BarChart3 size={48} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">Vista previa del dashboard</p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-12">
          <h2 className="text-2xl font-bold text-center mb-10">Todo lo que necesitas</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {highlights.map((h) => (
              <div key={h.title} className="bg-secondary rounded-xl p-5 border border-white/5">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-3">
                  <h.icon size={20} className="text-accent" />
                </div>
                <h3 className="font-semibold text-sm mb-1">{h.title}</h3>
                <p className="text-xs text-gray-400">{h.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="py-16">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-secondary rounded-2xl border border-white/10 p-6">
              <div className="aspect-[4/3] bg-white/5 rounded-xl flex items-center justify-center border border-dashed border-white/20">
                <div className="text-center text-gray-500">
                  <CreditCard size={40} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Vista de tarjetas</p>
                </div>
              </div>
            </div>
            <div className="bg-secondary rounded-2xl border border-white/10 p-6">
              <div className="aspect-[4/3] bg-white/5 rounded-xl flex items-center justify-center border border-dashed border-white/20">
                <div className="text-center text-gray-500">
                  <MessageCircle size={40} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Asesor inteligente</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 text-center">
          <h2 className="text-3xl font-bold mb-4">Empieza a controlar tu dinero</h2>
          <p className="text-gray-400 mb-8">Sin costo, sin tarjeta de crédito, sin complicaciones.</p>
          <Link
            href="/registro"
            className="inline-block px-8 py-3 bg-accent text-white rounded-xl text-lg font-medium hover:bg-accent-hover transition"
          >
            Crear cuenta gratis
          </Link>
        </section>
      </main>

      <footer className="border-t border-white/10 mt-auto">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500">My Nummo by Orkesta Labs</p>
            <nav className="flex gap-6 text-sm text-gray-400">
              <Link href="/aviso-privacidad" className="hover:text-white transition">Aviso de privacidad</Link>
              <Link href="/terminos" className="hover:text-white transition">Términos y condiciones</Link>
              <Link href="/contacto" className="hover:text-white transition">Contacto</Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  )
}
