import type { VercelRequest, VercelResponse } from '@vercel/node';
import { serialize } from 'cookie';
import { generateCodeVerifier, generateCodeChallenge } from '../lib/pkce.js';
import { X_OAUTH_SCOPES, STATE_COOKIE_NAME, CODE_VERIFIER_COOKIE_NAME } from '../lib/constants.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { X_CLIENT_ID, APP_URL } = process.env;

  if (!X_CLIENT_ID || !APP_URL) {
    return res.status(500).json({ error: 'Server configuration error.' });
  }

  const state = Math.random().toString(36).substring(7);
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  
  const redirectUri = `${APP_URL}/api/callback`;
  const scope = X_OAUTH_SCOPES.join(' ');

  const authUrl = new URL('https://twitter.com/i/oauth2/authorize');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', X_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', scope);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  // Store state and verifier in cookies
  res.setHeader('Set-Cookie', [
    serialize(STATE_COOKIE_NAME, state, { httpOnly: true, path: '/', maxAge: 300 }),
    serialize(CODE_VERIFIER_COOKIE_NAME, codeVerifier, { httpOnly: true, path: '/', maxAge: 300 }),
  ]);

  res.redirect(302, authUrl.toString());
}
