import crypto from 'crypto';

// Helper function to base64 encode a buffer
function base64URLEncode(buffer: ArrayBuffer): string {
  return Buffer.from(buffer)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Generates a random string for the code verifier
export function generateCodeVerifier(): string {
  const randomBytes = crypto.webcrypto.getRandomValues(new Uint8Array(32));
  return base64URLEncode(randomBytes);
}

// Hashes the verifier to create the code challenge
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.webcrypto.subtle.digest('SHA-256', data);
  return base64URLEncode(digest);
}