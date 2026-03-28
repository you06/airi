import type { ModelInfo } from '../../types'

import { createChatProvider, createModelProvider, merge } from '@xsai-ext/providers/utils'
import { z } from 'zod'

import { defineProvider } from '../registry'
import { createBearerAuthFetch } from '../shared/subscription-oauth'

const DEFAULT_CLAUDE_CODE_OAUTH_BASE_URL = 'https://api.anthropic.com/v1/'

const claudeCodeOAuthConfigSchema = z.object({
  apiKey: z
    .string('OAuth Access Token'),
  baseUrl: z
    .string('Base URL')
    .optional()
    .default(DEFAULT_CLAUDE_CODE_OAUTH_BASE_URL),
  headers: z
    .record(z.string(), z.string())
    .optional(),
})

type ClaudeCodeOAuthConfig = z.input<typeof claudeCodeOAuthConfigSchema>

function createClaudeCodeOAuthProvider(accessToken: string, baseURL: string, headers?: Record<string, string>) {
  const providerFetch = createBearerAuthFetch(accessToken, {
    'anthropic-dangerous-direct-browser-access': 'true',
    ...headers,
  }, {
    removeHeaders: ['x-api-key'],
  })

  return merge(
    createChatProvider({
      apiKey: 'oauth-token-managed-via-fetch',
      fetch: providerFetch,
      baseURL,
    }),
    createModelProvider({
      apiKey: 'oauth-token-managed-via-fetch',
      fetch: providerFetch,
      baseURL,
    }),
  )
}

export const providerClaudeCodeOAuth = defineProvider<ClaudeCodeOAuthConfig>({
  id: 'claude-code-oauth',
  order: 7,
  name: 'Claude Code OAuth',
  nameLocalize: ({ t }) => t('settings.pages.providers.provider.claude-code-oauth.title'),
  description: 'Experimental OAuth-token provider for Claude Code subscription access.',
  descriptionLocalize: ({ t }) => t('settings.pages.providers.provider.claude-code-oauth.description'),
  tasks: ['chat'],
  icon: 'i-lobe-icons:claude',
  iconColor: 'i-lobe-icons:claude-color',

  createProviderConfig: ({ t }) => claudeCodeOAuthConfigSchema.extend({
    apiKey: claudeCodeOAuthConfigSchema.shape.apiKey.meta({
      labelLocalized: 'OAuth Access Token',
      descriptionLocalized: 'Paste an OAuth access token obtained outside AIRI. AIRI does not manage the Claude Code login or token refresh flow yet.',
      placeholderLocalized: 'Paste your Claude Code OAuth access token',
      type: 'password',
    }),
    baseUrl: claudeCodeOAuthConfigSchema.shape.baseUrl.meta({
      labelLocalized: t('settings.pages.providers.catalog.edit.config.common.fields.field.base-url.label'),
      descriptionLocalized: 'Defaults to the official Anthropic API endpoint. Change this only when routing through a relay or proxy.',
      placeholderLocalized: t('settings.pages.providers.catalog.edit.config.common.fields.field.base-url.placeholder'),
    }),
    headers: claudeCodeOAuthConfigSchema.shape.headers.meta({
      labelLocalized: t('settings.pages.providers.catalog.edit.config.common.fields.field.headers.label'),
      descriptionLocalized: 'Optional extra headers for relays or proxies. AIRI does not ship an internal OAuth bridge yet.',
      section: 'advanced',
      type: 'key-values',
    }),
  }),
  createProvider(config) {
    return createClaudeCodeOAuthProvider(config.apiKey, config.baseUrl || DEFAULT_CLAUDE_CODE_OAUTH_BASE_URL, config.headers)
  },
  extraMethods: {
    listModels: async () => ([
      {
        id: 'claude-haiku-4-5-20251001',
        name: 'Claude Haiku 4.5',
        provider: 'claude-code-oauth',
        description: 'Anthropic fastest model with near-frontier intelligence',
      },
      {
        id: 'claude-sonnet-4-5-20250929',
        name: 'Claude Sonnet 4.5',
        provider: 'claude-code-oauth',
        description: 'Anthropic smartest model for complex agents and coding',
      },
      {
        id: 'claude-opus-4-1-20250805',
        name: 'Claude Opus 4.1',
        provider: 'claude-code-oauth',
        description: 'Exceptional model for specialized reasoning tasks',
      },
    ] satisfies ModelInfo[]),
  },

  validationRequiredWhen(config) {
    return !!config.apiKey?.trim()
  },
  validators: {
    validateConfig: [
      ({ t }) => ({
        id: 'claude-code-oauth:check-config',
        name: t('settings.pages.providers.catalog.edit.validators.openai-compatible.check-config.title'),
        validator: async (config) => {
          const errors: Array<{ error: unknown }> = []
          const accessToken = typeof config.apiKey === 'string' ? config.apiKey.trim() : ''
          const baseUrl = typeof config.baseUrl === 'string' ? config.baseUrl.trim() : ''

          if (!accessToken)
            errors.push({ error: new Error('OAuth access token is required.') })

          if (!baseUrl) {
            errors.push({ error: new Error('Base URL is required.') })
          }
          else {
            try {
              const parsed = new URL(baseUrl)
              if (!parsed.host)
                errors.push({ error: new Error('Base URL is not absolute. Check your input.') })
            }
            catch {
              errors.push({ error: new Error('Base URL is invalid. It must be an absolute URL.') })
            }
          }

          return {
            errors,
            reason: errors.length > 0 ? errors.map(item => (item.error as Error).message).join(', ') : '',
            reasonKey: '',
            valid: errors.length === 0,
          }
        },
      }),
    ],
  },
})
