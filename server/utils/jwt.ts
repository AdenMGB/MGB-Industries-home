import { SignJWT, jwtVerify } from 'jose'
import type { JWTPayload } from '../types/index.js'

const JWT_SECRET =
  process.env.JWT_SECRET ||
  'default-secret-change-in-production-' + Math.random().toString(36)

const secret = new TextEncoder().encode(JWT_SECRET)
const JWT_EXPIRATION = '7d'

export async function signJWT(payload: JWTPayload): Promise<string> {
  const jwt = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRATION)
    .sign(secret)

  return jwt
}

export async function verifyJWT(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, secret)
  return payload as JWTPayload
}
