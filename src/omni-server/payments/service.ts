import { MercadoPagoConfig, Payment, Preference } from "mercadopago";
import { centsToAmount, CURRENCY, totalCents, validateQuantity, type Pricing } from "./pricing";
import type { TokenLedger } from "./ledger";

export interface PreferenceInput {
  title: string;
  amount: number;
  externalReference: string;
  metadata: Record<string, string | number>;
  backUrls: { success: string; failure: string; pending: string };
  notificationUrl: string | undefined;
  autoReturn: boolean;
}

export interface GatewayPayment {
  id: string;
  status: string;
  statusDetail: string | undefined;
  amount: number;
  currency: string | undefined;
  metadata: Record<string, unknown>;
}

/** Fronteira com o Mercado Pago: o resto do código não conhece o SDK (e os testes usam um falso). */
export interface MercadoPagoGateway {
  createPreference(input: PreferenceInput): Promise<{ initPoint: string }>;
  getPayment(id: string): Promise<GatewayPayment | undefined>;
}

export function sdkGateway(accessToken: string): MercadoPagoGateway {
  const client = new MercadoPagoConfig({ accessToken, options: { timeout: 15_000 } });
  return {
    async createPreference(input) {
      const result = await new Preference(client).create({
        body: {
          items: [
            {
              id: "tokens",
              title: input.title,
              quantity: 1,
              unit_price: input.amount,
              currency_id: CURRENCY,
            },
          ],
          back_urls: input.backUrls,
          // auto_return só é aceito com APP_URL público em https:// ; com localhost ou 127.0.0.1 o
          // Mercado Pago recusa a preferência, então ele é omitido (autoReturn já vem false nesse caso).
          ...(input.autoReturn ? { auto_return: "approved" as const } : {}),
          ...(input.notificationUrl ? { notification_url: input.notificationUrl } : {}),
          external_reference: input.externalReference,
          metadata: input.metadata,
          statement_descriptor: "OMNIMARKET",
        },
      });
      // Sempre init_point: o Mercado Pago não tem sandbox.
      if (!result.init_point) throw new Error("O Mercado Pago não devolveu o link de pagamento.");
      return { initPoint: result.init_point };
    },
    async getPayment(id) {
      try {
        const p = await new Payment(client).get({ id });
        return {
          id: String(p.id),
          status: String(p.status ?? "unknown"),
          statusDetail: p.status_detail,
          amount: Number(p.transaction_amount ?? 0),
          currency: p.currency_id,
          metadata: (p.metadata ?? {}) as Record<string, unknown>,
        };
      } catch (e) {
        const status = (e as { status?: number }).status;
        if (status === 404) return undefined;
        throw e;
      }
    },
  };
}

export class PaymentError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export type PaymentOutcome =
  | { state: "approved"; tokens: number; balance: number; credited: boolean }
  | { state: "pending" | "rejected" | "unknown"; detail: string | undefined }
  | { state: "invalid"; reason: string };

export interface ServiceOptions {
  gateway: MercadoPagoGateway;
  ledger: TokenLedger;
  pricing: Pricing;
  /** Origem pública do app, sem barra final. */
  appUrl: string;
}

const USER_ID = /^[\w.@+-]{1,120}$/;

// Rejeitado/cancelado são finais; o resto ainda pode mudar.
const FINAL_BAD = new Set(["rejected", "cancelled", "refunded", "charged_back"]);

export class PaymentsService {
  constructor(private readonly o: ServiceOptions) {}

  private get publicHttps(): boolean {
    return /^https:\/\//i.test(this.o.appUrl) && !/^https:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|\/|$)/i.test(this.o.appUrl);
  }

  config() {
    const { priceCents, minTokens, maxTokens } = this.o.pricing;
    return { currency: CURRENCY, priceCents, minTokens, maxTokens };
  }

  async createCheckout(input: { tokens: unknown; userId: unknown }): Promise<{ initPoint: string; amount: number; tokens: number }> {
    const q = validateQuantity(input.tokens, this.o.pricing);
    if (!q.ok) throw new PaymentError(q.error, 400);
    if (typeof input.userId !== "string" || !USER_ID.test(input.userId)) {
      throw new PaymentError("Usuário inválido para a compra.", 400);
    }
    // O valor nunca vem do navegador.
    const amount = centsToAmount(totalCents(q.tokens, this.o.pricing));
    const base = this.o.appUrl;
    const { initPoint } = await this.o.gateway.createPreference({
      title: `${q.tokens.toLocaleString("pt-BR")} tokens OmniMarket AI`,
      amount,
      externalReference: `omni_${crypto.randomUUID()}`,
      metadata: { tokens: q.tokens, user_id: input.userId },
      backUrls: {
        success: `${base}/?mp_return=success`,
        failure: `${base}/?mp_return=failure`,
        pending: `${base}/?mp_return=pending`,
      },
      notificationUrl: this.publicHttps ? `${base}/api/payments/webhook` : undefined,
      autoReturn: this.publicHttps,
    });
    return { initPoint, amount, tokens: q.tokens };
  }

  /**
   * Confere o pagamento DIRETO no Mercado Pago (nunca confia em parâmetros do navegador
   * nem no corpo da notificação) e credita o saldo uma única vez.
   * Chamado pelo webhook e pela página de retorno; os dois caminhos são idempotentes.
   */
  async settle(paymentId: string): Promise<PaymentOutcome> {
    if (!/^\d{1,20}$/.test(paymentId)) return { state: "invalid", reason: "Identificador de pagamento inválido." };
    const payment = await this.o.gateway.getPayment(paymentId);
    if (!payment) return { state: "invalid", reason: "Pagamento não encontrado." };

    if (payment.status !== "approved") {
      const state = FINAL_BAD.has(payment.status) ? "rejected" : payment.status === "unknown" ? "unknown" : "pending";
      return { state, detail: payment.statusDetail };
    }

    const tokens = Number(payment.metadata["tokens"]);
    const userId = payment.metadata["user_id"];
    if (typeof userId !== "string" || !USER_ID.test(userId)) {
      return { state: "invalid", reason: "Pagamento sem usuário associado." };
    }
    const q = validateQuantity(tokens, this.o.pricing);
    if (!q.ok) return { state: "invalid", reason: "Quantidade de tokens do pagamento é inválida." };
    // Impede creditar mais tokens do que o valor pago cobre (e moeda errada).
    const expected = centsToAmount(totalCents(q.tokens, this.o.pricing));
    if (payment.currency !== CURRENCY || Math.abs(payment.amount - expected) > 0.001) {
      return { state: "invalid", reason: "O valor pago não corresponde à quantidade de tokens." };
    }

    const result = await this.o.ledger.credit({ paymentId: payment.id, userId, tokens: q.tokens });
    return { state: "approved", tokens: q.tokens, balance: result.balance, credited: result.credited };
  }

  balance(userId: unknown): Promise<number> {
    if (typeof userId !== "string" || !USER_ID.test(userId)) throw new PaymentError("Usuário inválido.", 400);
    return this.o.ledger.balance(userId);
  }
}
