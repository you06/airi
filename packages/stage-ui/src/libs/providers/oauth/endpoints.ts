/**
 * OAuth endpoint configurations for subscription-backed providers.
 *
 * These reuse the same OAuth client IDs as the official CLI tools
 * (OpenAI Codex CLI and Claude Code CLI).
 *
 * NOTICE: These are not officially documented integration points.
 * They work because the CLI tools use public OAuth2 clients.
 * Provider changes to their OAuth infrastructure may break these.
 */

import type { OAuthEndpointConfig } from './types'

export const OPENAI_CODEX_OAUTH: OAuthEndpointConfig = {
  id: 'openai-codex',
  authorizeUrl: 'https://auth.openai.com/authorize',
  tokenUrl: 'https://auth.openai.com/oauth/token',
  clientId: 'app_EMoamEEZ73f0CkXaXp7hrann',
  scopes: ['openid', 'email', 'profile', 'offline_access'],
  callbackPort: 1455,
  callbackPath: '/auth/callback',
}

export const CLAUDE_CODE_OAUTH: OAuthEndpointConfig = {
  id: 'claude-code',
  authorizeUrl: 'https://claude.ai/oauth/authorize',
  tokenUrl: 'https://api.anthropic.com/v1/oauth/token',
  clientId: '9d1c250a-e61b-44d9-88ed-5944d1962f5e',
  scopes: ['org:create_api_key', 'user:profile', 'user:inference'],
  callbackPort: 54545,
  callbackPath: '/oauth/callback',
}
