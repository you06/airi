/**
 * Persistent token storage for OAuth subscription providers.
 *
 * Uses localStorage as the backing store. Tokens are stored per-provider
 * and include expiry information for automatic refresh.
 */

import type { OAuthStorageEntry, OAuthTokens } from './types'

const STORAGE_KEY_PREFIX = 'airi:oauth:'

function storageKey(providerId: string): string {
  return `${STORAGE_KEY_PREFIX}${providerId}`
}

export function loadTokens(providerId: string): OAuthTokens | null {
  try {
    const raw = localStorage.getItem(storageKey(providerId))
    if (!raw)
      return null

    const entry: OAuthStorageEntry = JSON.parse(raw)
    return entry.tokens
  }
  catch {
    return null
  }
}

export function saveTokens(providerId: string, tokens: OAuthTokens): void {
  const entry: OAuthStorageEntry = {
    providerId,
    tokens,
    updatedAt: new Date().toISOString(),
  }
  localStorage.setItem(storageKey(providerId), JSON.stringify(entry))
}

export function clearTokens(providerId: string): void {
  localStorage.removeItem(storageKey(providerId))
}

/**
 * Check if the stored access token is expired or about to expire (within 60s buffer).
 */
export function isTokenExpired(tokens: OAuthTokens): boolean {
  if (!tokens.expiresAt)
    return false

  const expiresAt = new Date(tokens.expiresAt).getTime()
  const bufferMs = 60_000
  return Date.now() >= expiresAt - bufferMs
}
