import { parseHTML } from "linkedom";
import type { LinkedomElement, NfceParser, ParsedNfce, ParsedNfceItem } from "../types";
import { NfceParseError } from "../types";
import { extractChaveAcesso, parseBrNumber } from "../normalizeItem";

/**
 * Parser para o portal de Consulta Pública de NFC-e de São Paulo.
 *
 * NOTA DE IMPLEMENTAÇÃO: os seletores abaixo refletem o layout público
 * conhecido da "Consulta Pública Simplificada de NFC-e" (tabela #tabResult,
 * spans .Rqtd/.RvlUnit/.valor por item). Como o portal pode mudar de layout
 * sem aviso, trate isso como ponto de partida — validar contra uma nota real
 * antes de confiar em produção, e usar o snippet salvo em parse_failed para
 * ajustar os seletores quando a extração falhar (ver specs/01-*.md).
 */
export const spParser: NfceParser = {
  uf: "SP",
  matches(url) {
    return url.hostname.endsWith("nfce.fazenda.sp.gov.br");
  },
  parse(html, url) {
    const { document } = parseHTML(html);

    const chaveFromPage = document.querySelector(".chave")?.textContent ?? "";
    const chaveAcesso =
      extractChaveAcesso(chaveFromPage) ??
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
