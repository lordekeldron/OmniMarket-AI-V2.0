/**
 * Validação da assinatura das notificações do Mercado Pago (cabeçalho `x-signature`).
 * Texto assinado: `id:<data.id>;request-id:<x-request-id>;ts:<ts>;` com HMAC-SHA256
 * usando a "assinatura secreta" do painel. Roda no Worker (WebCrypto), sem Node.
 */
const MAX_AGE_MS = 10 * 60 * 1000;

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyWebhookSignature(input: {
  secret: string;
  signatureHeader: string | null;
  requestId: string | null;
  dataId: string | null;
  now?: number;
}): Promise<boolean> {
  const { secret, signatureHeader, requestId, dataId } = input;
  if (!secret || !signatureHeader || !requestId || !dataId) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => {
      const i = p.indexOf("=");
      return [p.slice(0, i).trim(), p.slice(i + 1).trim()];
    }),
  );
  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) return false;

  // Recusa notificações antigas demais (reenvio malicioso). O ts pode vir em segundos ou milissegundos.
  const tsMs = Number(ts) < 1e12 ? Number(ts) * 1000 : Number(ts);
  if (!Number.isFinite(tsMs) || Math.abs((input.now ?? Date.now()) - tsMs) > MAX_AGE_MS) return false;

  // O Mercado Pago assina com o id em minúsculas quando ele é alfanumérico.
  const manifest = `id:${/^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId};request-id:${requestId};ts:${ts};`;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expected = hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(manifest)));
  return safeEqual(expected, v1.toLowerCase());
}
