import { LLMMenuOutputSchema, type LLMMenuOutput } from "@belledecide/shared-types";

/**
 * A versão do @anthropic-ai/sdk usada nesta fase não expõe `output_config`
 * (saída estruturada nativa) — então a conformidade do JSON é garantida por
 * duas camadas: (1) o system prompt exige "ÚNICA e EXCLUSIVAMENTE" o JSON no
 * formato esperado, (2) esta validação com o mesmo zod schema usado em
 * packages/shared-types, que é a fonte única de verdade do formato. Ver
 * specs/adr/0004-llm-provider-adapter.md.
 */
export function parseMenuOutput(rawText: string): LLMMenuOutput {
  const jsonText = stripCodeFence(rawText.trim());
  const parsedJson = JSON.parse(jsonText);
  return LLMMenuOutputSchema.parse(parsedJson);
}

function stripCodeFence(text: string): string {
  const match = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return match ? match[1]! : text;
}
