import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Nummo - Control de Finanzas Personales',
    short_name: 'Nummo',
    description: 'Gestiona tus finanzas personales, tarjetas, gastos e ingresos de forma inteligente.',
    start_url: '/inicio',
    display: 'standalone',
    background_color: '#0F172A',
    theme_color: '#0F172A',
    icons: [
      {
        src: '/favicon_nummo.png',
        sizes: '741x741',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/favicon_nummo.png',
        sizes: '741x741',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
