/**
 * Preço dos tokens. Tudo em centavos inteiros para nunca depender de ponto flutuante.
 * O navegador só informa a QUANTIDADE; o valor cobrado é sempre recalculado no servidor.
 */

export const CURRENCY = "BRL";
/** Valor mínimo de uma compra (R$ 1,00) e máximo (R$ 10.000,00), em centavos. */
export const MIN_AMOUNT_CENTS = 100;
export const MAX_AMOUNT_CENTS = 1_000_000;

const DEFAULT_PRICE_CENTS = 10; // R$ 0,10 por token

export interface Pricing {
  priceCents: number;
  minTokens: number;
  maxTokens: number;
}

/** Lê `TOKEN_PRICE_BRL` (ex.: "0.10" ou "0,10"). Valor inválido volta ao padrão. */
export function resolvePricing(raw: string | undefined): Pricing {
  let priceCents = DEFAULT_PRICE_CENTS;
  const parsed = Number((raw ?? "").trim().replace(",", "."));
  if (raw && Number.isFinite(parsed) && parsed > 0) {
    const cents = Math.round(parsed * 100);
    if (cents >= 1 && cents <= MAX_AMOUNT_CENTS) priceCents = cents;
  }
  return {
    priceCents,
    minTokens: Math.ceil(MIN_AMOUNT_CENTS / priceCents),
    maxTokens: Math.floor(MAX_AMOUNT_CENTS / priceCents),
  };
}

export type QuantityResult = { ok: true; tokens: number } | { ok: false; error: string };

/** Aceita só inteiros positivos dentro dos limites; recusa texto, decimais e notação científica. */
export function validateQuantity(value: unknown, pricing: Pricing): QuantityResult {
  const n = typeof value === "string" && /^\d{1,9}$/.test(value.trim()) ? Number(value.trim()) : value;
  if (typeof n !== "number" || !Number.isInteger(n) || n <= 0) {
    return { ok: false, error: "Informe uma quantidade inteira de tokens." };
  }
  if (n < pricing.minTokens) {
    return { ok: false, error: `A compra mínima é de ${pricing.minTokens} tokens.` };
  }
  if (n > pricing.maxTokens) {
    return { ok: false, error: `A compra máxima é de ${pricing.maxTokens} tokens por pagamento.` };
  }
  return { ok: true, tokens: n };
}

export const totalCents = (tokens: number, pricing: Pricing): number => tokens * pricing.priceCents;

/** Valor no formato que a API do Mercado Pago espera: número com no máximo 2 casas. */
export const centsToAmount = (cents: number): number => Number((cents / 100).toFixed(2));
