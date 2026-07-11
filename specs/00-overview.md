# 00 — Visão Geral: Belle decide

## Problema

Famílias (casais, pais solo, repúblicas, famílias com filhos) gastam energia mental
desproporcional em decisões recorrentes e de baixo valor: o que comer hoje, o que falta
comprar, onde comprar mais barato. Essa "Carga Mental Doméstica" é o problema central que o
Belle decide ataca.

## Persona

Famílias que buscam eficiência, economia e paz mental no planejamento alimentar diário —
não necessariamente "food lovers"; querem decisões boas e rápidas, não escolhas infinitas.

## Proposta de valor

Terceirizar a tomada de decisão (o que comer, o que comprar, onde comprar) para uma IA que
usa dados reais de consumo e preferências da família, não sugestões genéricas.

## Stack tecnológica

| Camada | Tecnologia |
|---|---|
| Front-end | PWA em React + Vite |
| Hospedagem front-end | Cloudflare Pages |
| Back-end | Cloudflare Workers (edge) |
| Banco de dados | Supabase (PostgreSQL + Auth) |
| Inteligência Artificial | Anthropic Claude (API), chamada a partir do Worker |

Decisão de arquitetura: o front-end fala **diretamente com o Supabase** (via `supabase-js`,
protegido por RLS) para todo CRUD simples. O Worker só entra em cena para as duas operações
que exigem secrets ou lógica que não cabe em PostgREST: gerar cardápio via LLM e processar
NFC-e. Ver [`adr/0003-worker-service-role-vs-client-rls.md`](./adr/0003-worker-service-role-vs-client-rls.md).

## Épicos

1. **[Abastecimento Passivo](./01-epico-1-abastecimento-passivo.md)** — leitura de NFC-e,
   estoque automatizado, histórico de preços. *(fundação implementada nesta fase)*
2. **[O Cérebro da Cozinha](./02-epico-2-cerebro-cozinha.md)** — perfil da família, cardápio
   inteligente, lista reversa, guia de batch cooking. *(fundação implementada nesta fase)*
3. **[Assistente de Supermercado](./03-epico-3-assistente-supermercado.md)** — scanner de
   decisão com semáforo de preço, filtro de compra inteligente. *(spec apenas)*
4. **[Gestão de Espaço e Perecíveis](./04-epico-4-gestao-espaco.md)** — controle de volume de
   congelados, radar de perecíveis. *(spec apenas)*
5. **[Roteirizador de Eventos](./05-epico-5-eventos.md)** — listas isoladas para ocasiões
   especiais. *(spec apenas)*

## Multi-tenant e autenticação

O Belle decide é multi-usuário desde o dia 1: uma **família** pode ter múltiplos membros
(ex: casal), e todo dado sensível (perfil, estoque, histórico de preços, cardápios) é
isolado por família via Row Level Security no Supabase. Autenticação via Supabase Auth
(magic link / OTP por e-mail, sem senha). Ver
[`adr/0002-multi-tenant-rls-strategy.md`](./adr/0002-multi-tenant-rls-strategy.md) e
[`data-model.md`](./data-model.md).

## Documentos relacionados

- [`data-model.md`](./data-model.md) — dicionário de dados e diagrama ER completo
- [`api-contracts.md`](./api-contracts.md) — contratos REST do Worker, por épico
- [`adr/`](./adr) — decisões de arquitetura registradas
