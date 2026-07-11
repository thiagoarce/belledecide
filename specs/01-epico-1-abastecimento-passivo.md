# 01 — Épico 1: Abastecimento Passivo

Status: **fundação implementada nesta fase** (schema + Worker `/v1/nfce/scan` + scaffold de UI).

## Objetivo

Popular o estoque da casa (`estoque_casa`) e o histórico de preços (`historico_precos`) sem
digitação manual, a partir da leitura da nota fiscal (NFC-e) no momento da compra.

## Como a NFC-e realmente funciona (restrição técnica central)

O QR code impresso no cupom fiscal **não contém os itens da compra** — ele contém uma URL
que aponta para o portal da SEFAZ do estado emissor, contendo a chave de acesso da nota como
parâmetro. Para obter os itens é necessário:

1. Decodificar o QR code (câmera do PWA) → obter a URL.
2. O Worker faz `fetch` dessa URL (nunca o cliente, para não vazar a estrutura de scraping e
   para poder aplicar allowlist/timeout).
3. Fazer parsing do HTML retornado — **o layout varia por UF**, porque cada estado opera seu
   próprio portal (ou usa um ambiente compartilhado entre vários estados).

Por isso o Épico 1 não é "leitura de NFC-e" genérica — é uma arquitetura de **parsers
plugáveis por UF**, com cobertura incremental. UFs sem parser implementado devem falhar de
forma graciosa (`status='unsupported_uf'`), nunca com erro genérico. Ver
[`adr/0005-nfce-parser-plugin-architecture.md`](./adr/0005-nfce-parser-plugin-architecture.md).

## Fluxo funcional

1. Usuário abre "Estoque" no PWA e toca em "Escanear nota".
2. Câmera abre, decodifica o QR code (`@zxing/browser`).
3. PWA envia a URL decodificada para `POST /v1/nfce/scan` (autenticado).
4. Worker valida a URL contra allowlist de hosts SEFAZ conhecidos, busca o HTML, identifica o
   parser pela UF/hostname, extrai `chave_acesso`, dados do mercado e itens.
5. Cada item é comparado ao catálogo global `produtos` (matching por similaridade de texto);
   se não houver correspondência, entra como item "livre" (`produto_id` nulo).
6. Itens são gravados em `notas_fiscais_itens`, propagados para `estoque_casa` (soma de
   quantidade) e para `historico_precos` (novo registro de preço observado).
7. UI mostra um resumo dos itens importados, com destaque para itens que não casaram com o
   catálogo (usuário pode corrigir/confirmar manualmente).

## Casos de falha (estados de primeira classe, não exceções)

| `notas_fiscais.status` | Significado | Comportamento |
|---|---|---|
| `pending` | Registro criado, processamento em andamento | UI mostra spinner |
| `parsed` | Sucesso total | Itens todos propagados ao estoque |
| `partial` | Alguns itens extraídos, outros falharam | Propaga o que deu certo; sinaliza pendências |
| `parse_failed` | Parser encontrado mas não conseguiu extrair (provável mudança de layout) | Snippet do HTML salvo para debug; usuário pode inserir manualmente |
| `fetch_failed` | Timeout ou portal fora do ar | Permite tentar novamente |
| `unsupported_uf` | Nenhum parser cobre esta UF ainda | Mensagem clara; usuário insere manualmente |
| `duplicate` | `chave_acesso` já processada para esta família | Retorna o resultado já existente (idempotência) |

## Estoque automatizado

`estoque_casa` acumula por `produto_id` (ou `nome_livre` quando não há match). Campo
`origem` (`manual` / `nfce` / `ia`) preserva a proveniência do dado — importante porque o
Épico 2 usa o estoque para a lista de compras reversa, e a confiança no dado varia por
origem.

## Histórico financeiro

Cada item de nota gera um registro em `historico_precos` (produto, mercado, preço, data).
Essa série temporal por produto/mercado é a base do "Semáforo de Preço" do Épico 3 — este
épico não implementa a UI de semáforo, apenas garante que os dados existem.

## Fora de escopo nesta fase

- Scanner de EAN na prateleira (isso é Épico 3).
- Cobertura de todas as 27 UFs — começamos por São Paulo, o ambiente SVRS (compartilhado
  por diversos estados menores) e Paraíba (portal próprio, `sefaz.pb.gov.br` — prioridade
  por ser onde o app está sendo testado inicialmente); demais UFs entram incrementalmente.
  O parser de PB não foi validado contra uma nota real (o ambiente de desenvolvimento não
  conseguiu alcançar o domínio para inspecionar o HTML ao vivo) — assume o mesmo template
  "Consulta Pública Simplificada" usado por SP/SVRS; a primeira nota real escaneada em
  produção é o teste de verdade.
- Correção assistida por IA de itens não reconhecidos (fica como melhoria futura; nesta fase
  o matching é heurístico via `pg_trgm`, sem LLM).
