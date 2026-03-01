import { NextResponse } from 'next/server'
import { cookieName } from '@/lib/auth'

export async function POST() {
  const response = NextResponse.json({ success: true })
  response.cookies.delete(cookieName())
  return response
}
