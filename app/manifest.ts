import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'KDNINV – Sistem Pengajuan Nota',
    short_name: 'KDNINV',
    description: 'Sistem manajemen pengajuan nota Kodein',
    start_url: '/login',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#4144e9',
    icons: [
      {
        src: '/icons/web-app-manifest-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/web-app-manifest-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    screenshots: [
      {
        src: '/icons/screenshot-wide.png',
        sizes: '1280x720',
        type: 'image/png',
        form_factor: 'wide',
      },
      {
        src: '/icons/screenshot-narrow.png',
        sizes: '375x667',
        type: 'image/png',
        form_factor: 'narrow',
      },
    ],
  }
}