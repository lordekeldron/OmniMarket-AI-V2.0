import { describe, expect, it } from "vitest";
import {
  buildCampaignImagePrompt,
  CAMPAIGN_IMAGE_MODEL,
  type CampaignImageInput,
} from "./campaign-image-generation.server";

const input: CampaignImageInput = {
  brandName: "Aurora Botanics",
  industry: "skincare",
  productFocus: "sérum facial de vitamina C",
  creativeBrief: "frasco âmbar sobre pedra clara, luz de manhã",
  productType: "cosmetic",
  artDirection: "luxury",
  aspectRatio: "1:1",
  accentColor: "#7dd3c7",
};

describe("campaign image generation prompt", () => {
  it("uses the premium image model through the AI Gateway", () => {
    expect(CAMPAIGN_IMAGE_MODEL).toBe("bfl/flux-2-max");
  });

  it("prioritizes photorealistic materials and polished commercial lighting", () => {
    const prompt = buildCampaignImagePrompt(input);

    expect(prompt).toContain("Photorealistic studio product photography");
    expect(prompt).toContain("physically accurate reflections");
    expect(prompt).toContain("softbox key light");
    expect(prompt).toContain("frasco âmbar sobre pedra clara, luz de manhã");
  });

  it("explicitly avoids mockups and distorted text inside the generated image", () => {
    const prompt = buildCampaignImagePrompt(input);

    expect(prompt).toContain("Do not create a mockup");
    expect(prompt).toContain("Do not render words, letters, numbers, logos");
    expect(prompt).toContain("typography can be added separately without distortion");
  });
});
