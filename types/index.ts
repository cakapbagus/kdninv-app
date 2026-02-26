export type Role = 'user' | 'admin' | 'manager'
export type Status = 'pending' | 'approved' | 'rejected' | 'finished'

export interface Profile {
  id: number
  username: string
  full_name: string | null
  role: Role
  created_at: string
  updated_at: string
}

export interface FileAttachment {
  url: string
  public_id: string
  name: string
}

export interface PengajuanItem {
  nama_barang: string
  jumlah: number
  satuan: string
  harga: number
  total: number
}

export interface Pengajuan {
  id: string
  no_nota: string
  tanggal: string
  divisi: string | null
  rekening_sumber: string | null
  bank_sumber: string | null
  nama_sumber: string | null
  rekening_penerima: string | null
  bank_penerima: string | null
  nama_penerima: string | null
  items: PengajuanItem[]
  grand_total: number
  grand_total_terbilang: string | null
  file_url: string | null
  file_public_id: string | null
  file_name: string | null
  files: FileAttachment[] | null
  status: Status
  submitted_by: number
  submitted_by_username: string
  submitted_at: string
  signature_user: string | null
  signature_manager: string | null
  signature_admin_finish: string | null
  approved_at: string | null
  approved_by: number | null
  approved_by_username: string | null
  rejected_at: string | null
  rejected_by: number | null
  rejected_by_username: string | null
  rejection_reason: string | null
  finished_at: string | null
  finished_by: number | null
  finished_by_username: string | null
  keterangan: string | null
  created_at: string
  updated_at: string
}

// JWT payload stored in cookie
export interface JWTPayload {
  sub: string       // user id
  username: string
  role: Role
}
