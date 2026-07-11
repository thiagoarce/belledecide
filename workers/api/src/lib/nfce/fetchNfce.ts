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
  // Paraíba — portal próprio, não é SVRS. QR codes reais usam http:// (não
  // https), por isso o protocolo não é restringido abaixo.
  "www.sefaz.pb.gov.br",
  "sefaz.pb.gov.br",
]);

/**
 * PB balanceia QR codes reais entre vários subdomínios numerados
 * (www2/www3/www4.sefaz.pb.gov.br...) — confirmado escaneando uma nota real
 * em João Pessoa em 2026-07, que apontava para www4, não para www. como a
 * documentação oficial da SEFAZ sugeria. O padrão é restrito (só "www" +
 * dígitos opcionais + o domínio exato), então continua sendo uma allowlist,
 * não um wildcard genérico.
 */
const PB_HOST_PATTERN = /^www\d*\.sefaz\.pb\.gov\.br$/;

function isHostAllowed(hostname: string): boolean {
  return ALLOWED_HOSTS.has(hostname) || PB_HOST_PATTERN.test(hostname);
}

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

  // Alguns portais estaduais (ex: PB) ainda emitem QR codes com http:// —
  // a defesa contra SSRF está na allowlist de host, não no protocolo.
  if ((url.protocol !== "https:" && url.protocol !== "http:") || !isHostAllowed(url.hostname)) {
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
