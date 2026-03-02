import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import type { JWTPayload, Role } from '@/types'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'kdninv-super-secret-jwt-key-change-in-production'
)

const COOKIE_NAME = 'kdninv_session'

export const SESSION_REMEMBER  = 60 * 60 * 24 * 30  // 30 hari (detik)
export const SESSION_DEFAULT   = 60 * 60 * 8        // 8 jam (detik)

export async function signToken(payload: JWTPayload, expiresIn = '24h'): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(expiresIn)
    .setIssuedAt()
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return {
      sub:      payload['sub']      as string,
      username: payload['username'] as string,
      role:     payload['role']     as Role,
    }
  } catch {
    return null
  }
}

// cookies() returns a Promise in Next.js 15 — must be awaited
export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyToken(token)
}

export function cookieName(): string {
  return COOKIE_NAME
}