# 04 — Épico 4: Gestão de Espaço e Radar de Perecíveis

Status: **spec apenas** — sem código de implementação nesta fase.

## Gestão de Espaço (congelados)

Controle de volume ocupado no congelador/freezer usando uma classificação simples de
tamanho: **P / M / G** por item de estoque. Isso evita ter que modelar volume em litros —
suficiente para o usuário decidir "cabe mais uma coisa?" sem métricas precisas.

Requer uma coluna nova em `estoque_casa` (ex: `volume_congelador text check (volume_congelador in ('P','M','G'))`,
nullable — só preenchida para itens congelados). O schema desta fase já foi desenhado para
comportar essa extensão sem migração destrutiva.

## Radar de Perecíveis

Prioriza o uso de itens do estoque próximos ao vencimento. Reaproveita a coluna `validade`
(já existente em `estoque_casa` desde o Épico 1) — não requer tabela nova.

Comportamento pretendido (a validar quando implementado):
- Uma view/consulta que lista itens com `validade` dentro dos próximos N dias, ordenados por
  urgência.
- Integração natural com o Épico 2: ao gerar uma nova Ideia Semente, o Worker poderia
  priorizar itens perto do vencimento no prompt (ex: "dê preferência a usar: [itens
  vencendo]") — não implementado nesta fase, mas o campo `validade` já está disponível para
  quando isso for especificado.

## Perguntas em aberto

- Definição de "próximo ao vencimento" (3 dias? 7 dias? por categoria?).
- Notificações push (exige Web Push API no PWA — não configurado nesta fase).
