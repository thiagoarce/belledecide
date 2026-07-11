# API Contracts — Worker (`workers/api`)

Base URL local: `http://localhost:8787`. Todas as rotas (exceto `/v1/health`) exigem
`Authorization: Bearer <supabase_access_token>`.

CRUD simples (perfil da família, estoque manual, listagem de cardápios/eventos) **não** tem
contrato aqui — é feito diretamente pelo front-end via `supabase-js`, protegido por RLS.

## `GET /v1/health`

Sem autenticação. Resposta:

```json
{ "status": "ok" }
```

## `POST /v1/menu/generate`

Épico 2. Gera um cardápio a partir de uma Ideia Semente, usando o perfil e o estoque atual
da família autenticada.

**Request**

```json
{ "ideiaSemente": "Carne de panela" }
```

**Response `200`**

```json
{
  "id": "uuid",
  "status": "ready",
  "cardapio": [
    { "dia": 1, "refeicao": "Carne de panela com mandioca", "ingredientes_usados": ["carne de segunda", "mandioca", "cebola"] }
  ],
  "lista_compras": [
    { "item": "Carne de segunda", "quantidade": "1.2 kg", "setor": "Açougue" }
  ],
  "guia_execucao": [
    "Descongele a carne de segunda na noite anterior.",
    "Refogue cebola e alho, doure a carne, adicione água e cozinhe em fogo baixo por 40 min."
  ]
}
```

**Erros**

| Status | Quando |
|---|---|
| `401` | JWT ausente/inválido/expirado |
| `404` | Família não encontrada para o usuário (edge case — usuário sem membership) |
| `422` | LLM recusou a geração (`stop_reason === "refusal"`) |
| `500` | Resposta da LLM não é JSON válido ou não bateu com o schema zod esperado |
| `503` | Erro transitório da API da Anthropic (rate limit / indisponibilidade) — inclui header `Retry-After` |

Corpo de erro padrão: `{ "error": { "code": "string", "message": "string" } }`.

## `POST /v1/nfce/scan`

Épico 1. Recebe a URL decodificada do QR code de uma NFC-e, processa e propaga para o
estoque.

**Request**

```json
{ "qrUrl": "https://www.nfce.fazenda.sp.gov.br/qrcode?p=..." }
```

**Response `200` (sucesso ou falha parcial — status expressa o resultado, não o HTTP code)**

```json
{
  "notaId": "uuid",
  "status": "parsed",
  "mercado": { "nome": "Mercado Bom Preço", "cnpj": "12.345.678/0001-90" },
  "itens": [
    {
      "descricaoExtraida": "ARROZ TIPO 1 5KG",
      "produtoId": "uuid-ou-null",
      "quantidade": 1,
      "unidade": "un",
      "valorTotal": 24.9,
      "matchedConfidence": 0.92
    }
  ],
  "itensNaoReconhecidos": 0
}
```

`status` pode ser qualquer valor de `notas_fiscais.status` (ver [`data-model.md`](./data-model.md#notas_fiscais)).
Para `unsupported_uf` / `fetch_failed` / `parse_failed`, `itens` vem vazio e o campo
`message` traz uma explicação amigável para exibir na UI.

**Erros**

| Status | Quando |
|---|---|
| `401` | JWT ausente/inválido/expirado |
| `400` | `qrUrl` ausente ou não é uma URL válida |
| `403` | `qrUrl` não bate com nenhum host da allowlist de SEFAZ conhecidos (defesa SSRF) |

## Autenticação (todas as rotas exceto `/v1/health`)

1. Client envia `Authorization: Bearer <access_token>` (token de sessão do Supabase Auth).
2. Worker valida a assinatura via JWKS do projeto Supabase (`jose.createRemoteJWKSet`).
3. Worker resolve `family_id` consultando `family_members` pelo `sub` do token (service-role).
   Se o usuário não pertencer a nenhuma família, `404`. MVP assume 1 família por usuário —
   caso um usuário pertença a mais de uma no futuro, será exigido header `X-Family-Id`
   validado contra a membership.
