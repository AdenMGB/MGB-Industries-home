import { SignJWT, jwtVerify } from 'jose'
import type { JWTPayload } from '../types/index.js'

const DEV_SECRET = 'dev-secret-local-only-do-not-use-in-production'
const JWT_SECRET = process.env.JWT_SECRET || DEV_SECRET

if (process.env.NODE_ENV === 'production' && JWT_SECRET === DEV_SECRET) {
  console.warn(
    'WARNING: JWT_SECRET not set. Using insecure default. Set JWT_SECRET in production!',
  )
}

const secret = new TextEncoder().encode(JWT_SECRET)
const JWT_EXPIRATION = '7d'

export async function signJWT(payload: JWTPayload): Promise<string> {
  const jwt = await new SignJWT({ ...payload } as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRATION)
    .sign(secret)

  return jwt
}

export async function verifyJWT(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, secret)
  return payload as unknown as JWTPayload
}
