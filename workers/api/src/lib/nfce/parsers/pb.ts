import type { NfceParser } from "../types";
import { parseGenericConsultaSimplificada } from "./genericTemplate";

/**
 * Parser para o portal de Consulta Pública de NFC-e da Paraíba. NÃO é o
 * ambiente SVRS (diferente do que fontes mais antigas sugerem) — é um
 * domínio próprio, e o host real varia por nota: a documentação oficial da
 * SEFAZ-PB anuncia `www.sefaz.pb.gov.br`, mas uma nota real escaneada em
 * João Pessoa (2026-07) apontava para `www4.sefaz.pb.gov.br` — provavelmente
 * balanceamento entre vários servidores numerados. `fetchNfce.ts` já cobre
 * isso com um padrão `www\d*.sefaz.pb.gov.br`.
 *
 * Confirmado via QR code decodificado de 2 notas reais (João Pessoa,
 * 2026-07): `http://www.sefaz.pb.gov.br/nfce?p=<chave44digitos>|2|1|1|<hash>`
 * — protocolo http, path `/nfce` (recibos mais antigos usam `/nfce/consulta`,
 * também coberto). O HTML de resultado ainda não foi validado — o domínio
 * não foi alcançável a partir do ambiente de desenvolvimento (rede/firewall
 * do governo, não um problema do app). Assumimos o template "Consulta
 * Pública Simplificada" usado por SP e pelo ambiente SVRS, o mais comum
 * entre portais estaduais. Se a próxima nota real escaneada em João Pessoa
 * cair em `parse_failed`, o snippet salvo em `notas_fiscais.parse_error`
 * mostra o HTML real pra ajustar os seletores em `genericTemplate.ts`.
 */
export const pbParser: NfceParser = {
  uf: "PB",
  matches(url) {
    return url.hostname.endsWith("sefaz.pb.gov.br");
  },
  parse: parseGenericConsultaSimplificada,
};
