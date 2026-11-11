// Minimal Gemini-SDK-compatible wrapper around the Lovable AI Gateway.
export function createAiClient() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return null;
  return {
    models: {
      async generateContent({ contents, config }: { model?: string; contents: unknown; config?: any }) {
        const text = typeof contents === "string" ? contents : JSON.stringify(contents);
        const messages: { role: string; content: string }[] = [];
        if (config?.systemInstruction) messages.push({ role: "system", content: String(config.systemInstruction) });
        messages.push({ role: "user", content: text });
        const wantsJson = config?.responseMimeType === "application/json";
        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages,
            ...(wantsJson ? { response_format: { type: "json_object" } } : {}),
          }),
        });
        if (!res.ok) throw new Error(`AI gateway ${res.status}: ${await res.text()}`);
        const data = await res.json();
        return { text: data.choices?.[0]?.message?.content ?? "" };
      },
    },
  };
}
