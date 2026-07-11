import type { NfceParser } from "../types";
import { parseGenericConsultaSimplificada } from "./genericTemplate";

/**
 * Parser para o ambiente SVRS (Sefaz Virtual do Rio Grande do Sul),
 * compartilhado por diversos estados menores. Um único parser aqui cobre
 * várias UFs de uma vez — ver specs/adr/0005 para a justificativa dessa
 * escolha.
 *
 * IMPORTANTE: a lista de UFs abaixo é a que efetivamente usa o *domínio*
 * svrs.rs.gov.br para a consulta (confirmar/expandir conforme forem
 * testadas) — não presuma que uma UF usa esse ambiente só porque é um
 * estado pequeno. A Paraíba, por exemplo, tem portal próprio
 * (`sefaz.pb.gov.br`, ver `pb.ts`), apesar de estar frequentemente listada
 * como usuária do SVRS em fontes desatualizadas.
 */
export const svrsParser: NfceParser = {
  uf: ["RS", "AC", "AL", "AP", "BA", "PI", "RR", "SC", "SE"],
  matches(url) {
    return url.hostname.endsWith("nfce.svrs.rs.gov.br") || url.hostname.endsWith("sefaz.rs.gov.br");
  },
  parse: parseGenericConsultaSimplificada,
};
