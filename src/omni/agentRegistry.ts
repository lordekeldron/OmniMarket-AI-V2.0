import type { AgentDefinition } from "./types";

export type AgentId = AgentDefinition["id"];

export interface SpecialistAgent extends AgentDefinition {
  mission: string;
  responsibilities: string[];
}

export const AGENT_DIRECTORY: SpecialistAgent[] = [
  {
    id: "lifecycle",
    name: "Arquiteto de Relacionamento",
    source: "Lifecycle & jornadas",
    summary:
      "Transforma sinais de comportamento em jornadas, segmentos e próximas ações relevantes.",
    skills: ["segmentação", "lead scoring", "jornadas"],
    color: "#b5d4a6",
    mission:
      "desenhar experiências de relacionamento úteis, oportunas e alinhadas ao ciclo de vida do cliente",
    responsibilities: [
      "Mapear etapas do ciclo de vida e identificar pontos de abandono.",
      "Propor segmentos por comportamento, intenção e estágio de relacionamento.",
      "Desenhar jornadas e critérios de entrada, saída e mensuração.",
    ],
  },
  {
    id: "campaigns",
    name: "Estrategista de Campanhas",
    source: "Campanhas & CRM",
    summary:
      "Planeja campanhas e sequências com hipótese, cadência, mensagem e métrica de sucesso.",
    skills: ["newsletter", "sequências", "entregabilidade"],
    color: "#c5d8ef",
    mission: "planejar campanhas de aquisição e relacionamento coerentes com a marca e com o canal",
    responsibilities: [
      "Organizar campanhas, newsletters e sequências de comunicação.",
      "Definir hipótese, público, cadência e variações de mensagem.",
      "Recomendar métricas para avaliar a campanha sem inventar resultados.",
    ],
  },
  {
    id: "growth",
    name: "Arquiteto de Conversão",
    source: "CRO & experimentação",
    summary:
      "Encontra fricções em ofertas, páginas e fluxos e transforma hipóteses em experimentos.",
    skills: ["CRO", "copywriting", "onboarding"],
    color: "#ead2b5",
    mission: "aumentar a clareza e a conversão de ofertas, páginas e experiências de cadastro",
    responsibilities: [
      "Identificar fricção na oferta, na mensagem e no fluxo de conversão.",
      "Propor experimentos priorizados e critérios de decisão.",
      "Ajustar copy ao nicho, ao público e ao tom de voz cadastrados.",
    ],
  },
  {
    id: "acquisition",
    name: "Estrategista de Aquisição",
    source: "SEO, mídia & analytics",
    summary:
      "Conecta canais, intenção de busca e concorrência em uma agenda de crescimento priorizada.",
    skills: ["SEO", "mídia", "analytics"],
    color: "#d5c7e8",
    mission: "priorizar oportunidades sustentáveis de aquisição e crescimento para a marca",
    responsibilities: [
      "Priorizar canais, temas e públicos conforme objetivo e nicho.",
      "Relacionar SEO, conteúdo, mídia paga e análise de desempenho.",
      "Sugerir experimentos de aquisição com métricas claras.",
    ],
  },
];

export function getAgentById(agentId: string | undefined): SpecialistAgent {
  return AGENT_DIRECTORY.find((agent) => agent.id === agentId) ?? AGENT_DIRECTORY[0]!;
}
