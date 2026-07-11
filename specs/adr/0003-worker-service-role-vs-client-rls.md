# ADR 0003 — Worker usa service-role; front-end usa RLS direto

## Status
Aceito

## Contexto
Precisamos decidir, para cada operação do produto, se ela passa pelo Worker (Cloudflare) ou
se o front-end fala direto com o Supabase via `supabase-js`.

## Decisão
- **CRUD simples** (perfil da família, estoque manual, listar cardápios/eventos passados):
  front-end fala **direto com Supabase**, autenticado com o JWT do usuário, protegido por
  RLS (ADR 0002).
- **Operações que exigem secrets ou lógica pesada** (chamar a API da Anthropic, buscar e
  parsear NFC-e): passam pelo **Worker**, que usa a **service-role key** do Supabase
  (bypassa RLS) e filtra `family_id` explicitamente em toda query.

## Justificativa
Rotear todo CRUD trivial pelo Worker adicionaria uma camada sem valor (o Worker viraria um
proxy burro do PostgREST). Por outro lado, gerar cardápio e processar NFC-e exigem: chave de
API que não pode existir no cliente, chamadas HTTP a terceiros (Anthropic, SEFAZ), e escrita
multi-tabela que é mais simples de coordenar em código do que em RLS.

## Regra de ouro (aplicada em todo o código do Worker)
Toda query que usa a service-role key **precisa filtrar por `family_id` resolvido no
middleware de autenticação** (a partir do JWT), nunca por um `family_id` vindo do corpo da
requisição do cliente. Isso é a única linha de defesa nessas rotas, já que RLS está
desabilitado para a service-role — se essa regra for violada em algum endpoint futuro, há
vazamento de dado entre famílias.

## Consequências
- O Worker fica pequeno (2 rotas de negócio) — mais fácil de auditar essa regra de ouro em
  todo o código existente.
- Qualquer novo endpoint de Worker precisa ser revisado quanto a essa regra antes do merge.
