import type { ProviderInstance } from '../../types'

interface OverrideFetchOptions {
  removeHeaders?: string[]
}

function toHeaders(initHeaders: HeadersInit | undefined): Headers {
  return new Headers(initHeaders)
}

export function createBearerAuthFetch(
  accessToken: string,
  additionalHeaders?: Record<string, string>,
  options: OverrideFetchOptions = {},
) {
  const normalizedToken = accessToken.trim()
  const headersToRemove = new Set((options.removeHeaders || []).map(header => header.toLowerCase()))

  return (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = toHeaders(init?.headers)

    for (const header of headersToRemove) {
      headers.delete(header)
    }

    headers.set('Authorization', `Bearer ${normalizedToken}`)

    for (const [key, value] of Object.entries(additionalHeaders || {})) {
      headers.set(key, value)
    }

    return globalThis.fetch(input, {
      ...init,
      headers,
    })
  }
}

export function overrideProviderFetch(provider: ProviderInstance & Record<string, any>, fetch: ReturnType<typeof createBearerAuthFetch>) {
  const methodNames = ['model', 'chat', 'embed', 'image', 'speech', 'transcription']

  return methodNames.reduce((acc, methodName) => {
    if (typeof provider[methodName] !== 'function')
      return acc

    acc[methodName] = (...args: any[]) => ({
      ...provider[methodName](...args),
      fetch,
    })

    return acc
  }, { ...provider })
}
