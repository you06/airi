/**
 * OAuth2 PKCE (Proof Key for Code Exchange) utilities.
 *
 * Generates code_verifier and code_challenge pairs for the Authorization Code
 * flow with PKCE, as required by OpenAI Codex and Claude Code OAuth endpoints.
 */

/**
 * Generate a cryptographically random code_verifier string (43-128 chars).
 */
export function generateCodeVerifier(length = 64): string {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return base64URLEncode(array)
}

/**
 * Derive the code_challenge from a code_verifier using SHA-256.
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return base64URLEncode(new Uint8Array(digest))
}

/**
 * Generate a random state parameter to prevent CSRF.
 */
export function generateState(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return base64URLEncode(array)
}

function base64URLEncode(buffer: Uint8Array): string {
  let binary = ''
  for (const byte of buffer)
    binary += String.fromCharCode(byte)

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}
