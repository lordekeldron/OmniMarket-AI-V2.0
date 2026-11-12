import { createFileRoute } from "@tanstack/react-router";

// Rota mais específica que /api/$: o despachante genérico só aceita GET/POST e não
// consegue definir cookies, que é o que as conexões precisam.
async function handle(request: Request) {
  const { handleConnectorsRequest } = await import("@/omni-server/connectors/http");
  return handleConnectorsRequest(request, {
    secret: process.env["CONNECTOR_SECRET"],
    appUrl: process.env["APP_URL"],
  });
}

export const Route = createFileRoute("/api/connections/$")({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      POST: ({ request }) => handle(request),
      PATCH: ({ request }) => handle(request),
      DELETE: ({ request }) => handle(request),
    },
  },
});
