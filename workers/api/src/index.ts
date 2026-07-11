import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./env";
import { menuRoute } from "./routes/menu";
import { nfceRoute } from "./routes/nfce";

const app = new Hono<{ Bindings: Env }>();

app.use("*", async (c, next) => {
  const corsMiddleware = cors({ origin: c.env.ALLOWED_ORIGIN, allowHeaders: ["Authorization", "Content-Type"] });
  return corsMiddleware(c, next);
});

app.get("/v1/health", (c) => c.json({ status: "ok" }));

app.route("/v1/menu", menuRoute);
app.route("/v1/nfce", nfceRoute);

export default app;
