# Data Model — Belle decide

Banco: Supabase (PostgreSQL). Todas as tabelas tenant-scoped carregam `family_id` e são
protegidas por Row Level Security (ver [`adr/0002-multi-tenant-rls-strategy.md`](./adr/0002-multi-tenant-rls-strategy.md)).
Fonte de verdade: `supabase/migrations/`.

## Diagrama ER (visão lógica)

```
auth.users (Supabase Auth)
     │ 1
     │
     │ N
family_members ──── N:1 ──── families ──── 1:1 ──── family_profile
                                  │ 1
                                  │
                                  │ N
                    ┌─────────────┼──────────────┬───────────────┬──────────────┐
                    │             │              │               │              │
                    N             N              N               N              N
              estoque_casa  historico_precos  notas_fiscais  cardapios_gerados  eventos
                    │ N            │ N            │ 1                              │ 1
                    │              │              │ N                              │ N
                    └──── N:1 ─────┴──── N:1 ──────┘                          evento_itens
                              produtos (catálogo global)         notas_fiscais_itens ── N:1 ── produtos
```

## Tabelas

### `families`
Raiz do tenant. Uma família = um agrupamento de usuários que compartilham perfil, estoque e
histórico.

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | uuid, PK | `gen_random_uuid()` |
| `name` | text | opcional, default `'Minha família'` |
| `created_at` | timestamptz | default `now()` |

### `family_members`
N:N entre `auth.users` e `families`.

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | uuid, PK | |
| `family_id` | uuid, FK → `families.id` | `on delete cascade` |
| `user_id` | uuid, FK → `auth.users.id` | `on delete cascade` |
| `role` | text | `'owner'` \| `'member'`, default `'member'` |
| `joined_at` | timestamptz | default `now()` |

Constraint: `unique (family_id, user_id)`. Criada automaticamente por trigger no signup
(`handle_new_user`), sem endpoint público de criação de família.

### `family_profile`
1:1 com `families` — perfil usado para personalizar a IA (Épico 2).

| Coluna | Tipo | Notas |
|---|---|---|
| `family_id` | uuid, PK/FK → `families.id` | `on delete cascade` |
| `tamanho` | integer | default `1`, `check (tamanho > 0)` |
| `criancas` | integer | default `0` |
| `alergias` | text[] | default `'{}'` |
| `aversoes` | text[] | default `'{}'` |
| `preferencias` | jsonb | default `'{}'` — favoritos, dieta, sazonalidade |
| `updated_at` | timestamptz | default `now()` |

### `produtos`
Catálogo **global**, compartilhado entre famílias (não tenant-scoped) — permite reuso de
matching e histórico de preço cross-família.

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | uuid, PK | |
| `codigo_barras` | text | `unique`, nullable (nem todo item tem EAN capturado) |
| `nome_normalizado` | text | not null |
| `categoria` | text | nullable — ex: "Açougue", "Limpeza" |
| `unidade_padrao` | text | nullable — ex: "kg", "un", "L" |
| `aliases` | text[] | default `'{}'` — variações de nome vindas de notas fiscais |
| `created_at` | timestamptz | default `now()` |

### `estoque_casa`
Estoque atual da família (Épico 1 e 2).

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | uuid, PK | |
| `family_id` | uuid, FK → `families.id` | `on delete cascade` |
| `produto_id` | uuid, FK → `produtos.id`, nullable | nulo quando item não casou com catálogo |
| `nome_livre` | text | nullable — usado quando `produto_id` é nulo |
| `quantidade` | numeric | not null |
| `unidade_medida` | text | nullable |
| `validade` | date | nullable — base do Radar de Perecíveis (Épico 4) |
| `origem` | text | `'manual'` \| `'nfce'` \| `'ia'`, default `'manual'` |
| `data_entrada` | timestamptz | default `now()` |

Constraint: `check (produto_id is not null or nome_livre is not null)`.

### `historico_precos`
Série temporal de preços observados — base do Semáforo de Preço (Épico 3).

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | uuid, PK | |
| `family_id` | uuid, FK → `families.id` | `on delete cascade` |
| `produto_id` | uuid, FK → `produtos.id` | not null |
| `mercado_nome` | text | not null |
| `mercado_cnpj` | text | nullable |
| `preco_pago` | numeric | not null, `check (preco_pago >= 0)` |
| `observado_em` | timestamptz | default `now()` |

### `notas_fiscais`
Uma linha por NFC-e escaneada (Épico 1).

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | uuid, PK | |
| `family_id` | uuid, FK → `families.id` | `on delete cascade` |
| `uploaded_by` | uuid, FK → `auth.users.id` | nullable |
| `chave_acesso` | text | not null |
| `uf` | text | not null |
| `qr_url` | text | not null |
| `status` | text | `pending`\|`parsed`\|`partial`\|`parse_failed`\|`fetch_failed`\|`unsupported_uf`\|`duplicate` |
| `mercado_nome` | text | nullable |
| `mercado_cnpj` | text | nullable |
| `emitida_em` | timestamptz | nullable |
| `parse_error` | text | nullable — detalhe do erro para debug |
| `created_at` | timestamptz | default `now()` |

Constraint: `unique (family_id, chave_acesso)` — idempotência (re-scan da mesma nota não
duplica dados).

### `notas_fiscais_itens`
Itens extraídos de uma nota fiscal.

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | uuid, PK | |
| `nota_id` | uuid, FK → `notas_fiscais.id` | `on delete cascade` |
| `produto_id` | uuid, FK → `produtos.id`, nullable | resultado do matching heurístico |
| `descricao_extraida` | text | not null — texto bruto do item na nota |
| `quantidade` | numeric | not null |
| `unidade` | text | nullable |
| `valor_unitario` | numeric | nullable |
| `valor_total` | numeric | nullable |
| `matched_confidence` | numeric | nullable — score de similaridade do matching (0-1) |

### `cardapios_gerados`
Resultado de cada geração de cardápio via IA (Épico 2).

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | uuid, PK | |
| `family_id` | uuid, FK → `families.id` | `on delete cascade` |
| `ideia_semente` | text | not null |
| `status` | text | `generating`\|`ready`\|`failed` |
| `cardapio_json` | jsonb | nullable até `ready` |
| `lista_compras_json` | jsonb | nullable até `ready` |
| `guia_execucao_json` | jsonb | nullable até `ready` |
| `llm_model` | text | nullable — modelo usado, para auditoria/custo |
| `created_by` | uuid, FK → `auth.users.id` | nullable |
| `created_at` | timestamptz | default `now()` |

### `eventos` / `evento_itens` (Épico 5 — schema de extensão, sem lógica implementada)

`eventos`: `id`, `family_id` (FK, cascade), `nome`, `data_evento` (date, nullable),
`tipo` (text, nullable), `created_at`.

`evento_itens`: `id`, `evento_id` (FK → `eventos.id`, cascade), `descricao`, `quantidade`
(nullable), `local_sugerido` (text, nullable), `comprado` (boolean, default `false`).

## Índices relevantes

- `produtos (codigo_barras)` — já `unique`, cobre lookup por EAN (Épico 3).
- `produtos using gin (nome_normalizado gin_trgm_ops)` — suporta matching por similaridade
  (`pg_trgm`, usado no matching de itens de NFC-e).
- `estoque_casa (family_id)`, `historico_precos (family_id, produto_id)`,
  `cardapios_gerados (family_id, created_at desc)` — padrões de consulta mais comuns.
