import type { Metadata, Viewport } from 'next'
import { Toaster } from 'react-hot-toast'
import { Poppins } from 'next/font/google'
import RegisterSW from '@/components/RegisterSW'
import './globals.css'

export const viewport: Viewport = {
  themeColor: '#4144e9',
};

export const metadata: Metadata = {
  title: 'KDNINV - Sistem Pengajuan Nota',
  description: 'Sistem manajemen pengajuan nota Kodein',
  applicationName: 'KDNINV',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'KDNINV',
  },
  icons: {
    apple: '/apple-icon.png',
  },
}

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning className={poppins.variable}>
      <body className="font-sans">
          <RegisterSW />
          {children}
          <Toaster
            position="bottom-center"
            containerStyle={{
              bottom: 'calc(70px + env(safe-area-inset-bottom))',
            }}
            toastOptions={{
              style: { borderRadius: '10px', fontSize: '12px', fontWeight: 500 },
              duration: 1500,
            }}
          />
      </body>
    </html>
  )
}
