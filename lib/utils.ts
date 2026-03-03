import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { MAX_UPLOAD_SIZE } from '@/lib/constants'

export function compressImage (file: File, maxSize = MAX_UPLOAD_SIZE, defQuality = 0.9): Promise<File> {
    return new Promise((resolve) => {
      if (file.type === 'application/pdf') { resolve(file); return }
      const img = new window.Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        let { width, height } = img
        const MAX_DIM = 1920
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) { height = Math.round(height * MAX_DIM / width); width = MAX_DIM }
          else                { width = Math.round(width * MAX_DIM / height); height = MAX_DIM }
        }
        const canvas = document.createElement('canvas')
        canvas.width  = width
        canvas.height = height
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
        const tryCompress = (quality: number) => {
          canvas.toBlob(blob => {
            if (!blob) { resolve(file); return }
            if (blob.size <= maxSize || quality <= 0.3) {
              resolve(new File([blob], file.name.replace(/\.[^/.]+$/, '.webp'), { type: 'image/webp', lastModified: Date.now() }))
            } else { tryCompress(Math.round((quality - 0.1) * 10) / 10) }
          }, 'image/webp', quality)
        }
        tryCompress(defQuality)
      }

      img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
      img.src = url
    })
  }

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(dateString: string): string {
  try {
    return format(new Date(dateString), 'dd MMMM yyyy', { locale: id })
  } catch {
    return dateString
  }
}

export function formatDateTime(dateString: string): string {
  try {
    return format(new Date(dateString), 'dd MMMM yyyy, HH:mm:ss', { locale: id })
  } catch {
    return dateString
  }
}

export function formatTime(dateString: string): string {
  try {
    return format(new Date(dateString), 'HH:mm:ss', { locale: id })
  } catch {
    return dateString
  }
}

export function generateSignature(username: string): string {
  const now = new Date()
  const timestamp = format(now, 'dd/MM/yyyy HH:mm:ss')
  return `${username} | ${timestamp}`
}

// Terbilang: convert number to Indonesian words
const satuan = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan',
  'sepuluh', 'sebelas', 'dua belas', 'tiga belas', 'empat belas', 'lima belas', 'enam belas',
  'tujuh belas', 'delapan belas', 'sembilan belas']

function terbilangRatusan(n: number): string {
  if (n === 0) return ''
  if (n < 20) return satuan[n]
  if (n < 100) {
    const puluhan = Math.floor(n / 10)
    const sisa = n % 10
    return (puluhan === 1 ? 'sepuluh' : satuan[puluhan] + ' puluh') + (sisa ? ' ' + satuan[sisa] : '')
  }
  const ratus = Math.floor(n / 100)
  const sisa = n % 100
  return (ratus === 1 ? 'seratus' : satuan[ratus] + ' ratus') + (sisa ? ' ' + terbilangRatusan(sisa) : '')
}

export function angkaTerbilang(n: number): string {
  if (n === 0) return 'nol rupiah'
  if (n < 0) return 'minus ' + angkaTerbilang(-n)

  const parts: string[] = []
  const triliun = Math.floor(n / 1_000_000_000_000)
  const miliar = Math.floor((n % 1_000_000_000_000) / 1_000_000_000)
  const juta = Math.floor((n % 1_000_000_000) / 1_000_000)
  const ribu = Math.floor((n % 1_000_000) / 1_000)
  const sisa = n % 1_000

  if (triliun) parts.push(terbilangRatusan(triliun) + ' triliun')
  if (miliar) parts.push(terbilangRatusan(miliar) + ' miliar')
  if (juta) parts.push(terbilangRatusan(juta) + ' juta')
  if (ribu) parts.push((ribu === 1 ? 'seribu' : terbilangRatusan(ribu) + ' ribu'))
  if (sisa) parts.push(terbilangRatusan(sisa))

  return parts.join(' ') + ' rupiah'
}
