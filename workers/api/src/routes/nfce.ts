import { Hono, type Context } from "hono";
import type { Env } from "../env";
import { requireAuth } from "../middleware/auth";
import { supabaseAdmin } from "../lib/supabaseAdmin";
import { NfceScanRequestSchema, type NotaFiscalStatus } from "@belledecide/shared-types";
import { fetchNfceHtml, FetchFailedError, HostNotAllowedError } from "../lib/nfce/fetchNfce";
import { resolveParser } from "../lib/nfce/registry";
import { NfceParseError } from "../lib/nfce/types";
import { firstUf } from "../lib/nfce/normalizeItem";

export const nfceRoute = new Hono<{ Bindings: Env }>();

nfceRoute.post("/scan", requireAuth, async (c) => {
  const auth = c.get("auth");
  const body = await c.req.json().catch(() => null);
  const parsed = NfceScanRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: { code: "invalid_request", message: parsed.error.message } },
      400,
    );
  }

  const admin = supabaseAdmin(c.env);
  const { qrUrl } = parsed.data;

  let html: string;
  let url: URL;
  try {
    ({ html, url } = await fetchNfceHtml(qrUrl));
  } catch (err) {
    if (err instanceof HostNotAllowedError) {
      return c.json({ error: { code: "host_not_allowed", message: err.message } }, 403);
    }
    return respondWithStatus(c, admin, auth.familyId, auth.userId, {
      uf: "??",
      qrUrl,
      status: "fetch_failed",
      message: err instanceof FetchFailedError ? err.message : "Falha ao buscar a nota fiscal",
    });
  }

  const parser = resolveParser(url);
  if (!parser) {
    return respondWithStatus(c, admin, auth.familyId, auth.userId, {
      uf: url.hostname,
      qrUrl,
      status: "unsupported_uf",
      message: "Ainda não há suporte para o portal de notas fiscais deste estado.",
    });
  }

  let result;
  try {
    result = parser.parse(html, url);
  } catch (err) {
    const snippet = err instanceof NfceParseError ? err.htmlSnippet : html.slice(0, 50_000);
    const { data: nota } = await admin
      .from("notas_fiscais")
      .insert({
        family_id: auth.familyId,
        uploaded_by: auth.userId,
        chave_acesso: `parse-failed-${crypto.randomUUID()}`,
        uf: firstUf(parser.uf),
        qr_url: qrUrl,
        status: "parse_failed",
        parse_error: snippet,
      })
      .select("id")
      .single();
    return c.json({
      notaId: nota?.id ?? null,
      status: "parse_failed",
      itens: [],
      itensNaoReconhecidos: 0,
      message: "Não foi possível extrair os itens desta nota. Você pode inserir manualmente.",
    });
  }

  const { data: existing } = await admin
    .from("notas_fiscais")
    .select("id, status")
    .eq("family_id", auth.familyId)
    .eq("chave_acesso", result.chaveAcesso)
    .maybeSingle();

  if (existing) {
    return c.json({
      notaId: existing.id,
      status: "duplicate",
      itens: [],
      itensNaoReconhecidos: 0,
      message: "Esta nota já havia sido escaneada anteriormente.",
    });
  }

  const uf = firstUf(parser.uf);
  const { data: nota, error: notaError } = await admin
    .from("notas_fiscais")
    .insert({
      family_id: auth.familyId,
      uploaded_by: auth.userId,
      chave_acesso: result.chaveAcesso,
      uf,
      qr_url: qrUrl,
      status: "parsed",
      mercado_nome: result.mercadoNome,
      mercado_cnpj: result.mercadoCnpj,
      emitida_em: result.emitidaEm,
    })
    .select("id")
    .single();

  if (notaError || !nota) {
    return c.json(
      { error: { code: "internal_error", message: "Falha ao gravar a nota fiscal" } },
      500,
    );
  }

  let itensNaoReconhecidos = 0;
  const itensResponse = [];

  for (const item of result.itens) {
    const { data: matches } = await admin.rpc("match_produto", {
      busca: item.descricaoExtraida,
      min_similarity: 0.35,
    });
    const match = (matches as { produto_id: string; similarity: number }[] | null)?.[0] ?? null;

    const produtoId = match?.produto_id ?? null;
    if (!produtoId) itensNaoReconhecidos += 1;

    await admin.from("notas_fiscais_itens").insert({
      nota_id: nota.id,
      produto_id: produtoId,
      descricao_extraida: item.descricaoExtraida,
      quantidade: item.quantidade,
      unidade: item.unidade,
      valor_unitario: item.valorUnitario,
      valor_total: item.valorTotal,
      matched_confidence: match?.similarity ?? null,
    });

    await admin.from("estoque_casa").insert({
      family_id: auth.familyId,
      produto_id: produtoId,
      nome_livre: produtoId ? null : item.descricaoExtraida,
      quantidade: item.quantidade,
      unidade_medida: item.unidade,
      origem: "nfce",
    });

    if (produtoId && item.valorUnitario != null && result.mercadoNome) {
      await admin.from("historico_precos").insert({
        family_id: auth.familyId,
        produto_id: produtoId,
        mercado_nome: result.mercadoNome,
        mercado_cnpj: result.mercadoCnpj,
        preco_pago: item.valorUnitario,
      });
    }

    itensResponse.push({
      descricaoExtraida: item.descricaoExtraida,
      produtoId,
      quantidade: item.quantidade,
      unidade: item.unidade,
      valorTotal: item.valorTotal,
      matchedConfidence: match?.similarity ?? null,
    });
  }

  const status: NotaFiscalStatus = itensNaoReconhecidos > 0 ? "partial" : "parsed";
  if (status !== "parsed") {
    await admin.from("notas_fiscais").update({ status }).eq("id", nota.id);
  }

  return c.json({
    notaId: nota.id,
    status,
    mercado: { nome: result.mercadoNome, cnpj: result.mercadoCnpj },
    itens: itensResponse,
    itensNaoReconhecidos,
  });
});

async function respondWithStatus(
  c: Context<{ Bindings: Env }>,
  admin: ReturnType<typeof supabaseAdmin>,
  familyId: string,
  userId: string,
  info: { uf: string; qrUrl: string; status: NotaFiscalStatus; message: string },
) {
  const { data: nota } = await admin
    .from("notas_fiscais")
    .insert({
      family_id: familyId,
      uploaded_by: userId,
      chave_acesso: `${info.status}-${crypto.randomUUID()}`,
      uf: info.uf,
      qr_url: info.qrUrl,
      status: info.status,
    })
    .select("id")
    .single();

  return c.json({
    notaId: nota?.id ?? null,
    status: info.status,
    itens: [],
    itensNaoReconhecidos: 0,
    message: info.message,
  });
}
