import "dotenv/config";
import { createServer } from "http";
import { explainPlan } from "./api/explain";

const server = createServer((req, res) => {
  // Basic headers so RN fetch is happy
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== "POST" || req.url !== "/explain") {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
    return;
  }

  let body = "";
  req.on("data", (chunk) => (body += chunk.toString("utf8")));

  req.on("end", async () => {
    try {
      const parsed = JSON.parse(body || "{}");
      const prompt = parsed.prompt;
      const context = parsed.context;

      if (typeof prompt !== "string" || !prompt.trim()) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Missing prompt" }));
        return;
      }

      const text = await explainPlan(prompt, context);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ text }));
    } catch (err: any) {
      console.error("Server error:", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: String(err?.message ?? err) }));
    }
  });
});

const PORT = Number(process.env.PORT || 3333);

// IMPORTANT: bind to 0.0.0.0 so your phone can reach it
server.listen(PORT, "0.0.0.0", () => {
  console.log(`LLM server running on http://0.0.0.0:${PORT}`);
});
