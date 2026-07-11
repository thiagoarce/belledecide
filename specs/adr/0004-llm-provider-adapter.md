# ADR 0004 — Adapter de provedor de LLM

## Status
Aceito

## Contexto
O PRD não especifica o provedor de LLM. Queremos poder trocar de provedor (custo, latência,
qualidade) sem reescrever a rota `/v1/menu/generate`.

## Decisão
Definir uma interface `ILLMProvider` em `workers/api/src/lib/llm/provider.ts`:

```ts
interface ILLMProvider {
  generateMenu(input: MenuGenerationInput): Promise<MenuGenerationOutput>;
}
```

Implementação inicial: `ClaudeProvider` (`claudeProvider.ts`), usando o SDK oficial
`@anthropic-ai/sdk` (fetch-based, roda nativamente em Cloudflare Workers). Modelo default:
`claude-opus-4-8`, configurável via env var `LLM_MODEL` (trocável para `claude-sonnet-5` se
custo por chamada em escala virar preocupação — decisão operacional, não travada em código).

Conformidade do JSON de saída (`cardapio`/`lista_compras`/`guia_execucao`) é garantida por
duas camadas, não por saída estruturada nativa da API — a versão do `@anthropic-ai/sdk`
fixada nesta fase (`0.68.x`) ainda não expõe `output_config.format`/`json_schema` nem
`thinking: adaptive` (recursos mais recentes da API). Camada 1: o system prompt exige
"ÚNICA e EXCLUSIVAMENTE" o JSON no formato esperado. Camada 2: a resposta é parseada e
validada com o mesmo **zod** schema usado em `packages/shared-types` (`parseMenuOutput` em
`schemas.ts`) antes de persistir — se a LLM fugir do formato, a requisição falha com erro
claro em vez de gravar lixo no banco. Quando o SDK for atualizado para uma versão com
saída estruturada nativa, `claudeProvider.ts` pode passar a usá-la, mantendo a mesma
validação zod como defesa extra.

## Justificativa
Escolhemos Anthropic Claude por já sermos parte desse ecossistema. A interface
`ILLMProvider` isola essa escolha: trocar de provedor implica escrever um novo arquivo
`xProvider.ts`, não tocar em `routes/menu.ts`.

## Consequências
- `routes/menu.ts` depende só da interface, nunca do SDK da Anthropic diretamente.
- O system prompt fixo (seção 5 do PRD) vive em `claudeProvider.ts` como uma constante,
  cacheada via `cache_control: ephemeral` — se um provedor futuro tiver mecanismo de cache
  diferente, isso fica encapsulado na implementação daquele provider.
