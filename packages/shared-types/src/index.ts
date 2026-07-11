import { z } from "zod";

/**
 * Schemas compartilhados entre apps/web e workers/api.
 * Fonte de verdade dos contratos descritos em specs/api-contracts.md e
 * specs/data-model.md — qualquer mudança nesses documentos deve refletir aqui.
 */

// ── Épico 2: Perfil da família ──────────────────────────────────────────

export const FamilyProfileSchema = z.object({
  familyId: z.string().uuid(),
  tamanho: z.number().int().positive(),
  criancas: z.number().int().nonnegative(),
  alergias: z.array(z.string()),
  aversoes: z.array(z.string()),
  preferencias: z.record(z.string(), z.unknown()),
  updatedAt: z.string().datetime().optional(),
});
export type FamilyProfile = z.infer<typeof FamilyProfileSchema>;

// ── Épico 1: Estoque ────────────────────────────────────────────────────

export const PantryItemOrigemSchema = z.enum(["manual", "nfce", "ia"]);

export const PantryItemSchema = z.object({
  id: z.string().uuid().optional(),
  familyId: z.string().uuid(),
  produtoId: z.string().uuid().nullable(),
  nomeLivre: z.string().nullable(),
  quantidade: z.number().nonnegative(),
  unidadeMedida: z.string().nullable(),
  validade: z.string().date().nullable().optional(),
  origem: PantryItemOrigemSchema,
});
export type PantryItem = z.infer<typeof PantryItemSchema>;

export const CreatePantryItemSchema = z.object({
  produtoId: z.string().uuid().nullable().optional(),
  nomeLivre: z.string().min(1).nullable().optional(),
  quantidade: z.number().positive(),
  unidadeMedida: z.string().nullable().optional(),
  validade: z.string().date().nullable().optional(),
}).refine((v) => Boolean(v.produtoId || v.nomeLivre), {
  message: "produtoId ou nomeLivre é obrigatório",
});
export type CreatePantryItem = z.infer<typeof CreatePantryItemSchema>;

// ── Épico 2: Geração de cardápio (POST /v1/menu/generate) ──────────────

export const MenuGenerationRequestSchema = z.object({
  ideiaSemente: z.string().min(2, "Ideia semente muito curta").max(200),
});
export type MenuGenerationRequest = z.infer<typeof MenuGenerationRequestSchema>;

export const CardapioDiaSchema = z.object({
  dia: z.number().int().positive(),
  refeicao: z.string(),
  ingredientes_usados: z.array(z.string()),
});

export const ListaCompraItemSchema = z.object({
  item: z.string(),
  quantidade: z.string(),
  setor: z.string(),
});

/**
 * Schema exato exigido pelo System Prompt (specs/02-epico-2-cerebro-cozinha.md):
 * a LLM deve retornar única e exclusivamente este formato. Usado tanto como
 * output_config.format (json_schema) na chamada à Claude quanto como validação
 * defensiva pós-resposta.
 */
export const LLMMenuOutputSchema = z.object({
  cardapio: z.array(CardapioDiaSchema),
  lista_compras: z.array(ListaCompraItemSchema),
  guia_execucao: z.array(z.string()),
});
export type LLMMenuOutput = z.infer<typeof LLMMenuOutputSchema>;

export const MenuGenerationResponseSchema = LLMMenuOutputSchema.extend({
  id: z.string().uuid(),
  status: z.enum(["generating", "ready", "failed"]),
});
export type MenuGenerationResponse = z.infer<typeof MenuGenerationResponseSchema>;

// ── Épico 1: Scan de NFC-e (POST /v1/nfce/scan) ─────────────────────────

export const NfceScanRequestSchema = z.object({
  qrUrl: z.string().url(),
});
export type NfceScanRequest = z.infer<typeof NfceScanRequestSchema>;

export const NotaFiscalStatusSchema = z.enum([
  "pending",
  "parsed",
  "partial",
  "parse_failed",
  "fetch_failed",
  "unsupported_uf",
  "duplicate",
]);
export type NotaFiscalStatus = z.infer<typeof NotaFiscalStatusSchema>;

export const NfceItemSchema = z.object({
  descricaoExtraida: z.string(),
  produtoId: z.string().uuid().nullable(),
  quantidade: z.number(),
  unidade: z.string().nullable(),
  valorTotal: z.number().nullable(),
  matchedConfidence: z.number().min(0).max(1).nullable(),
});
export type NfceItem = z.infer<typeof NfceItemSchema>;

export const NfceScanResponseSchema = z.object({
  notaId: z.string().uuid(),
  status: NotaFiscalStatusSchema,
  mercado: z
    .object({ nome: z.string().nullable(), cnpj: z.string().nullable() })
    .nullable()
    .optional(),
  itens: z.array(NfceItemSchema),
  itensNaoReconhecidos: z.number().int().nonnegative(),
  message: z.string().optional(),
});
export type NfceScanResponse = z.infer<typeof NfceScanResponseSchema>;

// ── Erros padronizados do Worker ────────────────────────────────────────

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;
