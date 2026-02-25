import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { sql } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const year = new Date().getFullYear()
  const rows = await sql`SELECT counter FROM nota_counter WHERE year = ${year}`
  const nextNum = (rows[0]?.counter || 0) + 1
  const noNota = `${String(nextNum).padStart(3, '0')}/KDNINV/${year}`
  return NextResponse.json({ no_nota: noNota })
}
