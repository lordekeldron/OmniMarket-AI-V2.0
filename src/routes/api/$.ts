import { createFileRoute } from "@tanstack/react-router";

async function dispatch(request: Request, method: string) {
  const { routes } = await import("@/omni-server/handlers");
  const url = new URL(request.url);
  for (const r of routes) {
    if (r.method !== method) continue;
    const re = new RegExp("^" + r.path.replace(/:(\w+)/g, "(?<$1>[^/]+)") + "$");
    const m = url.pathname.match(re);
    if (!m) continue;
    const body = method === "POST" ? await request.json().catch(() => ({})) : {};
    let status = 200;
    let payload: unknown = null;
    const res = {
      status(c: number) {
        status = c;
        return res;
      },
      json(d: unknown) {
        payload = d;
        return res;
      },
    };
    await r.handler(
      { body, params: (m.groups ?? {}) as Record<string, string>, headers: request.headers },
      res,
    );
    return Response.json(payload, { status });
  }
  return Response.json({ error: "Not found" }, { status: 404 });
}

export const Route = createFileRoute("/api/$")({
  server: {
    handlers: {
      GET: ({ request }) => dispatch(request, "GET"),
      POST: ({ request }) => dispatch(request, "POST"),
    },
  },
});
