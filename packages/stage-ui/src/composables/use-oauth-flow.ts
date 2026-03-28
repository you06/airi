/**
 * Vue composable for OAuth subscription provider login flow.
 *
 * Provides reactive state for the OAuth login/logout process
 * and token management.
 */

import type { OAuthEndpointConfig, OAuthFlowStatus, OAuthTokens } from '../libs/providers/oauth/types'

import { computed, ref } from 'vue'

import { clearTokens, getValidAccessToken, loadTokens, startOAuthFlow } from '../libs/providers/oauth'

export function useOAuthFlow(endpoint: OAuthEndpointConfig) {
  const status = ref<OAuthFlowStatus>({ state: 'idle' })
  const isLoading = ref(false)

  const storedTokens = ref<OAuthTokens | null>(loadTokens(endpoint.id))

  const isAuthenticated = computed(() => {
    return status.value.state === 'authenticated' || storedTokens.value !== null
  })

  async function login() {
    if (isLoading.value)
      return

    isLoading.value = true
    status.value = { state: 'idle' }

    try {
      const tokens = await startOAuthFlow(endpoint, {
        openBrowser: (url) => {
          window.open(url, '_blank')
        },
        onStatusChange: (newStatus) => {
          status.value = newStatus
        },
      })

      storedTokens.value = tokens
      status.value = { state: 'authenticated', tokens }
    }
    catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      status.value = { state: 'error', error: message }
    }
    finally {
      isLoading.value = false
    }
  }

  function logout() {
    clearTokens(endpoint.id)
    storedTokens.value = null
    status.value = { state: 'idle' }
  }

  async function getAccessToken(): Promise<string | null> {
    const token = await getValidAccessToken(endpoint)
    if (!token) {
      // Token expired and refresh failed — clear state
      storedTokens.value = null
      status.value = { state: 'idle' }
    }
    return token
  }

  /**
   * Create a fetch function that injects the OAuth Bearer token.
   */
  function createAuthenticatedFetch(): (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> {
    return async (input: RequestInfo | URL, init?: RequestInit) => {
      const token = await getAccessToken()
      if (!token)
        throw new Error(`Not authenticated with ${endpoint.id}`)

      const headers = new Headers(init?.headers)
      headers.set('Authorization', `Bearer ${token}`)

      return globalThis.fetch(input, { ...init, headers })
    }
  }

  return {
    status,
    isLoading,
    isAuthenticated,
    storedTokens,
    login,
    logout,
    getAccessToken,
    createAuthenticatedFetch,
  }
}
