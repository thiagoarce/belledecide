import type { NfceParser } from "../types";
import { parseGenericConsultaSimplificada } from "./genericTemplate";

/**
 * Parser para o portal de Consulta Pública de NFC-e de São Paulo — usa o
 * template compartilhado da "Consulta Pública Simplificada". Ver
 * genericTemplate.ts e specs/adr/0005-nfce-parser-plugin-architecture.md.
 */
export const spParser: NfceParser = {
  uf: "SP",
  matches(url) {
    return url.hostname.endsWith("nfce.fazenda.sp.gov.br");
  },
  parse: parseGenericConsultaSimplificada,
};
