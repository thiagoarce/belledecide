# ADR 0002 — Estratégia multi-tenant com RLS por família

## Status
Aceito

## Contexto
O PRD original modelava `perfil_familia` como uma tabela solta, sem vínculo a usuários
autenticados — inviável para um produto onde múltiplos membros de uma família (ex: casal)
precisam compartilhar o mesmo perfil/estoque, e onde os dados de uma família nunca podem
vazar para outra.

## Decisão
1. Introduzir `families` (tenant) e `family_members` (N:N com `auth.users`), com trigger
   `handle_new_user` que cria a família e a membership `owner` automaticamente no signup.
2. Toda tabela de domínio carrega `family_id` e tem RLS habilitado.
3. Função `security definer` `user_family_ids()` centraliza "quais famílias este usuário
   pode ver" — evita recursão de RLS ao consultar a própria `family_members`.
4. Policy padrão: `USING (family_id IN (SELECT * FROM user_family_ids()))`, replicada em
   `SELECT/INSERT/UPDATE/DELETE` (com `WITH CHECK` correspondente em insert/update).

## Justificativa
RLS no Postgres é a defesa mais forte disponível — mesmo se o front-end tiver um bug de
autorização, o banco não vaza dado de outra família. `security definer` na função de
resolução evita o problema clássico de "policy que precisa consultar a própria tabela que
tem a policy", que causaria recursão infinita ou erro de política.

## Consequências
- Toda nova tabela tenant-scoped precisa lembrar de: (a) coluna `family_id not null`,
  (b) `enable row level security`, (c) aplicar o padrão de policy usando `user_family_ids()`.
  Isso é uma disciplina manual — não há enforcement automático nesta fase.
- O Worker, ao usar service-role, **não é protegido por RLS** — a responsabilidade de
  filtrar por `family_id` correto passa a ser do código do Worker (ver ADR 0003).
