# ADR 0004 — Adapter de provedor de LLM

## Status
Aceito (atualizado: Gemini como provedor default)

## Contexto
O PRD não especifica o provedor de LLM. Queremos poder trocar de provedor (custo, latência,
qualidade) sem reescrever a rota `/v1/menu/generate`. Na prática essa troca já aconteceu uma
vez: começamos com Claude e migramos o default para Gemini para viabilizar testes sem custo
(tier gratuito da Google AI Studio) antes de decidir se vale pagar por Claude em produção.

## Decisão
Interface `ILLMProvider` em `workers/api/src/lib/llm/provider.ts`:

```ts
interface ILLMProvider {
  generateMenu(input: MenuGenerationInput): Promise<{ output: LLMMenuOutput; model: string }>;
}
```

`provider.ts` também define os erros canônicos (`LLMRefusalError`, `LLMValidationError`,
`LLMUnavailableError`) que `routes/menu.ts` trata — cada implementação mapeia os erros do seu
próprio SDK para esses três, então a rota nunca importa um SDK de LLM diretamente. A escolha
de provedor é resolvida em runtime por `createLLMProvider(env)`, com base na env var
`LLM_PROVIDER` (`"gemini"` | `"anthropic"`, default `"gemini"`); o modelo específico vem de
`LLM_MODEL` (precisa bater com o provedor selecionado, ex: `gemini-2.0-flash` ou
`claude-opus-4-8`).

Implementações:
- **`GeminiProvider`** (`geminiProvider.ts`, default) — usa `@google/genai`. A API do Gemini
  suporta saída estruturada nativa (`responseMimeType: "application/json"` +
  `responseJsonSchema`), então o JSON vem validado pelo próprio provedor antes mesmo de
  chegar no Worker — ainda assim validamos de novo com o zod schema de
  `packages/shared-types` (`parseMenuOutput`) como defesa contra o modelo devolver um JSON
  que passa no schema do provedor mas não bate 100% com o que persistimos.
- **`ClaudeProvider`** (`claudeProvider.ts`) — usa `@anthropic-ai/sdk`. A versão fixada nesta
  fase (`0.68.x`) ainda não expõe saída estruturada nativa da API (`output_config.format`),
  então a conformidade do JSON depende de duas camadas: (1) o system prompt exige "ÚNICA e
  EXCLUSIVAMENTE" o JSON esperado, (2) a mesma validação zod usada pelo GeminiProvider.

## Justificativa
Gemini via Google AI Studio tem tier gratuito real (sem cartão de crédito) — essencial para
testar o produto em produção sem gastar antes de validar a ideia. Claude continua disponível
como opção (troca de uma env var) para quando custo deixar de ser o fator decisivo — a
qualidade de seguir instruções complexas (múltiplas restrições simultâneas: alergias +
aversões + porções + estoque) tende a ser melhor lá. A interface `ILLMProvider` existe
exatamente para que essa troca continue sendo indolor.

## Consequências
- `routes/menu.ts` depende só de `provider.ts` (interface + factory + erros canônicos),
  nunca de um SDK de LLM específico.
- Cada provider precisa mapear os erros do seu próprio SDK para `LLMRefusalError` /
  `LLMValidationError` / `LLMUnavailableError` — se um provider novo pular esse mapeamento,
  a rota trata o erro como 500 genérico em vez do código HTTP correto (422/503).
- O system prompt fixo (seção 5 do PRD) é duplicado como constante em cada provider (mesmo
  texto). Isso é intencional: cada provider pode precisar formatá-lo diferente (ex:
  `systemInstruction` do Gemini vs. bloco `system` com `cache_control` do Claude) — manter
  uma "fonte única" forçaria uma abstração prematura sobre um texto que raramente muda.
