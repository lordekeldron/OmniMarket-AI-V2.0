import { type FormEvent, useState } from "react";
import { Download, Image as ImageIcon, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { BrandProfile, CampaignCreative } from "../types";

type AspectRatio = "1:1" | "9:16" | "16:9";
type ProductType = "cosmetic" | "packaging" | "technology" | "fashion" | "food" | "custom";
type ArtDirection = "luxury" | "editorial" | "botanical" | "technology";

type GeneratedImage = {
  dataUrl: string;
  mediaType: string;
  model: string;
  aspectRatio: AspectRatio;
};

interface CampaignImageGeneratorProps {
  brand: BrandProfile;
  campaign: CampaignCreative;
  productFocus: string;
}

const ratioOptions: { value: AspectRatio; label: string }[] = [
  { value: "1:1", label: "Feed quadrado · 1:1" },
  { value: "9:16", label: "Stories e Reels · 9:16" },
  { value: "16:9", label: "Paisagem · 16:9" },
];

const productTypeOptions: { value: ProductType; label: string }[] = [
  { value: "cosmetic", label: "Cosmético e skincare" },
  { value: "packaging", label: "Embalagem premium" },
  { value: "technology", label: "Tecnologia e eletrônicos" },
  { value: "fashion", label: "Moda e acessórios" },
  { value: "food", label: "Alimentos e bebidas" },
  { value: "custom", label: "Outro produto" },
];

const artDirectionOptions: { value: ArtDirection; label: string }[] = [
  { value: "luxury", label: "Luxo editorial" },
  { value: "editorial", label: "Editorial contemporâneo" },
  { value: "botanical", label: "Botânico natural" },
  { value: "technology", label: "Tecnologia cinematográfica" },
];

export function CampaignImageGenerator({
  brand,
  campaign,
  productFocus,
}: CampaignImageGeneratorProps) {
  const suggestedBrief =
    campaign.designDirectives?.adBannerCreative?.visualPrompt || campaign.concept || "";
  const [creativeBrief, setCreativeBrief] = useState(suggestedBrief.slice(0, 700));
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [productType, setProductType] = useState<ProductType>("cosmetic");
  const [artDirection, setArtDirection] = useState<ArtDirection>("luxury");
  const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const subject = productFocus.trim() || campaign.campaignName || brand.name;

  const handleGenerate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName: brand.name,
          industry: brand.industry,
          productFocus: subject,
          creativeBrief,
          productType,
          artDirection,
          aspectRatio,
          accentColor: brand.accentColor,
        }),
      });
      const result = await response.json().catch(() => ({}));

      if (
        !response.ok ||
        !result.success ||
        typeof result.data?.dataUrl !== "string" ||
        !/^data:image\/(png|jpe?g|webp);base64,/i.test(result.data.dataUrl)
      ) {
        throw new Error(result.error || "Não foi possível gerar a imagem agora.");
      }

      setGeneratedImage(result.data);
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "Falha ao gerar imagem. Tente novamente.",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    const extension = generatedImage.mediaType.split("/")[1]?.replace("jpeg", "jpg") || "png";
    const fileNameBase = brand.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const fileName = `${fileNameBase || "omnimarket"}-criativo.${extension}`;
    const link = document.createElement("a");
    link.href = generatedImage.dataUrl;
    link.download = fileName;
    link.click();
  };

  return (
    <section
      aria-labelledby="campaign-image-title"
      className="flex flex-col gap-5 rounded-md border border-slate-800 bg-slate-900 p-5 sm:p-6"
    >
      <div className="flex flex-col justify-between gap-4 border-b border-slate-800 pb-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-400" aria-hidden="true" />
            <h3 id="campaign-image-title" className="text-base font-semibold text-foreground">
              Gerador de imagem para campanha
            </h3>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Fotografia publicitária de alta qualidade, criada com FLUX.2 Max.
          </p>
        </div>
        {generatedImage && (
          <Button type="button" onClick={handleDownload} variant="secondary" size="sm">
            <Download data-icon="inline-start" aria-hidden="true" />
            Baixar imagem
          </Button>
        )}
      </div>

      <form onSubmit={handleGenerate} className="flex flex-col gap-4">
        <div>
          <Label
            htmlFor="campaign-image-brief"
            className="mb-1.5 block text-xs font-semibold text-slate-300"
          >
            Brief visual
          </Label>
          <Textarea
            id="campaign-image-brief"
            value={creativeBrief}
            onChange={(event) => setCreativeBrief(event.target.value)}
            maxLength={700}
            rows={3}
            placeholder="Descreva cenário, materiais, luz e sensação desejada. Ex.: frasco âmbar sobre pedra clara, luz suave de manhã e folhas desfocadas ao fundo."
            className="resize-y text-sm"
          />
          <p className="mt-1 text-[11px] text-slate-500">
            {creativeBrief.length}/700 · Se vazio, usamos o conceito da campanha.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <span
              id="campaign-image-product-type-label"
              className="text-xs font-semibold text-muted-foreground"
            >
              Tipo de produto
            </span>
            <Select
              value={productType}
              onValueChange={(value) => setProductType(value as ProductType)}
            >
              <SelectTrigger aria-labelledby="campaign-image-product-type-label" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {productTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <span
              id="campaign-image-direction-label"
              className="text-xs font-semibold text-muted-foreground"
            >
              Direção de arte
            </span>
            <Select
              value={artDirection}
              onValueChange={(value) => setArtDirection(value as ArtDirection)}
            >
              <SelectTrigger aria-labelledby="campaign-image-direction-label" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {artDirectionOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <span
              id="campaign-image-ratio-label"
              className="text-xs font-semibold text-muted-foreground"
            >
              Proporção
            </span>
            <Select
              value={aspectRatio}
              onValueChange={(value) => setAspectRatio(value as AspectRatio)}
            >
              <SelectTrigger aria-labelledby="campaign-image-ratio-label" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ratioOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <p className="max-w-md text-[11px] leading-relaxed text-slate-400">
            A imagem é criada sem texto, logo ou rótulo legível. Assim, a tipografia da campanha não
            sai distorcida.
          </p>
          <Button
            type="submit"
            disabled={isGenerating}
            aria-busy={isGenerating}
            className="shrink-0"
          >
            <RefreshCw
              className={isGenerating ? "animate-spin" : undefined}
              data-icon="inline-start"
              aria-hidden="true"
            />
            {isGenerating
              ? "Criando imagem premium…"
              : generatedImage
                ? "Gerar nova imagem"
                : "Gerar imagem premium"}
          </Button>
        </div>
        {error && (
          <p
            role="alert"
            className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200"
          >
            {error}
          </p>
        )}
      </form>

      <div
        aria-busy={isGenerating}
        aria-live="polite"
        className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950"
      >
        {generatedImage ? (
          <div className="flex min-h-[320px] items-center justify-center p-3 sm:min-h-[420px] sm:p-5">
            <img
              src={generatedImage.dataUrl}
              alt={`Imagem publicitária gerada para ${brand.name}: ${subject}`}
              className="max-h-[640px] max-w-full rounded-md object-contain shadow-2xl"
            />
          </div>
        ) : (
          <div className="flex min-h-[320px] flex-col items-center justify-center px-6 py-12 text-center sm:min-h-[420px]">
            <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 text-indigo-300">
              <ImageIcon className="h-7 w-7" aria-hidden="true" />
            </span>
            <h4 className="text-sm font-semibold text-slate-200">Nenhuma imagem gerada ainda</h4>
            <p className="mt-2 max-w-sm text-xs leading-relaxed text-slate-500">
              Ajuste o briefing e a direção de arte. O resultado fotográfico aparecerá aqui, sem o
              mockup vetorial antigo.
            </p>
            {isGenerating && (
              <p className="mt-4 text-xs font-medium text-indigo-300">
                O modelo está criando sua imagem…
              </p>
            )}
          </div>
        )}
      </div>

      {generatedImage && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
          <span>Modelo: FLUX.2 Max</span>
          <span>
            Proporção {generatedImage.aspectRatio} · {generatedImage.mediaType}
          </span>
        </div>
      )}
    </section>
  );
}
