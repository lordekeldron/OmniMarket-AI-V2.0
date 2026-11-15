import { createFileRoute } from "@tanstack/react-router";

// O webhook precisa ler cabeçalhos e a query string, que o despachante genérico de /api/$ não repassa.
async function handle(request: Request) {
  const { handlePaymentsRequest } = await import("@/omni-server/payments/http");
  return handlePaymentsRequest(request, {
    accessToken: process.env["MP_ACCESS_TOKEN"],
    webhookSecret: process.env["MP_WEBHOOK_SECRET"],
    appUrl: process.env["APP_URL"],
    tokenPriceBrl: process.env["TOKEN_PRICE_BRL"],
  });
}

export const Route = createFileRoute("/api/payments/$")({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      POST: ({ request }) => handle(request),
    },
  },
});
