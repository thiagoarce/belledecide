# ADR 0001 — Monorepo com pnpm workspaces

## Status
Aceito

## Contexto
O projeto tem 3 pacotes que precisam evoluir juntos: front-end (`apps/web`), Worker
(`workers/api`) e tipos/schemas compartilhados (`packages/shared-types`). Precisamos
compartilhar tipos (contratos de request/response) sem publicar um pacote npm privado.

## Decisão
Usar **pnpm workspaces** simples, sem Turborepo/Nx nesta fase. `packages/shared-types` é
referenciado via `workspace:*` pelos outros dois pacotes.

## Justificativa
Turborepo/Nx agregam valor em cache de build distribuído e pipelines complexos — para 3
pacotes e builds individualmente rápidos (Vite, Wrangler), esse overhead de configuração não
se paga ainda. pnpm workspaces já resolve o problema central (compartilhar `shared-types`
sem publicar pacote). Podemos adicionar Turborepo depois se o tempo de build/CI justificar.

## Consequências
- `pnpm install` na raiz resolve tudo.
- Scripts `dev`/`build`/`typecheck` por pacote, orquestrados via `pnpm -r` ou `--filter`.
- Se o monorepo crescer (mais apps, mais workers), revisitar esta decisão.
