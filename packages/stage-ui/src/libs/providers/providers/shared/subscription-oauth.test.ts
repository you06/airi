import { describe, expect, it, vi } from 'vitest'

import { createBearerAuthFetch, overrideProviderFetch } from './subscription-oauth'

describe('createBearerAuthFetch', () => {
  it('injects bearer auth and additional headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    const wrappedFetch = createBearerAuthFetch('token-123', {
      'x-test-header': 'present',
    })

    await wrappedFetch('https://example.com/v1/models', {
      headers: {
        'content-type': 'application/json',
      },
    })

    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Headers
    expect(headers.get('authorization')).toBe('Bearer token-123')
    expect(headers.get('x-test-header')).toBe('present')
    expect(headers.get('content-type')).toBe('application/json')
  })

  it('removes conflicting headers when requested', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    const wrappedFetch = createBearerAuthFetch('token-123', undefined, {
      removeHeaders: ['x-api-key'],
    })

    await wrappedFetch('https://example.com/v1/models', {
      headers: {
        'x-api-key': 'old-key',
      },
    })

    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Headers
    expect(headers.get('x-api-key')).toBeNull()
    expect(headers.get('authorization')).toBe('Bearer token-123')
  })
})

describe('overrideProviderFetch', () => {
  it('overrides fetch on supported provider methods', () => {
    const fetch = createBearerAuthFetch('token-123')
    const provider = {
      chat: vi.fn().mockReturnValue({ model: 'chat-model' }),
      model: vi.fn().mockReturnValue({ model: 'model-model' }),
    }

    const overridden = overrideProviderFetch(provider as any, fetch)
    expect(overridden.chat('gpt-test').fetch).toBe(fetch)
    expect(overridden.model('gpt-test').fetch).toBe(fetch)
  })
})
