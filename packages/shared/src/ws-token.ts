import { SignJWT, jwtVerify } from 'jose';
import { WS_TOKEN_TTL_SECONDS, type WsTokenPayload } from './ws-jwt.js';
import { getWsJwtSecret } from './env.js';

function secretKey(): Uint8Array | null {
  const secret = getWsJwtSecret() ?? process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) return null;
  return new TextEncoder().encode(secret);
}

export async function signWsToken(userId: string, username: string): Promise<string | null> {
  const key = secretKey();
  if (!key) return null;
  return new SignJWT({ username })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${WS_TOKEN_TTL_SECONDS}s`)
    .sign(key);
}

export async function verifyWsToken(token: string): Promise<WsTokenPayload | null> {
  const key = secretKey();
  if (!key) return null;
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] });
    const sub = payload.sub;
    const username = payload.username;
    if (typeof sub !== 'string' || typeof username !== 'string') return null;
    return {
      sub,
      username,
      iat: typeof payload.iat === 'number' ? payload.iat : 0,
      exp: typeof payload.exp === 'number' ? payload.exp : 0,
    };
  } catch {
    return null;
  }
}
