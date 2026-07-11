import type { FamilyProfile, LLMMenuOutput, PantryItem } from "@belledecide/shared-types";
import type { Env } from "../../env";

export interface MenuGenerationInput {
  ideiaSemente: string;
  profile: FamilyProfile;
  pantry: PantryItem[];
}

/**
 * Isolates the choice of LLM vendor from routes/menu.ts.
 * See specs/adr/0004-llm-provider-adapter.md.
 */
export interface ILLMProvider {
  generateMenu(input: MenuGenerationInput): Promise<{
    output: LLMMenuOutput;
    model: string;
  }>;
}

/** A LLM recusou responder (política de segurança do provedor). */
export class LLMRefusalError extends Error {
  constructor() {
    super("A LLM recusou gerar o cardápio para esta requisição");
  }
}

/** A resposta da LLM não é JSON válido ou não bate com o schema esperado. */
export class LLMValidationError extends Error {}

/** Erro transitório do provedor (rate limit, indisponibilidade) — vale retry. */
export class LLMUnavailableError extends Error {
  constructor(readonly retryAfterSeconds = 5) {
    super("Serviço de IA temporariamente indisponível");
  }
}

/**
 * Resolve o provedor configurado via env var (LLM_PROVIDER). Toda rota usa
 * só esta função + a interface ILLMProvider — nunca importa um SDK de LLM
 * diretamente. Ver specs/adr/0004-llm-provider-adapter.md.
 */
export async function createLLMProvider(env: Env): Promise<ILLMProvider> {
  switch (env.LLM_PROVIDER) {
    case "gemini": {
      const { GeminiProvider } = await import("./geminiProvider");
      return new GeminiProvider(env.GEMINI_API_KEY, env.LLM_MODEL);
    }
    case "anthropic":
    default: {
      const { ClaudeProvider } = await import("./claudeProvider");
      return new ClaudeProvider(env.ANTHROPIC_API_KEY, env.LLM_MODEL);
    }
  }
}
