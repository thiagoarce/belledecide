export interface ParsedNfceItem {
  descricaoExtraida: string;
  quantidade: number;
  unidade: string | null;
  valorUnitario: number | null;
  valorTotal: number | null;
}

export interface ParsedNfce {
  chaveAcesso: string;
  mercadoNome: string | null;
  mercadoCnpj: string | null;
  emitidaEm: string | null;
  itens: ParsedNfceItem[];
}

/**
 * Um parser por UF (ou por ambiente compartilhado entre UFs, ex: SVRS).
 * Ver specs/adr/0005-nfce-parser-plugin-architecture.md.
 */
export interface NfceParser {
  /** UF ou lista de UFs cobertas por este parser (apenas informativo/log). */
  uf: string | string[];
  matches(url: URL): boolean;
  parse(html: string, url: URL): ParsedNfce;
}

/**
 * linkedom não publica tipos de DOM completos (querySelectorAll retorna um
 * NodeList sem generics) — esta interface mínima é o suficiente para o que
 * os parsers precisam ler de cada elemento.
 */
export interface LinkedomElement {
  textContent: string | null;
  querySelector(selector: string): LinkedomElement | null;
}

export class NfceParseError extends Error {
  constructor(
    message: string,
    readonly htmlSnippet: string,
  ) {
    super(message);
  }
}
