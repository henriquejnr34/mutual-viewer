import type { VercelRequest, VercelResponse } from '@vercel/node';
import { parse, serialize } from 'cookie';
import { STATE_COOKIE_NAME, CODE_VERIFIER_COOKIE_NAME, SESSION_COOKIE_NAME, SESSION_MAX_AGE } from '../lib/constants.js';
import { SessionData } from '../lib/session.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { X_CLIENT_ID, X_CLIENT_SECRET, APP_URL } = process.env;

  if (!X_CLIENT_ID || !X_CLIENT_SECRET || !APP_URL) {
    return res.status(500).json({ error: 'Server configuration error.' });
  }

  const { code, state } = req.query;
  const cookies = parse(req.headers.cookie || '');
  const savedState = cookies[STATE_COOKIE_NAME];
  const codeVerifier = cookies[CODE_VERIFIER_COOKIE_NAME];
  
  if (!code || !state || !savedState || !codeVerifier || state !== savedState) {
    return res.status(400).send('Invalid request or state mismatch.');
  }

  try {
    const redirectUri = `${APP_URL}/api/callback`;
    const tokenUrl = 'https://api.twitter.com/2/oauth2/token';
    
    const params = new URLSearchParams();
    params.append('code', code as string);
    params.append('grant_type', 'authorization_code');
    params.append('client_id', X_CLIENT_ID);
    params.append('redirect_uri', redirectUri);
    params.append('code_verifier', codeVerifier);
    
    const authHeader = `Basic ${Buffer.from(`${X_CLIENT_ID}:${X_CLIENT_SECRET}`).toString('base64')}`;

    // --- Exchange authorization code for access token ---
    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': authHeader,
      },
      body: params,
    });

    if (!tokenRes.ok) {
        const errorBody = await tokenRes.text();
        console.error("Token exchange failed:", errorBody);
        throw new Error('Failed to get access token from X.');
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // --- Fetch user data with the access token ---
    const userRes = await fetch('https://api.twitter.com/2/users/me?user.fields=profile_image_url', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!userRes.ok) throw new Error('Failed to fetch user data from X.');

    const { data: userData } = await userRes.json();

    const session: SessionData = {
      accessToken,
      refreshToken: tokenData.refresh_token,
      scope: tokenData.scope,
      expiresAt: Math.floor(Date.now() / 1000) + tokenData.expires_in,
      user: {
        id: userData.id,
        name: userData.name,
        username: userData.username,
        profileImageUrl: userData.profile_image_url,
      }
    };
    
    // Create session cookie and clear temporary cookies in one go
    const sessionCookie = serialize(SESSION_COOKIE_NAME, JSON.stringify(session), {
      maxAge: SESSION_MAX_AGE,
      expires: new Date(Date.now() + SESSION_MAX_AGE * 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax',
    });
    const clearStateCookie = serialize(STATE_COOKIE_NAME, '', { maxAge: -1, path: '/' });
    const clearVerifierCookie = serialize(CODE_VERIFIER_COOKIE_NAME, '', { maxAge: -1, path: '/' });

    res.setHeader('Set-Cookie', [sessionCookie, clearStateCookie, clearVerifierCookie]);
    
    // Redirect to the main page
    res.redirect(302, '/');

  } catch (error) {
    console.error(error);
    res.status(500).send('Authentication failed.');
  }
}
