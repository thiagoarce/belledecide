/**
 * Allowlist de hosts conhecidos dos portais de consulta de NFC-e. A URL do
 * QR code vem de uma foto tirada pelo usuário — input não confiável — então
 * nunca fazemos fetch de um host fora desta lista (defesa contra SSRF).
 * Ver specs/adr/0005-nfce-parser-plugin-architecture.md.
 */
const ALLOWED_HOSTS = new Set([
  // São Paulo
  "www.nfce.fazenda.sp.gov.br",
  "nfce.fazenda.sp.gov.br",
  // Ambiente SVRS (compartilhado por diversos estados menores)
  "nfce.svrs.rs.gov.br",
  "www.sefaz.rs.gov.br",
]);

const FETCH_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 2_000_000;

export class HostNotAllowedError extends Error {}
export class FetchFailedError extends Error {}

export async function fetchNfceHtml(qrUrl: string): Promise<{ html: string; url: URL }> {
  let url: URL;
  try {
    url = new URL(qrUrl);
  } catch {
    throw new HostNotAllowedError("URL do QR code inválida");
  }

  if (url.protocol !== "https:" || !ALLOWED_HOSTS.has(url.hostname)) {
    throw new HostNotAllowedError(`Host não permitido: ${url.hostname}`);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url.toString(), { signal: controller.signal });
    if (!res.ok) {
      throw new FetchFailedError(`Portal da SEFAZ retornou status ${res.status}`);
    }
    const body = await res.text();
    if (body.length > MAX_RESPONSE_BYTES) {
      throw new FetchFailedError("Resposta da SEFAZ excedeu o tamanho máximo esperado");
    }
    return { html: body, url };
  } catch (err) {
    if (err instanceof FetchFailedError || err instanceof HostNotAllowedError) throw err;
    throw new FetchFailedError(
      err instanceof Error ? err.message : "Falha ao buscar a nota fiscal na SEFAZ",
    );
  } finally {
    clearTimeout(timeout);
  }
}
