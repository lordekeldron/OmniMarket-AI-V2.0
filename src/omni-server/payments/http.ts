import { resolvePricing } from "./pricing";
import { sharedLedger, type TokenLedger } from "./ledger";
import { PaymentError, PaymentsService, sdkGateway, type MercadoPagoGateway } from "./service";
import { verifyWebhookSignature } from "./signature";

export interface PaymentsEnv {
  accessToken: string | undefined;
  webhookSecret: string | undefined;
  appUrl: string | undefined;
  tokenPriceBrl: string | undefined;
  /** Só para testes. */
  gateway?: MercadoPagoGateway | undefined;
  ledger?: TokenLedger | undefined;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

/** Rotas de pagamento: /api/payments/{config,checkout,status,balance,webhook}. */
export async function handlePaymentsRequest(request: Request, env: PaymentsEnv): Promise<Response> {
  const url = new URL(request.url);
  const route = url.pathname.replace(/^\/api\/payments\/?/, "").replace(/\/$/, "");
  const pricing = resolvePricing(env.tokenPriceBrl);
  const appUrl = (env.appUrl?.trim() || url.origin).replace(/\/$/, "");

  try {
    if (route === "config" && request.method === "GET") {
      const { currency, priceCents, minTokens, maxTokens } = new PaymentsService({
        gateway: env.gateway ?? stub,
        ledger: env.ledger ?? sharedLedger(),
        pricing,
        appUrl,
      }).config();
      return json({ configured: Boolean(env.accessToken || env.gateway), currency, priceCents, minTokens, maxTokens });
    }

    const gateway = env.gateway ?? (env.accessToken ? sdkGateway(env.accessToken) : undefined);
    if (!gateway) {
      return json({ error: "Pagamentos ainda não configurados: falta o segredo MP_ACCESS_TOKEN." }, 503);
    }
    const service = new PaymentsService({ gateway, ledger: env.ledger ?? sharedLedger(), pricing, appUrl });

    if (route === "checkout" && request.method === "POST") {
      if (!sameOrigin(request)) return json({ error: "Origem não permitida." }, 403);
      const body = (await request.json().catch(() => ({}))) as { tokens?: unknown; userId?: unknown };
      const { initPoint, amount, tokens } = await service.createCheckout({ tokens: body.tokens, userId: body.userId });
      return json({ init_point: initPoint, amount, tokens }, 201);
    }

    if (route === "status" && request.method === "GET") {
      return json(await service.settle(url.searchParams.get("payment_id") ?? ""));
    }

    if (route === "balance" && request.method === "GET") {
      return json({ balance: await service.balance(url.searchParams.get("userId")) });
    }

    if (route === "webhook" && request.method === "POST") {
      if (!env.webhookSecret) return json({ error: "Falta o segredo MP_WEBHOOK_SECRET." }, 503);
      const body = (await request.json().catch(() => ({}))) as { type?: string; data?: { id?: string | number } };
      const dataId = url.searchParams.get("data.id") ?? (body.data?.id !== undefined ? String(body.data.id) : null);
      const valid = await verifyWebhookSignature({
        secret: env.webhookSecret,
        signatureHeader: request.headers.get("x-signature"),
        requestId: request.headers.get("x-request-id"),
        dataId,
      });
      if (!valid) return json({ error: "Assinatura inválida." }, 401);

      // Outros tópicos (ex.: merchant_order) não interessam: responde 200 para não gerar reenvio.
      const topic = body.type ?? url.searchParams.get("type") ?? url.searchParams.get("topic");
      if (topic !== "payment" || !dataId) return json({ ok: true, ignored: true });

      await service.settle(String(dataId));
      return json({ ok: true });
    }

    return json({ error: "Rota não encontrada." }, 404);
  } catch (e) {
    if (e instanceof PaymentError) return json({ error: e.message }, e.status);
    // Erro inesperado (rede, Mercado Pago fora do ar): 502 faz o webhook ser reenviado.
    console.error("payments:", e instanceof Error ? e.message : e);
    return json({ error: "Não foi possível falar com o Mercado Pago agora. Tente novamente." }, 502);
  }
}

/** Gateway vazio, usado só para ler /config sem token configurado. */
const stub: MercadoPagoGateway = {
  async createPreference() {
    throw new Error("not configured");
  },
  async getPayment() {
    throw new Error("not configured");
  },
};

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // chamadas não-navegador (curl) não são alvo de CSRF
  try {
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? new URL(request.url).host;
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
