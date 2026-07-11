import type { MiddlewareHandler } from "hono";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { Env } from "../env";
import { supabaseAdmin } from "../lib/supabaseAdmin";

export interface AuthContext {
  userId: string;
  familyId: string;
}

declare module "hono" {
  interface ContextVariableMap {
    auth: AuthContext;
  }
}

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks(env: Env) {
  if (!jwks) {
    jwks = createRemoteJWKSet(
      new URL(`${env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`),
    );
  }
  return jwks;
}

/**
 * Verifies the Supabase-issued JWT via JWKS, then resolves the caller's
 * family via family_members (service-role — RLS does not apply here).
 * MVP assumes exactly one family per user.
 */
export const requireAuth: MiddlewareHandler<{ Bindings: Env }> = async (
  c,
  next,
) => {
  const authHeader = c.req.header("Authorization");
  const token = authHeader?.match(/^Bearer (.+)$/)?.[1];
  if (!token) {
    return c.json(
      { error: { code: "unauthorized", message: "Missing bearer token" } },
      401,
    );
  }

  let userId: string;
  try {
    const { payload } = await jwtVerify(token, getJwks(c.env));
    if (!payload.sub) throw new Error("token missing sub");
    userId = payload.sub;
  } catch {
    return c.json(
      { error: { code: "unauthorized", message: "Invalid or expired token" } },
      401,
    );
  }

  const admin = supabaseAdmin(c.env);
  const { data, error } = await admin
    .from("family_members")
    .select("family_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return c.json(
      { error: { code: "not_found", message: "Nenhuma família encontrada para este usuário" } },
      404,
    );
  }

  c.set("auth", { userId, familyId: data.family_id });
  await next();
};
