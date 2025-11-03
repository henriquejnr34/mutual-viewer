
import { serialize, parse } from 'cookie';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { SESSION_COOKIE_NAME } from './constants';

export interface SessionData {
  accessToken: string;
  refreshToken?: string;
  scope: string;
  expiresAt: number; // Store as Unix timestamp (seconds)
  user: {
    id: string;
    name: string;
    username: string;
    profileImageUrl: string;
  }
}

const MAX_AGE = 60 * 60 * 8; // 8 hours

export function setSessionCookie(res: VercelResponse, session: SessionData) {
  const cookie = serialize(SESSION_COOKIE_NAME, JSON.stringify(session), {
    maxAge: MAX_AGE,
    expires: new Date(Date.now() + MAX_AGE * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    sameSite: 'lax',
  });
  res.setHeader('Set-Cookie', cookie);
}

export function getSessionCookie(req: VercelRequest): SessionData | null {
  const cookies = parse(req.headers.cookie || '');
  const sessionStr = cookies[SESSION_COOKIE_NAME];
  if (!sessionStr) {
    return null;
  }
  try {
    return JSON.parse(sessionStr);
  } catch (e) {
    return null;
  }
}

export function clearSessionCookie(res: VercelResponse) {
  const cookie = serialize(SESSION_COOKIE_NAME, '', {
    maxAge: -1,
    path: '/',
  });
  res.setHeader('Set-Cookie', cookie);
}
