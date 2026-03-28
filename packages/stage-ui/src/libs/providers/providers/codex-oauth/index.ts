import { createOpenAI } from '@xsai-ext/providers/create'
import { z } from 'zod'

import { createOpenAICompatibleValidators } from '../../validators/openai-compatible'
import { defineProvider } from '../registry'
import { createBearerAuthFetch, overrideProviderFetch } from '../shared/subscription-oauth'

const DEFAULT_CODEX_OAUTH_BASE_URL = 'https://api.openai.com/v1'

const codexOAuthConfigSchema = z.object({
  apiKey: z
    .string('OAuth Access Token'),
  baseUrl: z
    .string('Base URL')
    .optional()
    .default(DEFAULT_CODEX_OAUTH_BASE_URL),
  headers: z
    .record(z.string(), z.string())
    .optional(),
})

type CodexOAuthConfig = z.input<typeof codexOAuthConfigSchema>

export const providerCodexOAuth = defineProvider<CodexOAuthConfig>({
  id: 'codex-oauth',
  order: 6,
  name: 'Codex OAuth',
  nameLocalize: ({ t }) => t('settings.pages.providers.provider.codex-oauth.title'),
  description: 'Experimental OAuth-token provider for subscription-backed Codex / OpenAI access.',
  descriptionLocalize: ({ t }) => t('settings.pages.providers.provider.codex-oauth.description'),
  tasks: ['chat'],
  icon: 'i-lobe-icons:openai',

  createProviderConfig: ({ t }) => codexOAuthConfigSchema.extend({
    apiKey: codexOAuthConfigSchema.shape.apiKey.meta({
      labelLocalized: 'OAuth Access Token',
      descriptionLocalized: 'Paste an OAuth access token obtained outside AIRI. AIRI does not manage the Codex login or token refresh flow yet.',
      placeholderLocalized: 'Paste your Codex / OpenAI OAuth access token',
      type: 'password',
    }),
    baseUrl: codexOAuthConfigSchema.shape.baseUrl.meta({
      labelLocalized: t('settings.pages.providers.catalog.edit.config.common.fields.field.base-url.label'),
      descriptionLocalized: 'Defaults to the official OpenAI API endpoint. Change this only when routing through a relay or proxy.',
      placeholderLocalized: t('settings.pages.providers.catalog.edit.config.common.fields.field.base-url.placeholder'),
    }),
    headers: codexOAuthConfigSchema.shape.headers.meta({
      labelLocalized: t('settings.pages.providers.catalog.edit.config.common.fields.field.headers.label'),
      descriptionLocalized: 'Optional extra headers for relays or proxies. AIRI does not ship an internal OAuth bridge yet.',
      section: 'advanced',
      type: 'key-values',
    }),
  }),
  createProvider(config) {
    const provider = createOpenAI('', config.baseUrl || DEFAULT_CODEX_OAUTH_BASE_URL) as any
    const fetch = createBearerAuthFetch(config.apiKey, config.headers)
    return overrideProviderFetch(provider, fetch)
  },

  validationRequiredWhen(config) {
    return !!config.apiKey?.trim()
  },
  validators: {
    validateConfig: [
      ({ t }) => ({
        id: 'codex-oauth:check-config',
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
    validateProvider: createOpenAICompatibleValidators<CodexOAuthConfig>({
      checks: ['connectivity', 'model_list', 'chat_completions'],
    })!.validateProvider,
  },
})
