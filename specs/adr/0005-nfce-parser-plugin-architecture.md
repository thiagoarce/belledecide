# ADR 0005 — Arquitetura de parser de NFC-e plugável por UF

## Status
Aceito

## Contexto
O QR code da NFC-e aponta para uma URL da SEFAZ do estado emissor; cada UF (ou grupo de UFs)
tem seu próprio portal e layout de HTML. Não existe uma API unificada nacional para consultar
o conteúdo de uma nota a partir da chave de acesso.

## Decisão
1. Interface comum:
   ```ts
   interface NfceParser {
     uf: string | string[];
     matches(url: URL): boolean;
     parse(html: string, url: URL): ParsedNfce;
   }
   ```
2. `registry.ts` resolve o parser certo a partir do hostname da URL recebida.
3. Cobertura inicial: **São Paulo** (parser dedicado) e o **ambiente SVRS**, portal
   colaborativo usado por diversos estados menores — escolhido deliberadamente por "comprar"
   cobertura de várias UFs com um único parser, validando que a abstração de fato generaliza
   (em vez de dois parsers 1:1 isolados, que provariam menos sobre o design).
4. UF sem parser correspondente → `status='unsupported_uf'` — tratado como resultado válido
   e esperado no domínio, não como exceção lançada.
5. Parsing de HTML via **`linkedom`** (DOM tradicional, `querySelectorAll`) — mais direto
   para extrair uma tabela de itens do que `HTMLRewriter` nativo do Workers, que é otimizado
   para streaming/transformação, não para queries de DOM.
6. Fetch da URL do QR code **sempre a partir do Worker**, nunca do client, com allowlist de
   hostnames SEFAZ conhecidos (defesa contra SSRF, já que a URL vem de uma foto tirada pelo
   usuário — input não confiável) e timeout curto via `AbortController`.

## Justificativa
Cobertura de 100% das UFs no dia 1 não é viável nem necessário para validar o produto — a
arquitetura plugável permite adicionar parsers incrementalmente sem tocar no restante do
fluxo (rota, persistência, matching de produto). Falha graciosa (`unsupported_uf`) é
essencial porque, nas fases iniciais, a maioria das notas de fato não terá parser — isso
precisa ser uma experiência de usuário aceitável (inserir manualmente), não um erro 500.

## Consequências
- Adicionar uma UF nova = implementar `NfceParser` + registrar em `registry.ts` + teste com
  uma amostra real de HTML daquela UF — sem tocar em `routes/nfce.ts`.
- Portais mudam de layout ao longo do tempo; `parse_failed` guarda um snippet do HTML bruto
  (não a página inteira, para não estourar armazenamento) especificamente para permitir
  diagnóstico e correção do parser depois.
