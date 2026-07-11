import { Hono } from "hono";
import type { Env } from "../env";
import { requireAuth } from "../middleware/auth";
import { supabaseAdmin } from "../lib/supabaseAdmin";
import { ClaudeProvider, LLMRefusalError, LLMValidationError } from "../lib/llm/claudeProvider";
import {
  MenuGenerationRequestSchema,
  type FamilyProfile,
  type PantryItem,
} from "@belledecide/shared-types";
import Anthropic from "@anthropic-ai/sdk";

export const menuRoute = new Hono<{ Bindings: Env }>();

menuRoute.post("/generate", requireAuth, async (c) => {
  const auth = c.get("auth");
  const body = await c.req.json().catch(() => null);
  const parsed = MenuGenerationRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: { code: "invalid_request", message: parsed.error.message } },
      400,
    );
  }

  const admin = supabaseAdmin(c.env);

  const [{ data: profileRow }, { data: pantryRows }] = await Promise.all([
    admin
      .from("family_profile")
      .select("family_id, tamanho, criancas, alergias, aversoes, preferencias")
      .eq("family_id", auth.familyId)
      .single(),
    admin
      .from("estoque_casa")
      .select("id, family_id, produto_id, nome_livre, quantidade, unidade_medida, validade, origem")
      .eq("family_id", auth.familyId),
  ]);

  const profile: FamilyProfile = {
    familyId: auth.familyId,
    tamanho: profileRow?.tamanho ?? 1,
    criancas: profileRow?.criancas ?? 0,
    alergias: profileRow?.alergias ?? [],
    aversoes: profileRow?.aversoes ?? [],
    preferencias: profileRow?.preferencias ?? {},
  };

  const pantry: PantryItem[] = (pantryRows ?? []).map((row) => ({
    id: row.id,
    familyId: row.family_id,
    produtoId: row.produto_id,
    nomeLivre: row.nome_livre,
    quantidade: row.quantidade,
    unidadeMedida: row.unidade_medida,
    validade: row.validade,
    origem: row.origem,
  }));

  const { data: inserted, error: insertError } = await admin
    .from("cardapios_gerados")
    .insert({
      family_id: auth.familyId,
      ideia_semente: parsed.data.ideiaSemente,
      status: "generating",
      created_by: auth.userId,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return c.json(
      { error: { code: "internal_error", message: "Falha ao registrar geração de cardápio" } },
      500,
    );
  }

  const provider = new ClaudeProvider(c.env.ANTHROPIC_API_KEY, c.env.LLM_MODEL);

  try {
    const { output, model } = await provider.generateMenu({
      ideiaSemente: parsed.data.ideiaSemente,
      profile,
      pantry,
    });

    await admin
      .from("cardapios_gerados")
      .update({
        status: "ready",
        cardapio_json: output.cardapio,
        lista_compras_json: output.lista_compras,
        guia_execucao_json: output.guia_execucao,
        llm_model: model,
      })
      .eq("id", inserted.id);

    return c.json({
      id: inserted.id,
      status: "ready",
      cardapio: output.cardapio,
      lista_compras: output.lista_compras,
      guia_execucao: output.guia_execucao,
    });
  } catch (err) {
    await admin.from("cardapios_gerados").update({ status: "failed" }).eq("id", inserted.id);

    if (err instanceof LLMRefusalError) {
      return c.json(
        { error: { code: "refusal", message: "Não foi possível gerar um cardápio para esta ideia semente" } },
        422,
      );
    }
    if (err instanceof LLMValidationError) {
      return c.json(
        { error: { code: "invalid_llm_output", message: err.message } },
        500,
      );
    }
    if (err instanceof Anthropic.RateLimitError || err instanceof Anthropic.InternalServerError) {
      c.header("Retry-After", "5");
      return c.json(
        { error: { code: "llm_unavailable", message: "Serviço de IA temporariamente indisponível" } },
        503,
      );
    }
    return c.json(
      { error: { code: "internal_error", message: "Erro inesperado ao gerar cardápio" } },
      500,
    );
  }
});
