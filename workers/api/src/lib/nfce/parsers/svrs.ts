import { parseHTML } from "linkedom";
import type { LinkedomElement, NfceParser, ParsedNfce, ParsedNfceItem } from "../types";
import { NfceParseError } from "../types";
import { extractChaveAcesso, parseBrNumber } from "../normalizeItem";

/**
 * Parser para o ambiente SVRS (Sefaz Virtual do Rio Grande do Sul),
 * compartilhado por diversos estados menores. Um único parser aqui cobre
 * várias UFs de uma vez — ver specs/adr/0005 para a justificativa dessa
 * escolha. Layout (tabela #tabResult) é o mesmo padrão usado pelo portal de
 * SP; a lista exata de UFs atendidas pelo ambiente compartilhado deve ser
 * confirmada/expandida em `matches()` conforme forem testadas.
 */
export const svrsParser: NfceParser = {
  uf: ["RS", "AC", "AL", "AP", "BA", "PB", "PI", "RR", "SC", "SE"],
  matches(url) {
    return url.hostname.endsWith("nfce.svrs.rs.gov.br") || url.hostname.endsWith("sefaz.rs.gov.br");
  },
  parse(html, url) {
    const { document } = parseHTML(html);

    const chaveAcesso =
      extractChaveAcesso(document.querySelector(".chave")?.textContent ?? "") ??
      extractChaveAcesso(url.searchParams.get("p") ?? "") ??
      extractChaveAcesso(html);

    if (!chaveAcesso) {
      throw new NfceParseError(
        "Não foi possível localizar a chave de acesso na página",
        html.slice(0, 50_000),
      );
    }

    const mercadoNome = document.querySelector(".txtTopo")?.textContent?.trim() ?? null;
    const mercadoCnpjMatch = document.body.textContent?.match(/CNPJ:\s*([\d./-]+)/i);
    const mercadoCnpj = mercadoCnpjMatch?.[1]?.trim() ?? null;

    // linkedom não publica tipos de DOM completos; querySelectorAll resolve
    // como NodeList sem generics, então tipamos os elementos explicitamente.
    const rows: LinkedomElement[] = Array.from(document.querySelectorAll("#tabResult tr"));
    const itens: ParsedNfceItem[] = [];

    for (const row of rows) {
      const descricao = row.querySelector(".txtTit")?.textContent?.trim();
      if (!descricao) continue;

      const qtdText = row.querySelector(".Rqtd")?.textContent ?? "";
      const unidade = row.querySelector(".RUN")?.textContent?.replace(/UN:\s*/i, "").trim() ?? null;
      const valorUnitario = parseBrNumber(
        row.querySelector(".RvlUnit")?.textContent?.replace(/Vl\.\s*Unit\.:\s*/i, "") ?? null,
      );
      const valorTotal = parseBrNumber(row.querySelector(".valor")?.textContent ?? null);
      const quantidade = parseBrNumber(qtdText.replace(/Qtde\.:\s*/i, "")) ?? 1;

      itens.push({
        descricaoExtraida: descricao,
        quantidade,
        unidade,
        valorUnitario,
        valorTotal,
      });
    }

    if (itens.length === 0) {
      throw new NfceParseError(
        "Nenhum item foi encontrado na tabela da nota",
        html.slice(0, 50_000),
      );
    }

    const parsed: ParsedNfce = {
      chaveAcesso,
      mercadoNome,
      mercadoCnpj,
      emitidaEm: null,
      itens,
    };
    return parsed;
  },
};
