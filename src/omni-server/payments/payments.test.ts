// @vitest-environment node
import { describe, expect, test } from "vitest";
import { handlePaymentsRequest, type PaymentsEnv } from "./http";
import { MemoryLedger } from "./ledger";
import { resolvePricing, validateQuantity } from "./pricing";
import type { GatewayPayment, MercadoPagoGateway, PreferenceInput } from "./service";
import { verifyWebhookSignature } from "./signature";

const SECRET = "segredo-de-webhook-de-teste";

async function sign(dataId: string, requestId: string, ts: string, secret = SECRET) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`id:${dataId};request-id:${requestId};ts:${ts};`));
  return [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function setup(payments: Record<string, GatewayPayment> = {}, overrides: Partial<PaymentsEnv> = {}) {
  const created: PreferenceInput[] = [];
  const gateway: MercadoPagoGateway = {
    async createPreference(input) {
      created.push(input);
      return { initPoint: "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=abc" };
    },
    async getPayment(id) {
      return payments[id];
    },
  };
  const ledger = new MemoryLedger();
  const env: PaymentsEnv = { accessToken: "APP_USR-x", webhookSecret: SECRET, appUrl: "https://omni.example.com", tokenPriceBrl: "0.10", gateway, ledger, ...overrides };
  const call = (path: string, init?: RequestInit) => handlePaymentsRequest(new Request(`https://omni.example.com/api/payments/${path}`, init), env);
  return { created, ledger, call };
}

const post = (body: unknown, headers: Record<string, string> = {}): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json", ...headers },
  body: JSON.stringify(body),
});

const approved = (id: string, tokens: number, amount: number, user = "ana@x.com"): GatewayPayment => ({
  id,
  status: "approved",
  statusDetail: "accredited",
  amount,
  currency: "BRL",
  metadata: { tokens, user_id: user },
});

describe("preço e quantidade", () => {
  const pricing = resolvePricing("0.10");

  test("preço vem em centavos e valor inválido volta ao padrão", () => {
    expect(pricing).toEqual({ priceCents: 10, minTokens: 10, maxTokens: 100_000 });
    expect(resolvePricing("0,25").priceCents).toBe(25);
    expect(resolvePricing("abc").priceCents).toBe(10);
    expect(resolvePricing("-3").priceCents).toBe(10);
    expect(resolvePricing(undefined).priceCents).toBe(10);
  });

  test("aceita só inteiros positivos dentro dos limites", () => {
    expect(validateQuantity(250, pricing)).toEqual({ ok: true, tokens: 250 });
    expect(validateQuantity("1200", pricing)).toEqual({ ok: true, tokens: 1200 });
    for (const bad of [0, -5, 1.5, "1e3", "12abc", "", null, undefined, NaN, Infinity, 9, 100_001, {}]) {
      expect(validateQuantity(bad, pricing).ok, String(bad)).toBe(false);
    }
  });
});

describe("assinatura do webhook", () => {
  const now = Date.now();
  const ts = String(now);

  test("aceita assinatura correta e recusa adulterada, de outro segredo ou antiga", async () => {
    const v1 = await sign("123", "req-1", ts);
    const base = { secret: SECRET, requestId: "req-1", dataId: "123", now };
    expect(await verifyWebhookSignature({ ...base, signatureHeader: `ts=${ts},v1=${v1}` })).toBe(true);
    expect(await verifyWebhookSignature({ ...base, signatureHeader: `ts=${ts},v1=${"0".repeat(64)}` })).toBe(false);
    expect(await verifyWebhookSignature({ ...base, dataId: "124", signatureHeader: `ts=${ts},v1=${v1}` })).toBe(false);
    expect(await verifyWebhookSignature({ ...base, secret: "outro", signatureHeader: `ts=${ts},v1=${v1}` })).toBe(false);
    expect(await verifyWebhookSignature({ ...base, now: now + 60 * 60 * 1000, signatureHeader: `ts=${ts},v1=${v1}` })).toBe(false);
    expect(await verifyWebhookSignature({ ...base, signatureHeader: null })).toBe(false);
  });
});

describe("checkout", () => {
  test("cria a preferência com valor calculado no servidor e ignora preço enviado pelo navegador", async () => {
    const { call, created } = setup();
    const res = await call("checkout", post({ tokens: 250, userId: "ana@x.com", amount: 0.01, price: 0.01 }));
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ amount: 25, tokens: 250, init_point: expect.stringContaining("mercadopago.com.br") });
    expect(created[0]).toMatchObject({
      amount: 25,
      metadata: { tokens: 250, user_id: "ana@x.com" },
      notificationUrl: "https://omni.example.com/api/payments/webhook",
      autoReturn: true,
    });
    expect(created[0]?.externalReference).toMatch(/^omni_/);
  });

  test("em localhost não usa auto_return nem notification_url", async () => {
    const { call, created } = setup({}, { appUrl: "http://localhost:3000" });
    await call("checkout", post({ tokens: 100, userId: "u1" }));
    expect(created[0]?.autoReturn).toBe(false);
    expect(created[0]?.notificationUrl).toBeUndefined();
  });

  test("recusa quantidade inválida, usuário inválido e origem de outro site", async () => {
    const { call, created } = setup();
    expect((await call("checkout", post({ tokens: 3, userId: "u1" }))).status).toBe(400);
    expect((await call("checkout", post({ tokens: "abc", userId: "u1" }))).status).toBe(400);
    expect((await call("checkout", post({ tokens: 100, userId: "<script>" }))).status).toBe(400);
    expect((await call("checkout", post({ tokens: 100, userId: "u1" }, { Origin: "https://evil.example" }))).status).toBe(403);
    expect(created).toHaveLength(0);
  });

  test("sem MP_ACCESS_TOKEN responde 503 claro, mas /config continua funcionando", async () => {
    const { call } = setup({}, { accessToken: undefined, gateway: undefined });
    const res = await call("checkout", post({ tokens: 100, userId: "u1" }));
    expect(res.status).toBe(503);
    expect(((await res.json()) as { error: string }).error).toMatch(/MP_ACCESS_TOKEN/);
    expect(await (await call("config")).json()).toMatchObject({ configured: false, priceCents: 10, minTokens: 10 });
  });
});

describe("webhook e crédito de saldo", () => {
  async function notify(call: ReturnType<typeof setup>["call"], id: string, opts: { secret?: string; type?: string } = {}) {
    const ts = String(Date.now());
    const v1 = await sign(id, "req-9", ts, opts.secret);
    return call(`webhook?data.id=${id}&type=payment`, post({ type: opts.type ?? "payment", data: { id } }, { "x-signature": `ts=${ts},v1=${v1}`, "x-request-id": "req-9" }));
  }

  test("credita uma única vez, mesmo com notificação repetida e com a página de retorno", async () => {
    const { call, ledger } = setup({ "555": approved("555", 250, 25) });
    expect((await notify(call, "555")).status).toBe(200);
    expect((await notify(call, "555")).status).toBe(200);
    const status = await (await call("status?payment_id=555")).json();
    expect(status).toMatchObject({ state: "approved", tokens: 250, balance: 250, credited: false });
    expect(await ledger.balance("ana@x.com")).toBe(250);
  });

  test("recusa assinatura falsa e não credita nada", async () => {
    const { call, ledger } = setup({ "555": approved("555", 250, 25) });
    expect((await notify(call, "555", { secret: "errado" })).status).toBe(401);
    expect(await ledger.balance("ana@x.com")).toBe(0);
  });

  test("não credita pagamento pendente, rejeitado ou com valor menor que o devido", async () => {
    const { call, ledger } = setup({
      "1": { ...approved("1", 250, 25), status: "pending" },
      "2": { ...approved("2", 250, 25), status: "rejected" },
      "3": approved("3", 250, 1), // pagou R$ 1,00 mas pede 250 tokens (R$ 25,00)
      "4": { ...approved("4", 250, 25), currency: "USD" },
    });
    expect(await (await call("status?payment_id=1")).json()).toMatchObject({ state: "pending" });
    expect(await (await call("status?payment_id=2")).json()).toMatchObject({ state: "rejected" });
    expect(await (await call("status?payment_id=3")).json()).toMatchObject({ state: "invalid" });
    expect(await (await call("status?payment_id=4")).json()).toMatchObject({ state: "invalid" });
    expect(await ledger.balance("ana@x.com")).toBe(0);
  });

  test("ignora outros tópicos e identificadores malformados", async () => {
    const { call } = setup();
    expect(await (await notify(call, "777", { type: "merchant_order" })).json()).toMatchObject({ ignored: true });
    expect(await (await call("status?payment_id=abc")).json()).toMatchObject({ state: "invalid" });
    expect(await (await call("status?payment_id=999")).json()).toMatchObject({ state: "invalid" });
  });

  test("sem MP_WEBHOOK_SECRET o webhook recusa com 503", async () => {
    const { call } = setup({}, { webhookSecret: undefined });
    expect((await notify(call, "1")).status).toBe(503);
  });
});
