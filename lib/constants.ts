export const MAX_UPLOAD_SIZE = 2 * 1024 * 1024  // 2MB
export const LIMIT_UPLOAD = 3
export const ACCENT = '#4144e9'
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/jpg',
  'image/webp',
  'image/gif',
  'application/pdf',
]
export const STATUS_LABELS : Record<string, string> = {
  pending: 'Menunggu',
  approved: 'Disetujui',
  rejected: 'Ditolak',
  finished: 'Selesai'
}
