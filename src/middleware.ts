import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const isConfigured = !!(supabaseUrl && supabaseKey && supabaseUrl !== 'your_supabase_url')

export async function middleware(request: NextRequest) {
  if (!isConfigured) {
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    console.warn('[Nummo] No se pudo verificar la sesión del usuario')
  }

  const isAuthPage = (request.nextUrl.pathname.startsWith('/login') ||
                     request.nextUrl.pathname.startsWith('/registro')) &&
                     !request.nextUrl.pathname.startsWith('/onboarding')
  const isDashboardPage = request.nextUrl.pathname.startsWith('/inicio') ||
                          request.nextUrl.pathname.startsWith('/tarjetas') ||
                          request.nextUrl.pathname.startsWith('/gastos') ||
                          request.nextUrl.pathname.startsWith('/ingresos') ||
                          request.nextUrl.pathname.startsWith('/reportes') ||
                          request.nextUrl.pathname.startsWith('/asesor') ||
                          request.nextUrl.pathname.startsWith('/configuracion') ||
                          request.nextUrl.pathname.startsWith('/calendario') ||
                          request.nextUrl.pathname.startsWith('/cuentas')

  if (!user && isDashboardPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/inicio'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
