# CLAUDE.md

Guia para sessões futuras (Claude Code / agentes) trabalhando neste repositório.

## O que é este projeto

PWA que elimina a "carga mental doméstica" do planejamento alimentar. Visão completa,
persona e stack: [`specs/00-overview.md`](./specs/00-overview.md). Modelo de dados:
[`specs/data-model.md`](./specs/data-model.md). Toda decisão de arquitetura relevante está
registrada em [`specs/adr/`](./specs/adr) — leia os ADRs antes de propor uma mudança
estrutural, e adicione um ADR novo quando tomar uma decisão que vale a pena registrar.

Desenvolvimento é **specs-driven**: funcionalidade nova nasce de um documento em `specs/`
antes de virar código.

## Estrutura

```
apps/web/               PWA React + Vite
workers/api/             Cloudflare Worker (Hono) — só as rotas que exigem secrets/lógica pesada
packages/shared-types/   Schemas zod compartilhados entre web e worker
supabase/                Migrations SQL + seed
specs/                   Specs por épico, modelo de dados, contratos de API, ADRs
```

## Comandos locais

CLIs (`wrangler`, `supabase`) não estão instaladas globalmente neste ambiente — use os
binários locais do workspace:

```bash
pnpm install

# typecheck (cada pacote tem seu próprio tsconfig)
/path/to/repo/packages/shared-types/node_modules/.bin/tsc --noEmit -p packages/shared-types/tsconfig.json
/path/to/repo/workers/api/node_modules/.bin/tsc --noEmit -p workers/api/tsconfig.json
/path/to/repo/apps/web/node_modules/.bin/tsc --noEmit -p apps/web/tsconfig.json

# supabase CLI (instalada como devDependency na raiz)
node_modules/.bin/supabase <comando>

# wrangler (instalada como devDependency em workers/api)
workers/api/node_modules/.bin/wrangler <comando>
```

## Recursos de produção já provisionados

- **Supabase**: projeto `belledecide`, ref `sgdfaqspsfrsjviuyjhi`, região `sa-east-1`
  (São Paulo). Org: `qculnnagjfxjphtsnyid`.
- **Cloudflare**: Worker `belledecide-api` → https://belledecide-api.thiagoarce.workers.dev.
  Pages `belledecide` → https://belledecide.pages.dev. Account ID:
  `d5dfcabebe7de3d86b68b6545b719017`.
- **LLM**: Gemini é o provedor default (`LLM_PROVIDER=gemini`, tier gratuito). Claude é a
  alternativa (`LLM_PROVIDER=anthropic`) — ver
  [`specs/adr/0004-llm-provider-adapter.md`](./specs/adr/0004-llm-provider-adapter.md).

Nenhum desses IDs é segredo (são identificadores de recurso, não credenciais) — mas nenhuma
chave/token real deve ser commitada. Segredos do Worker vivem em `wrangler secret put`
(nunca em `wrangler.toml`); segredos locais vão em `workers/api/.dev.vars` (gitignored).

### Pegadinha já conhecida: modelos Gemini pinados quebram

O Google descontinua acesso de novos usuários a versões específicas do Gemini com
frequência (`gemini-2.0-flash` ficou sem cota gratuita, `gemini-2.5-flash` passou a
retornar 404 "no longer available to new users" — ambos no mesmo dia em que a chave foi
criada). **Sempre use o alias `-latest`** (`gemini-flash-latest`, não uma versão pinada) em
`LLM_MODEL`. Se o erro voltar, teste a chave direto contra
`GET https://generativelanguage.googleapis.com/v1beta/models?key=...` para ver quais
modelos ela realmente tem acesso antes de assumir que é um problema de cota.

### Pegadinha já conhecida: documentação oficial de portal de NFC-e pode estar errada

A SEFAZ-PB anuncia `www.sefaz.pb.gov.br/nfce` como URL oficial, mas notas reais escaneadas em
João Pessoa redirecionam pra `www4.sefaz.pb.gov.br` (balanceamento entre servidores
numerados). **Não confie só na documentação/busca — quando o usuário tiver uma nota real em
mãos, decodifique o QR code direto** (`pip install pyzbar pillow` + `apt-get install
libzbar0t64` neste ambiente) pra ver a URL exata que o QR contém. O host real vira a fonte
de verdade; a allowlist em `fetchNfce.ts` usa um padrão (`www\d*.sefaz.pb.gov.br`) em vez de
um host fixo por causa disso. O mesmo vale pro path (`/nfce` vs `/nfce/consulta` — os dois
aparecem em notas reais da mesma UF).

## Design

Skill de design instalada em [`.claude/skills/frontend-design/`](./.claude/skills/frontend-design)
— usar pra qualquer trabalho novo de UI, não só recriar do zero a cada vez. Sistema de
tokens atual (cores, tipografia) está em `apps/web/tailwind.config.js` e
`apps/web/src/index.css` (classes `.btn-decide`, `.card`, `.field-input`, etc.) — reaproveitar
em vez de estilizar componentes novos do zero.

## Trabalhando numa sessão remota/headless (deploy, provisionamento)

Isso já mordeu a gente uma vez — documentando pra não se repetir.

**Login via navegador não funciona aqui.** `wrangler login`, `supabase login` (sem
`--token`), `gcloud auth login` etc. abrem um navegador e esperam o callback OAuth voltar
pra um `localhost` — mas esse `localhost` é o ambiente do agente, não o navegador do
usuário. Em sessão remota isso trava. **Sempre peça um token de API não-interativo**:

| Serviço | Onde gerar | Como usar |
|---|---|---|
| Supabase | supabase.com/dashboard/account/tokens (Personal Access Token) | `supabase login --token <token>`, ou direto contra `https://api.supabase.com/v1/...` |
| Cloudflare | dash.cloudflare.com/profile/api-tokens, template "Edit Cloudflare Workers" | `CLOUDFLARE_API_TOKEN=<token>` como env var pro wrangler; account ID vem de `GET /accounts` na API |
| Anthropic / Gemini | console.anthropic.com/aistudio.google.com | Secret do Worker via `wrangler secret put` |

**Se uma CLI falhar ou se comportar estranho, não insista nela — usa a API REST do
serviço direto via `curl`.** Foi assim que criamos o projeto Supabase e aplicamos as 10
migrations (`supabase projects create` falhava silenciosamente; `POST /v1/projects` e
`POST /v1/projects/{ref}/database/query` funcionaram de primeira). Erros de API REST vêm em
JSON legível, o que também torna o debug muito mais rápido que decifrar a saída de uma CLI.

**Confirma cada passo antes de seguir pro próximo** — uma chamada de leitura (curl no
health check, listar tabelas, etc.) depois de cada criação/deploy, em vez de assumir que
funcionou. Um `exit code 1` de CLI nem sempre significa falha real (`supabase login`
retorna erro de shutdown de telemetria mesmo quando o login funcionou) — verifique o efeito
real, não só o código de saída.

## Regra de ouro do Worker (não repetir em código novo)

Toda query no Worker que usa a service-role key do Supabase **precisa filtrar por
`family_id` resolvido no middleware de auth** (a partir do JWT), nunca por um `family_id`
vindo do payload do cliente — é a única linha de defesa nessas rotas, já que RLS está
desabilitado para a service-role. Ver
[`specs/adr/0003-worker-service-role-vs-client-rls.md`](./specs/adr/0003-worker-service-role-vs-client-rls.md).
