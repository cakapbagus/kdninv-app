import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { uploadToCloudinary } from '@/lib/cloudinary'

// Note: In Next.js 15 App Router, bodyParser config is not needed —
// formData() is natively supported. Remove old pages-style `export const config`.

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 })

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Ukuran file maksimal 5 MB' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const result = await uploadToCloudinary(buffer, file.name, `kdninv/${session.sub}`)

    return NextResponse.json({
      url: result.url,
      public_id: result.public_id,
      original_filename: file.name,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upload gagal'
    console.error('Upload error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
