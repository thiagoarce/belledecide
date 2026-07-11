export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  /** "anthropic" | "gemini" — ver src/lib/llm/provider.ts */
  LLM_PROVIDER: string;
  LLM_MODEL: string;
  ANTHROPIC_API_KEY: string;
  GEMINI_API_KEY: string;
  ALLOWED_ORIGIN: string;
}
