import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const OmniApp = lazy(() => import("@/omni/ClientApp"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OmniMarket AI — Central de marketing com IA" },
      {
        name: "description",
        content:
          "Inteligência de mercado global para transformar sinais em crescimento, com estratégia e agentes de IA em um só workspace.",
      },
      { property: "og:title", content: "OmniMarket AI — Inteligência de mercado global" },
      {
        property: "og:description",
        content:
          "Inteligência de mercado global para transformar sinais em crescimento, com estratégia e agentes de IA em um só workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

function Index() {
  return (
    <ClientOnly fallback={<Loading />}>
      <Suspense fallback={<Loading />}>
        <OmniApp />
      </Suspense>
    </ClientOnly>
  );
}
