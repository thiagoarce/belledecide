# 02 — Épico 2: O Cérebro da Cozinha (Belle decide)

Status: **fundação implementada nesta fase** (schema + Worker `/v1/menu/generate` + UI de
ideia semente e resultado).

## Objetivo

A partir de uma "Ideia Semente" curta (ex: "Carne de panela"), gerar um cardápio completo,
uma lista de compras contendo **apenas o que falta**, e um guia prático de batch cooking —
tudo respeitando o perfil da família.

## Perfil da Família

Cadastro único por família (`family_profile`, 1:1 com `families`):

- `tamanho` — número de pessoas a alimentar (dimensiona porções).
- `criancas` — número de crianças (a IA pode adaptar porções/temperos).
- `alergias` — lista de alergias (ex: amendoim). **Restrição rígida**: a IA nunca pode
  sugerir um ingrediente que conste aqui.
- `aversoes` — lista de aversões (ex: "não come fígado"). Tratada como restrição forte, mas
  não de segurança — evitar, não é uma questão de vida ou morte como alergia.
- `preferencias` — JSON livre para favoritos, sazonalidade, restrições de dieta (ex:
  vegetariano), etc.

Qualquer membro da família pode editar o perfil (CRUD direto no Supabase via `supabase-js`,
protegido por RLS — não passa pelo Worker).

## Fluxo funcional

1. Usuário digita a Ideia Semente na tela `/menu/new`.
2. PWA chama `POST /v1/menu/generate` (autenticado) com `{ ideiaSemente }`.
3. Worker busca `family_profile` e `estoque_casa` atual da família (service-role, filtrando
   por `family_id` resolvido do JWT).
4. Worker monta o prompt (system prompt fixo + dados variáveis) e chama a API da LLM
   configurada (Gemini por padrão, ou Claude — ver
   [`adr/0004-llm-provider-adapter.md`](./adr/0004-llm-provider-adapter.md)). O
   texto retornado é parseado como JSON e validado contra o schema zod definido em
   [`api-contracts.md`](./api-contracts.md#post-v1menugenerate) (ver
   [`adr/0004-llm-provider-adapter.md`](./adr/0004-llm-provider-adapter.md) — a versão do
   SDK usada nesta fase ainda não suporta saída estruturada nativa da API).
5. Resposta validada é persistida em `cardapios_gerados` com `status='ready'`; se não bater
   com o schema, a geração falha com `status='failed'` em vez de gravar dado inconsistente.
6. UI renderiza o resultado em 3 abas: Cardápio, Lista de Compras, Guia de Execução.

## System Prompt (regras de negócio)

O Worker envia o seguinte contrato à LLM (cacheado via `cache_control: ephemeral`, pois é
fixo entre chamadas):

```
Você é o "Belle decide", um assistente de inteligência doméstica.
Entradas: "Ideia Semente", "Estoque Atual" (JSON), e "Perfil da Família" (JSON).

Regras:
1. Gere cardápios baseados na "Ideia Semente", respeitando rigorosamente as alergias e
   aversões do "Perfil da Família".
2. Dimensione as porções conforme o tamanho da família.
3. Subtraia o "Estoque Atual" para gerar a lista de compras final apenas com o que falta.
4. Forneça o guia de preparo em lote (Batch Cooking).

OBRIGATÓRIO: Retorne ÚNICA e EXCLUSIVAMENTE um JSON estruturado exatamente assim:
{
  "cardapio": [{"dia": 1, "refeicao": "Nome", "ingredientes_usados": []}],
  "lista_compras": [{"item": "Nome", "quantidade": "X", "setor": "Açougue"}],
  "guia_execucao": ["Passo 1", "Passo 2"]
}
```

Implementação: ver `workers/api/src/lib/llm/claudeProvider.ts`. O prompt é fixo no código
(não editável via UI nesta fase); dados variáveis (ideia semente, perfil, estoque) são
interpolados **depois** do bloco de cache, nunca antes.

## Lista Reversa

"Reversa" porque não é uma lista de todos os ingredientes do cardápio — é o resultado da
subtração `ingredientes necessários − estoque atual`. Essa subtração é feita pela própria
LLM (regra 3 do system prompt), com o estoque completo passado como contexto; não há
subtração determinística em código nesta fase (é uma escolha deliberada: nomes de
ingredientes em linguagem natural não casam trivialmente com o catálogo `produtos` sem um
passo de normalização que a LLM já faz implicitamente).

## Guia de Batch Cooking

Lista ordenada de passos práticos (`guia_execucao: string[]`) para cozinhar o cardápio
gerado em lote — não uma receita completa por refeição, e sim um roteiro de execução
(ex: "descongele X", "tempere Y enquanto Z cozinha").

## Persistência e histórico

Cada geração cria uma linha em `cardapios_gerados`. Usuário pode revisitar cardápios
anteriores em `/menu/:id`. Não há edição de cardápio gerado nesta fase — para ajustar, o
usuário gera um novo a partir de uma ideia semente diferente.

## Fora de escopo nesta fase

- Edição manual do cardápio gerado.
- Regeneração parcial (ex: "troque só o dia 3").
- Múltiplas ideias semente na mesma geração.
