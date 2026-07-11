/** Converte "1.234,56" (formato monetário brasileiro) para 1234.56. */
export function parseBrNumber(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw.trim().replace(/\./g, "").replace(",", ".");
  const value = Number.parseFloat(cleaned);
  return Number.isFinite(value) ? value : null;
}

/** Extrai a chave de acesso (44 dígitos) de um texto solto da página. */
export function extractChaveAcesso(text: string): string | null {
  const match = text.replace(/\s/g, "").match(/\d{44}/);
  return match?.[0] ?? null;
}

/** NfceParser.uf pode ser uma UF única ou uma lista (ambiente compartilhado). */
export function firstUf(uf: string | string[]): string {
  return Array.isArray(uf) ? (uf[0] ?? "??") : uf;
}
