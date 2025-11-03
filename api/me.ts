
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSessionCookie } from '../lib/session';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const session = getSessionCookie(req);

  if (!session) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // You could add logic here to refresh the token if it's expired

  res.status(200).json(session.user);
}
