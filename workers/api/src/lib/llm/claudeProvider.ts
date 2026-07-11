import Anthropic from "@anthropic-ai/sdk";
import type { ILLMProvider, MenuGenerationInput } from "./provider";
import { parseMenuOutput } from "./schemas";

const SYSTEM_PROMPT = `Você é o "Belle decide", um assistente de inteligência doméstica.
Entradas: "Ideia Semente", "Estoque Atual" (JSON), e "Perfil da Família" (JSON).

Regras:
1. Gere cardápios baseados na "Ideia Semente", respeitando rigorosamente as alergias e aversões do "Perfil da Família".
2. Dimensione as porções conforme o tamanho da família.
3. Subtraia o "Estoque Atual" para gerar a lista de compras final apenas com o que falta.
4. Forneça o guia de preparo em lote (Batch Cooking).

OBRIGATÓRIO: Retorne ÚNICA e EXCLUSIVAMENTE um JSON estruturado exatamente assim, sem
texto antes ou depois, sem bloco de código markdown:
{
  "cardapio": [{"dia": 1, "refeicao": "Nome", "ingredientes_usados": []}],
  "lista_compras": [{"item": "Nome", "quantidade": "X", "setor": "Açougue"}],
  "guia_execucao": ["Passo 1", "Passo 2"]
}`;

export class ClaudeProvider implements ILLMProvider {
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(apiKey: string, model: string) {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async generateMenu(input: MenuGenerationInput) {
    const userContent = JSON.stringify({
      ideia_semente: input.ideiaSemente,
      estoque_atual: input.pantry,
      perfil_familia: input.profile,
    });

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 8000,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userContent }],
    });

    if (response.stop_reason === "refusal") {
      throw new LLMRefusalError();
    }

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new LLMValidationError("A LLM não retornou um bloco de texto com o cardápio");
    }

    try {
      const output = parseMenuOutput(textBlock.text);
      return { output, model: this.model };
    } catch {
      throw new LLMValidationError("Resposta da LLM não bateu com o schema esperado");
    }
  }
}

export class LLMRefusalError extends Error {
  constructor() {
    super("A LLM recusou gerar o cardápio para esta requisição");
  }
}

export class LLMValidationError extends Error {}
