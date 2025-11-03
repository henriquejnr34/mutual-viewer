
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { clearSessionCookie } from '../lib/session';

export default function handler(req: VercelRequest, res: VercelResponse) {
  clearSessionCookie(res);
  res.redirect(302, '/');
}
