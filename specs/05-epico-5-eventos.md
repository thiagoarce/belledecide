# 05 — Épico 5: Roteirizador de Eventos

Status: **spec apenas** — schema de extensão já criado (migration `0009`), sem lógica de
Worker/UI implementada nesta fase.

## Objetivo

Permitir listas de compras **isoladas** do fluxo normal de cardápio/estoque para ocasiões
especiais (ex: churrasco, aniversário), com sugestão de onde comprar cada item.

## Modelo de dados

- `eventos` — `family_id`, `nome`, `data_evento`, `tipo` (ex: "churrasco", "aniversário").
- `evento_itens` — item da lista do evento, com `local_sugerido` (ex: "açougue do bairro",
  "atacado"). Isolado de `estoque_casa`/`historico_precos` — itens de evento não entram no
  estoque geral da casa por padrão (é uma lista de propósito único).

## Fluxo pretendido (a especificar em detalhe quando este épico for priorizado)

1. Usuário cria um evento com nome, data e tipo.
2. Pode gerar uma lista via IA (reaproveitando o mesmo padrão do Épico 2: uma "ideia semente"
   de evento, ex: "churrasco para 15 pessoas") ou montar manualmente.
3. Cada item pode receber uma sugestão de onde comprar, potencialmente cruzando com
   `historico_precos` (mesma lógica de semáforo do Épico 3) para otimizar custo por local.

## Perguntas em aberto

- A geração de lista de evento reaproveita o mesmo endpoint `/v1/menu/generate` com um modo
  diferente, ou é um endpoint novo (`/v1/event/generate`)? Provavelmente um schema de saída
  diferente (não faz sentido "cardápio por dia" para um evento único) — a decidir quando
  este épico entrar em implementação.
- Como sugerir "local de compra otimizado" sem dados de preço de todos os itens do evento
  (itens de evento podem ser produtos nunca comprados antes, sem histórico).
