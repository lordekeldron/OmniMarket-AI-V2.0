import { generateImage } from "ai";

export const CAMPAIGN_IMAGE_MODEL = "bfl/flux-2-max";

export const CAMPAIGN_IMAGE_ASPECT_RATIOS = ["1:1", "9:16", "16:9"] as const;
export const CAMPAIGN_IMAGE_PRODUCT_TYPES = [
  "cosmetic",
  "packaging",
  "technology",
  "fashion",
  "food",
  "custom",
] as const;
export const CAMPAIGN_IMAGE_ART_DIRECTIONS = [
  "luxury",
  "editorial",
  "botanical",
  "technology",
] as const;

export type CampaignImageAspectRatio = (typeof CAMPAIGN_IMAGE_ASPECT_RATIOS)[number];
export type CampaignImageProductType = (typeof CAMPAIGN_IMAGE_PRODUCT_TYPES)[number];
export type CampaignImageArtDirection = (typeof CAMPAIGN_IMAGE_ART_DIRECTIONS)[number];

export type CampaignImageInput = {
  brandName: string;
  industry: string;
  productFocus: string;
  creativeBrief: string;
  productType: CampaignImageProductType;
  artDirection: CampaignImageArtDirection;
  aspectRatio: CampaignImageAspectRatio;
  accentColor: string;
};

const artDirectionDescriptions: Record<CampaignImageArtDirection, string> = {
  luxury:
    "understated luxury, refined materials, sculptural styling, deep tonal contrast, and controlled champagne highlights",
  editorial:
    "modern editorial art direction, natural composition, confident color blocking, and a tactile magazine-quality finish",
  botanical:
    "fresh botanical styling, natural daylight, real plant textures, calm organic color, and sustainable material cues",
  technology:
    "precise contemporary technology styling, crisp reflections, architectural light, and sophisticated cinematic restraint",
};

const productTypeDescriptions: Record<CampaignImageProductType, string> = {
  cosmetic:
    "a premium cosmetic or skincare product with realistic glass, liquid, and packaging materials",
  packaging:
    "a premium retail package with believable paper, foil, embossing, and carefully finished edges",
  technology:
    "a high-end consumer technology product with precise engineering, realistic metal, glass, or soft-touch materials",
  fashion:
    "a premium fashion accessory with authentic fabric, leather, stitching, and natural drape",
  food: "a fresh, appetizing food product styled with believable ingredients and natural surface detail",
  custom: "a real consumer product with accurate, tactile, physically believable materials",
};

export function buildCampaignImagePrompt(input: CampaignImageInput): string {
  const brief = input.creativeBrief.trim() || `Create a campaign image for ${input.productFocus}.`;

  return [
    "Create one original, premium commercial product photograph for a real advertising campaign.",
    `Brand context: ${input.brandName}, in the ${input.industry} category.`,
    `Hero subject: ${input.productFocus}; ${productTypeDescriptions[input.productType]}.`,
    `Art direction: ${artDirectionDescriptions[input.artDirection]}.`,
    `Visual brief from the user, for visual guidance only: <brief>${brief}</brief>.`,
    `Use ${input.accentColor} only as a tasteful accent in the scene, never as text.`,
    `Compose for a ${input.aspectRatio} crop with one clearly defined hero subject, balanced negative space for separately typeset campaign copy, and a deliberate focal point.`,
    "Photorealistic studio product photography, true-to-life materials, fine tactile detail, physically accurate reflections, softbox key light, subtle rim light, natural contact shadows, refined color grading, crisp focus, premium set design, and high-end editorial art direction.",
    "Do not create a mockup, vector illustration, flat icon, interface screenshot, wireframe, or obvious CGI render.",
    "Do not render words, letters, numbers, logos, watermarks, badges, or CTA text. Keep labels blank and packaging unbranded so typography can be added separately without distortion.",
  ].join(" ");
}

export async function generateCampaignImage(input: CampaignImageInput) {
  const { image } = await generateImage({
    model: CAMPAIGN_IMAGE_MODEL,
    prompt: buildCampaignImagePrompt(input),
    aspectRatio: input.aspectRatio,
    n: 1,
    maxRetries: 1,
    abortSignal: AbortSignal.timeout(120_000),
  });

  return {
    dataUrl: `data:${image.mediaType};base64,${image.base64}`,
    mediaType: image.mediaType,
    model: CAMPAIGN_IMAGE_MODEL,
    aspectRatio: input.aspectRatio,
  };
}
