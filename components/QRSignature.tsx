'use client'

import { useEffect, useRef } from 'react'

interface QRSignatureProps {
  value: string
  label: string
  size?: number
}

export default function QRSignature({ value, label, size = 100 }: QRSignatureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current || !value) return
    const generateQR = async () => {
      try {
        const QRCode = (await import('qrcode')).default
        await QRCode.toCanvas(canvasRef.current!, value, {
          width: size,
          margin: 1,
          color: { dark: '#241d09', light: '#f7f9fc' },
        })
      } catch (err) { console.error('QR error:', err) }
    }
    generateQR()
  }, [value, size])

  if (!value) {
    return (
      <div className="flex items-center justify-center rounded-xl"
        style={{ width: size, height: size, background: 'var(--surface-soft)', border: '1px solid var(--border)', borderStyle: 'dashed' }}>
        <span className="text-center px-2" style={{ color: 'var(--text-4)', fontSize: '0.65rem', lineHeight: 1.4 }}>
          Belum<br/>ditandatangani
        </span>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <canvas ref={canvasRef} className="rounded-lg" style={{ border: '1px solid var(--border)' }} />
      {label && (
        <p className="text-center break-all leading-tight"
          style={{ color: 'var(--text-4)', fontSize: '0.65rem', maxWidth: size + 20 }}>
          {label}
        </p>
      )}
    </div>
  )
}
