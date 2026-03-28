/**
 * OAuth2 Authorization Code flow with PKCE for subscription-backed providers.
 *
 * This module orchestrates the full OAuth login flow:
 * 1. Generate PKCE parameters and build the authorization URL
 * 2. Open the user's browser to the authorization URL
 * 3. Listen for the OAuth callback via BroadcastChannel
 * 4. Exchange the authorization code for tokens
 * 5. Store the tokens for future use
 *
 * Designed for desktop (Electron) environments where we can open a browser
 * and listen on localhost. For web environments, a different approach
 * (e.g. server-side proxy) would be needed.
 */

import type { OAuthEndpointConfig, OAuthFlowStatus, OAuthTokenResponse, OAuthTokens } from './types'

import { generateCodeChallenge, generateCodeVerifier, generateState } from './pkce'
import { saveTokens } from './token-storage'

export interface OAuthFlowCallbacks {
  /** Called when the authorization URL is ready. Implementation should open the user's browser. */
  openBrowser: (url: string) => void
  /** Called when flow status changes. */
  onStatusChange?: (status: OAuthFlowStatus) => void
}

/**
 * Build the full authorization URL with PKCE parameters.
 */
export function buildAuthorizeUrl(
  endpoint: OAuthEndpointConfig,
  params: {
    codeChallenge: string
    state: string
    redirectUri: string
  },
): string {
  const url = new URL(endpoint.authorizeUrl)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', endpoint.clientId)
  url.searchParams.set('redirect_uri', params.redirectUri)
  url.searchParams.set('scope', endpoint.scopes.join(' '))
  url.searchParams.set('state', params.state)
  url.searchParams.set('code_challenge', params.codeChallenge)
  url.searchParams.set('code_challenge_method', 'S256')
  return url.toString()
}

/**
 * Exchange an authorization code for tokens.
 */
export async function exchangeCodeForTokens(
  endpoint: OAuthEndpointConfig,
  params: {
    code: string
    codeVerifier: string
    redirectUri: string
  },
): Promise<OAuthTokens> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: endpoint.clientId,
    code: params.code,
    redirect_uri: params.redirectUri,
    code_verifier: params.codeVerifier,
  })

  const response = await fetch(endpoint.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => 'unknown error')
    throw new Error(`Token exchange failed (${response.status}): ${text}`)
  }

  const data: OAuthTokenResponse = await response.json()

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000).toISOString()
      : undefined,
    tokenType: data.token_type || 'Bearer',
    scope: data.scope,
  }
}

/**
 * Start the OAuth login flow.
 *
 * Opens the browser for user authorization and waits for the callback.
 * Uses BroadcastChannel to receive the authorization code from the callback page.
 *
 * Returns the obtained tokens on success, or throws on failure.
 */
export async function startOAuthFlow(
  endpoint: OAuthEndpointConfig,
  callbacks: OAuthFlowCallbacks,
): Promise<OAuthTokens> {
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = await generateCodeChallenge(codeVerifier)
  const state = generateState()
  const redirectUri = `http://localhost:${endpoint.callbackPort}${endpoint.callbackPath}`

  const authorizeUrl = buildAuthorizeUrl(endpoint, {
    codeChallenge,
    state,
    redirectUri,
  })

  callbacks.onStatusChange?.({ state: 'awaiting-callback', authorizeUrl })

  // Open the browser and wait for the callback
  const code = await waitForCallback(endpoint, state, () => {
    callbacks.openBrowser(authorizeUrl)
  })

  callbacks.onStatusChange?.({ state: 'exchanging-code' })

  const tokens = await exchangeCodeForTokens(endpoint, {
    code,
    codeVerifier,
    redirectUri,
  })

  saveTokens(endpoint.id, tokens)
  callbacks.onStatusChange?.({ state: 'authenticated', tokens })

  return tokens
}

/**
 * Wait for the OAuth callback via BroadcastChannel.
 *
 * NOTICE: In a full desktop implementation, an HTTP server on
 * `endpoint.callbackPort` would receive the redirect and post the
 * authorization code through the BroadcastChannel. The Electron main
 * process is responsible for starting that server. This function only
 * handles the renderer-side listening.
 */
function waitForCallback(
  endpoint: OAuthEndpointConfig,
  expectedState: string,
  triggerBrowserOpen: () => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const channel = new BroadcastChannel(`airi:oauth:${endpoint.id}`)

    const timeout = setTimeout(() => {
      channel.close()
      reject(new Error('OAuth callback timed out after 5 minutes'))
    }, 5 * 60 * 1000)

    channel.onmessage = (event) => {
      const { code, state, error } = event.data as {
        code?: string
        state?: string
        error?: string
      }

      if (error) {
        clearTimeout(timeout)
        channel.close()
        reject(new Error(`OAuth error: ${error}`))
        return
      }

      if (state !== expectedState) {
        clearTimeout(timeout)
        channel.close()
        reject(new Error('OAuth state mismatch — possible CSRF attack'))
        return
      }

      if (code) {
        clearTimeout(timeout)
        channel.close()
        resolve(code)
      }
    }

    // Start the browser flow after the listener is set up
    triggerBrowserOpen()
  })
}
