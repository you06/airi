/**
 * Token refresh logic for OAuth subscription providers.
 *
 * Handles automatic refresh of expired access tokens using the stored
 * refresh_token, and updates the token storage accordingly.
 */

import type { OAuthEndpointConfig, OAuthTokenResponse, OAuthTokens } from './types'

import { isTokenExpired, loadTokens, saveTokens } from './token-storage'

/**
 * Refresh the access token using the stored refresh_token.
 * Returns updated tokens, or null if refresh is not possible.
 */
export async function refreshAccessToken(
  endpoint: OAuthEndpointConfig,
  refreshToken: string,
): Promise<OAuthTokens | null> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: endpoint.clientId,
    refresh_token: refreshToken,
  })

  const response = await fetch(endpoint.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!response.ok)
    return null

  const data: OAuthTokenResponse = await response.json()

  const tokens: OAuthTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt: data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000).toISOString()
      : undefined,
    tokenType: data.token_type || 'Bearer',
    scope: data.scope,
  }

  saveTokens(endpoint.id, tokens)
  return tokens
}

/**
 * Get a valid access token, refreshing if necessary.
 * Returns the access token string, or null if not authenticated.
 */
export async function getValidAccessToken(
  endpoint: OAuthEndpointConfig,
): Promise<string | null> {
  const tokens = loadTokens(endpoint.id)
  if (!tokens)
    return null

  if (!isTokenExpired(tokens))
    return tokens.accessToken

  if (!tokens.refreshToken)
    return null

  const refreshed = await refreshAccessToken(endpoint, tokens.refreshToken)
  return refreshed?.accessToken ?? null
}
