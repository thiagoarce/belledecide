# Belle decide

PWA que elimina a **carga mental doméstica** do planejamento alimentar: cadastre o perfil da
sua família, dê uma "ideia semente" (ex: "carne de panela") e a IA gera cardápio, lista de
compras (só o que falta, cruzando com seu estoque) e um guia de batch cooking.

Este projeto é desenvolvido no modelo **Specs-Driven Development** — toda funcionalidade
nasce de um documento em [`specs/`](./specs) antes de virar código.

## Stack

- **Front-end**: PWA em React + Vite, hospedado no Cloudflare Pages
- **Back-end**: Cloudflare Workers (Hono), na borda
- **Banco de dados**: Supabase (Postgres + Auth), multi-tenant por família com RLS
- **IA**: Gemini por padrão (tier gratuito) ou Anthropic Claude — trocável via env var, chamado a partir do Worker

## Estrutura

```
apps/web/          PWA React + Vite
workers/api/        Cloudflare Worker (Hono) — rotas que exigem secrets/lógica pesada
packages/shared-types/  Schemas zod compartilhados entre web e worker
supabase/           Migrations SQL + seed
specs/              Documentos de especificação por épico, modelo de dados, ADRs
```

Veja [`specs/00-overview.md`](./specs/00-overview.md) para a visão completa do produto e
[`specs/data-model.md`](./specs/data-model.md) para o modelo de dados.

## Desenvolvimento local

Pré-requisitos: Node 20+, pnpm 10+, [Supabase CLI](https://supabase.com/docs/guides/cli),
[Wrangler](https://developers.cloudflare.com/workers/wrangler/).

```bash
pnpm install
cp .env.example .env        # preencha com suas credenciais
supabase start               # sobe Postgres local + Auth
supabase db reset            # aplica supabase/migrations e supabase/seed.sql

pnpm dev:api                 # Worker em http://localhost:8787
pnpm dev:web                 # PWA em http://localhost:5173
```

## Escopo desta fase

Specs escritas para os 5 épicos do produto; código de fundação implementado para os
**Épico 1 (Abastecimento Passivo)** e **Épico 2 (O Cérebro da Cozinha)**. Épicos 3-5 têm
specs completas mas ainda sem implementação — ver `specs/03-*.md`, `specs/04-*.md`,
`specs/05-*.md`.
