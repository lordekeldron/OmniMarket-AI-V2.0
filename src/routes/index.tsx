import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const OmniApp = lazy(() => import("@/omni/ClientApp"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OmniMarket AI — Central de marketing com IA" },
      { name: "description", content: "Tendências, campanhas, audiência e ROI da sua marca em um só painel com IA." },
      { property: "og:title", content: "OmniMarket AI — Central de marketing com IA" },
      { property: "og:description", content: "Tendências, campanhas, audiência e ROI da sua marca em um só painel com IA." },
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
