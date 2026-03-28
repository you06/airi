/**
 * Types for OAuth subscription providers (Codex / Claude Code).
 */

export interface OAuthEndpointConfig {
  /** Provider identifier (e.g. 'openai-codex', 'claude-code') */
  id: string
  /** OAuth authorization URL */
  authorizeUrl: string
  /** OAuth token exchange URL */
  tokenUrl: string
  /** OAuth client ID (reused from official CLI tools) */
  clientId: string
  /** OAuth scopes */
  scopes: string[]
  /** Localhost callback port */
  callbackPort: number
  /** Callback path */
  callbackPath: string
}

export interface OAuthTokens {
  accessToken: string
  refreshToken?: string
  /** Token expiry as ISO timestamp */
  expiresAt?: string
  /** Token type (usually 'Bearer') */
  tokenType: string
  /** OAuth scopes granted */
  scope?: string
}

export interface OAuthTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in?: number
  token_type: string
  scope?: string
}

export type OAuthFlowStatus =
  | { state: 'idle' }
  | { state: 'awaiting-callback', authorizeUrl: string }
  | { state: 'exchanging-code' }
  | { state: 'authenticated', tokens: OAuthTokens }
  | { state: 'error', error: string }

export interface OAuthStorageEntry {
  providerId: string
  tokens: OAuthTokens
  /** When the entry was last updated (ISO timestamp) */
  updatedAt: string
}
