import "dotenv/config";
import { createServer } from "http";
import { explainPlan } from "./api/explain.js";
import { deleteTokens, exchangeCode, getWhoopDay, refreshWhoopSession } from "./whoop.js";

const MAX_BODY_BYTES = 64 * 1024; // 64KB
const ALLOWED_ORIGINS = (
  process.env.CORS_ORIGINS ||
  "http://localhost:8081,http://localhost:19006,http://127.0.0.1:8081,http://127.0.0.1:19006,exp://127.0.0.1:8081"
)
  .split(",")
  .map((x) => x.trim())
  .filter(Boolean);
const SERVER_API_KEY = process.env.SERVER_API_KEY;
const WHOOP_CLIENT_ID = process.env.WHOOP_CLIENT_ID || "";
const WHOOP_CLIENT_SECRET = process.env.WHOOP_CLIENT_SECRET || "";
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 60; // requests per IP per minute
const ipBuckets = new Map<string, { count: number; resetAt: number }>();
const sessionBuckets = new Map<string, { count: number; resetAt: number }>();

function sendJson(res: any, status: number, payload: any) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
}

function allowCors(req: any, res: any) {
  const origin = String(req.headers.origin || "");
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Api-Key, Authorization");
}

function isAllowedOrigin(req: any): boolean {
  const origin = String(req.headers.origin || "");
  if (!origin) return true; // non-browser clients
  return ALLOWED_ORIGINS.includes(origin);
}

function isValidISODate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return false;
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}` === date;
}

function rateLimit(ip: string): boolean {
  const bucket = ipBuckets.get(ip) ?? { count: 0, resetAt: Date.now() + RATE_LIMIT_WINDOW_MS };
  if (Date.now() > bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = Date.now() + RATE_LIMIT_WINDOW_MS;
  }
  bucket.count += 1;
  ipBuckets.set(ip, bucket);
  return bucket.count > RATE_LIMIT_MAX;
}

function rateLimitSession(sessionId: string): boolean {
  const bucket = sessionBuckets.get(sessionId) ?? { count: 0, resetAt: Date.now() + RATE_LIMIT_WINDOW_MS };
  if (Date.now() > bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = Date.now() + RATE_LIMIT_WINDOW_MS;
  }
  bucket.count += 1;
  sessionBuckets.set(sessionId, bucket);
  return bucket.count > 30;
}

function bearerToken(req: any): string | null {
  const auth = req.headers["authorization"];
  if (typeof auth !== "string") return null;
  const [scheme, token] = auth.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

async function readBody(req: any): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk: Buffer) => {
      body += chunk.toString("utf8");
      if (Buffer.byteLength(body, "utf8") > MAX_BODY_BYTES) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function parseJsonBody(body: string) {
  try {
    return JSON.parse(body || "{}");
  } catch {
    const err = new Error("Invalid JSON body");
    (err as any).statusCode = 400;
    throw err;
  }
}

const server = createServer(async (req, res) => {
  allowCors(req, res);
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (!isAllowedOrigin(req)) {
    sendJson(res, 403, { error: "Origin not allowed" });
    return;
  }

  const ip = req.socket.remoteAddress ?? "unknown";
  if (rateLimit(ip)) {
    sendJson(res, 429, { error: "Rate limit exceeded. Try again soon." });
    return;
  }

  if (SERVER_API_KEY && req.headers["x-api-key"] !== SERVER_API_KEY) {
    sendJson(res, 401, { error: "Unauthorized" });
    return;
  }

  try {
    if (req.method === "GET" && (req.url === "/" || req.url === "/health")) {
      return sendJson(res, 200, {
        ok: true,
        service: "lba-backend",
        at: new Date().toISOString(),
        whoopConfigured: !!(WHOOP_CLIENT_ID && WHOOP_CLIENT_SECRET),
        llmConfigured: !!process.env.OPENAI_API_KEY,
        routes: [
          "GET  /health",
          "POST /whoop/exchange",
          "GET  /whoop/day?date=YYYY-MM-DD",
          "POST /whoop/refresh",
          "DELETE /whoop/session",
          "POST /explain",
        ],
      });
    }

    // --- WHOOP routes ---
    if (req.method === "POST" && req.url === "/whoop/exchange") {
      const body = await readBody(req);
      const parsed = parseJsonBody(body);
      const { code, redirectUri, participantId } = parsed;
      if (!code || !redirectUri) {
        return sendJson(res, 400, { error: "Missing code/redirectUri" });
      }
      if (!WHOOP_CLIENT_ID || !WHOOP_CLIENT_SECRET) {
        return sendJson(res, 500, { error: "WHOOP credentials not configured" });
      }
      const sessionToken = await exchangeCode(participantId ?? null, code, redirectUri, WHOOP_CLIENT_ID, WHOOP_CLIENT_SECRET);
      return sendJson(res, 200, { ok: true, sessionToken });
    }

    if (req.method === "GET" && req.url?.startsWith("/whoop/day")) {
      const url = new URL(req.url, "http://localhost");
      const date = url.searchParams.get("date");
      const sessionToken = bearerToken(req);
      if (!date || !sessionToken) return sendJson(res, 400, { error: "Missing date or bearer token" });
      if (!isValidISODate(date)) return sendJson(res, 400, { error: "Invalid date format. Use YYYY-MM-DD." });
      if (rateLimitSession(sessionToken)) return sendJson(res, 429, { error: "Session rate limit exceeded" });
      const today = new Date().toISOString().slice(0, 10);
      if (date > today) return sendJson(res, 400, { error: "Future dates not allowed" });
      if (!WHOOP_CLIENT_ID || !WHOOP_CLIENT_SECRET) {
        return sendJson(res, 500, { error: "WHOOP credentials not configured" });
      }
      const data = await getWhoopDay(sessionToken, date, WHOOP_CLIENT_ID, WHOOP_CLIENT_SECRET);
      return sendJson(res, 200, { ok: true, data });
    }

    if (req.method === "POST" && req.url === "/whoop/refresh") {
      const sessionToken = bearerToken(req);
      if (!sessionToken) return sendJson(res, 400, { error: "Missing bearer token" });
      const ok = await refreshWhoopSession(sessionToken, WHOOP_CLIENT_ID, WHOOP_CLIENT_SECRET);
      if (!ok) return sendJson(res, 401, { error: "Session expired or missing" });
      return sendJson(res, 200, { ok: true });
    }

    if (req.method === "DELETE" && req.url?.startsWith("/whoop/session")) {
      const sessionToken = bearerToken(req);
      if (!sessionToken) return sendJson(res, 400, { error: "Missing sessionToken" });
      await deleteTokens(sessionToken);
      return sendJson(res, 200, { ok: true });
    }

    // --- Explain route ---
    if (req.method === "POST" && req.url === "/explain") {
      const body = await readBody(req);
      const parsed = parseJsonBody(body);
      const prompt = parsed.prompt;
      const context = parsed.context;
      if (typeof prompt !== "string" || !prompt.trim()) {
        return sendJson(res, 400, { error: "Missing prompt" });
      }
      const text = await explainPlan(prompt, context);
      return sendJson(res, 200, { text });
    }

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
  } catch (err: any) {
    const message = String(err?.message ?? err ?? "unknown");
    const statusCode = Number(err?.statusCode || 500);
    console.error("Server error:", message);
    sendJson(res, statusCode, { error: message });
  }
});

const PORT = Number(process.env.PORT || 3333);

// IMPORTANT: bind to 0.0.0.0 so your phone can reach it
server.listen(PORT, "0.0.0.0", () => {
  console.log(`LLM server running on http://0.0.0.0:${PORT}`);
});
