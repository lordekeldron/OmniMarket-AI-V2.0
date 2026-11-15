import { createFileRoute } from "@tanstack/react-router";
import OmniApp from "@/omni/App";

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

function Index() {
  return <OmniApp />;
}
