import { createFileRoute } from "@tanstack/react-router";
import { AgentsGuidePage } from "@/omni/components/AgentsGuidePage";

export const Route = createFileRoute("/agentes")({
  head: () => ({
    meta: [
      { title: "Agentes de IA — OmniMarket AI" },
      {
        name: "description",
        content:
          "Conheça as especialidades, missões e responsabilidades dos agentes de marketing da OmniMarket AI.",
      },
    ],
  }),
  component: AgentsGuidePage,
});
