# 03 — Épico 3: Assistente de Supermercado

Status: **spec apenas** — sem código de implementação nesta fase.

## Objetivo

Apoiar a decisão de compra em tempo real, dentro do supermercado físico, usando o histórico
de preços já coletado pelo Épico 1.

## Scanner de Decisão (Semáforo de Preço)

- Usuário escaneia o **código de barras (EAN)** de um produto na prateleira (reaproveita o
  mesmo componente de câmera do Épico 1, `@zxing/browser`, mas lendo EAN-13 em vez de QR).
- App busca `produtos.codigo_barras` → se existir, consulta `historico_precos` para esse
  produto (todos os mercados, todas as famílias — dado é global no catálogo, mas o preço
  observado pode ser filtrado por região/mercado).
- Classifica o preço atual digitado/lido contra a média histórica:
  - 🟢 **Verde**: preço igual ou abaixo da média histórica.
  - 🟡 **Amarelo**: até X% acima da média (threshold configurável).
  - 🔴 **Vermelho**: significativamente acima da média — sugere não comprar ali.

Não requer tabela nova: reaproveita `produtos` e `historico_precos` (já criadas no Épico 1).
Requer apenas: (a) uma tela de scan de EAN, (b) um endpoint ou query direta que calcule a
média/mediana histórica por produto, (c) definição do threshold verde/amarelo/vermelho
(decisão de produto a validar, não travada nesta spec).

## Filtro de Compra Inteligente

Para categorias não-perecíveis (limpeza, higiene, mercearia com validade longa), se o preço
físico for classificado como vermelho, o app sugere comprar online — comparando com o menor
preço já registrado para aquele produto em `historico_precos` com `mercado_nome` marcado
como canal online (convenção a definir: prefixo ou coluna `canal` a adicionar quando este
épico for implementado).

## Perguntas em aberto para quando este épico for especificado em detalhe

- Fonte dos preços "online" — não há Épico que colete isso automaticamente ainda; seria
  entrada manual ou integração futura com APIs de e-commerce.
- Threshold do semáforo — fixo ou aprendido por família/categoria?
- Como lidar com produtos que nunca foram comprados antes (sem histórico) — provavelmente
  "sem dado" em vez de vermelho por padrão.
