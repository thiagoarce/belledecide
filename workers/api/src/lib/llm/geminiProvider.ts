import { ApiError, GoogleGenAI } from "@google/genai";
import type { ILLMProvider, MenuGenerationInput } from "./provider";
import { LLMRefusalError, LLMUnavailableError, LLMValidationError } from "./provider";
import { parseMenuOutput } from "./schemas";

const SYSTEM_PROMPT = `Você é o "Belle decide", um assistente de inteligência doméstica.
Entradas: "Ideia Semente", "Estoque Atual" (JSON), e "Perfil da Família" (JSON).

Regras:
1. Gere cardápios baseados na "Ideia Semente", respeitando rigorosamente as alergias e aversões do "Perfil da Família".
2. Dimensione as porções conforme o tamanho da família.
3. Subtraia o "Estoque Atual" para gerar a lista de compras final apenas com o que falta.
4. Forneça o guia de preparo em lote (Batch Cooking).`;

/**
 * JSON Schema padrão (subconjunto suportado pela API do Gemini via
 * `responseJsonSchema`) — força o mesmo formato exigido no system prompt do
 * Claude, sem depender de o modelo seguir instrução em texto livre.
 */
const MENU_JSON_SCHEMA = {
  type: "object",
  properties: {
    cardapio: {
      type: "array",
      items: {
        type: "object",
        properties: {
          dia: { type: "integer" },
          refeicao: { type: "string" },
          ingredientes_usados: { type: "array", items: { type: "string" } },
        },
        required: ["dia", "refeicao", "ingredientes_usados"],
      },
    },
    lista_compras: {
      type: "array",
      items: {
        type: "object",
        properties: {
          item: { type: "string" },
          quantidade: { type: "string" },
          setor: { type: "string" },
        },
        required: ["item", "quantidade", "setor"],
      },
    },
    guia_execucao: { type: "array", items: { type: "string" } },
  },
  required: ["cardapio", "lista_compras", "guia_execucao"],
};

/** Motivos de término que indicam que o Gemini bloqueou/recusou a resposta. */
const REFUSAL_FINISH_REASONS = new Set([
  "SAFETY",
  "RECITATION",
  "BLOCKLIST",
  "PROHIBITED_CONTENT",
  "SPII",
]);

export class GeminiProvider implements ILLMProvider {
  private readonly client: GoogleGenAI;
  private readonly model: string;

  constructor(apiKey: string, model: string) {
    this.client = new GoogleGenAI({ apiKey });
    this.model = model;
  }

  async generateMenu(input: MenuGenerationInput) {
    const userContent = JSON.stringify({
      ideia_semente: input.ideiaSemente,
      estoque_atual: input.pantry,
      perfil_familia: input.profile,
    });

    let response;
    try {
      response = await this.client.models.generateContent({
        model: this.model,
        contents: userContent,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: "application/json",
          responseJsonSchema: MENU_JSON_SCHEMA,
          maxOutputTokens: 8000,
        },
      });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 429 || err.status >= 500) {
          throw new LLMUnavailableError();
        }
      }
      throw err;
    }

    if (response.promptFeedback?.blockReason) {
      throw new LLMRefusalError();
    }

    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason && REFUSAL_FINISH_REASONS.has(finishReason)) {
      throw new LLMRefusalError();
    }

    const text = response.text;
    if (!text) {
      throw new LLMValidationError("A LLM não retornou texto com o cardápio");
    }

    try {
      const output = parseMenuOutput(text);
      return { output, model: this.model };
    } catch {
      throw new LLMValidationError("Resposta da LLM não bateu com o schema esperado");
    }
  }
}
