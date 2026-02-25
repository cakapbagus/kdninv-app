import { format } from 'date-fns'
import { id } from 'date-fns/locale'

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

export function generateSignature(username: string): string {
  const now = new Date()
  const timestamp = format(now, 'dd/MM/yyyy HH:mm:ss')
  return `${username} | ${timestamp}`
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'pending': return 'text-amber-400 bg-amber-400/10 border-amber-400/20'
    case 'approved': return 'text-blue-400 bg-blue-400/10 border-blue-400/20'
    case 'rejected': return 'text-red-400 bg-red-400/10 border-red-400/20'
    case 'finished': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
    default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20'
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'pending': return 'Menunggu'
    case 'approved': return 'Disetujui'
    case 'rejected': return 'Ditolak'
    case 'finished': return 'Selesai'
    default: return status
  }
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
