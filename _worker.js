// Fexos AI backend (Cloudflare Pages advanced mode)
// API key dibaca dari Variables and Secrets: GEMINI_API_KEY
const MODELS = ["gemini-2.5-flash","gemini-2.5-pro","gemini-2.5-flash-lite","gemini-2.0-flash"];
const SYSTEM = "Kamu adalah Fexos AI, asisten AI yang ramah, cerdas, dan to the point. Jawab dalam bahasa yang dipakai pengguna (default Bahasa Indonesia). Jika ditanya siapa kamu, jawab bahwa kamu adalah Fexos AI. Gunakan format markdown rapi untuk kode dan daftar.";

const err = (status, message) =>
  new Response(JSON.stringify({ error: { message } }), {
    status, headers: { "Content-Type": "application/json" }
  });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/chat") {
      if (request.method !== "POST") return err(405, "Method tidak diizinkan");

      // Hanya terima request dari situs ini sendiri
      const origin = request.headers.get("Origin");
      if (origin && new URL(origin).host !== url.host) return err(403, "Origin tidak diizinkan");

      if (!env.GEMINI_API_KEY)
        return err(500, "GEMINI_API_KEY belum diatur di Cloudflare (Settings > Variables and Secrets), lalu deploy ulang.");

      let body;
      try { body = await request.json(); } catch { return err(400, "Body bukan JSON"); }
      if (!Array.isArray(body.contents) || !body.contents.length) return err(400, "contents kosong");

      const model = MODELS.includes(body.model) ? body.model : MODELS[0];
      const upstream = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM }] },
            contents: body.contents.slice(-40)
          })
        }
      );
      return new Response(upstream.body, {
        status: upstream.status,
        headers: {
          "Content-Type": upstream.headers.get("Content-Type") || "text/event-stream",
          "Cache-Control": "no-store"
        }
      });
    }

    return env.ASSETS.fetch(request); // file statis (index.html)
  }
};
