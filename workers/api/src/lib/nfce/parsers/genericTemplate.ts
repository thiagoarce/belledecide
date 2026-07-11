import { parseHTML } from "linkedom";
import type { LinkedomElement, ParsedNfce, ParsedNfceItem } from "../types";
import { NfceParseError } from "../types";
import { extractChaveAcesso, parseBrNumber } from "../normalizeItem";

/**
 * Parsing da "Consulta Pública Simplificada de NFC-e" — o template de portal
 * (tabela #tabResult, spans .txtTit/.Rqtd/.RvlUnit/.valor) reaproveitado por
 * SP, pelo ambiente SVRS e por PB. Um único parser aqui evita reescrever a
 * mesma extração a cada UF nova que usar esse mesmo template.
 *
 * NOTA: os seletores refletem o layout público historicamente conhecido
 * desse template. Cada UF ainda pode ter pequenas variações — se
 * `parse_failed` aparecer para uma UF específica, o snippet salvo em
 * `notas_fiscais.parse_error` é o ponto de partida pra ajustar aqui.
 */
export function parseGenericConsultaSimplificada(html: string, url: URL): ParsedNfce {
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

  return {
    chaveAcesso,
    mercadoNome,
    mercadoCnpj,
    emitidaEm: null,
    itens,
  };
}
