import type { NfceParser } from "./types";
import { spParser } from "./parsers/sp";
import { svrsParser } from "./parsers/svrs";
import { pbParser } from "./parsers/pb";

const parsers: NfceParser[] = [spParser, svrsParser, pbParser];

/** Retorna o parser cuja UF cobre a URL, ou null se nenhuma UF for suportada ainda. */
export function resolveParser(url: URL): NfceParser | null {
  return parsers.find((parser) => parser.matches(url)) ?? null;
}
