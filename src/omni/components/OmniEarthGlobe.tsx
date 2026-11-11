import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import Globe from "react-globe.gl";

const markets = [
  { lat: 37.77, lng: -122.42, name: "São Francisco" },
  { lat: 40.71, lng: -74.0, name: "Nova York" },
  { lat: 51.51, lng: -0.12, name: "Londres" },
  { lat: -23.55, lng: -46.63, name: "São Paulo" },
  { lat: 35.68, lng: 139.69, name: "Tóquio" },
  { lat: 19.07, lng: 72.87, name: "Mumbai" },
];

const connections = [
  { startLat: -23.55, startLng: -46.63, endLat: 51.51, endLng: -0.12 },
  { startLat: -23.55, startLng: -46.63, endLat: 35.68, endLng: 139.69 },
  { startLat: 40.71, startLng: -74.0, endLat: 35.68, endLng: 139.69 },
  { startLat: 51.51, startLng: -0.12, endLat: 19.07, endLng: 72.87 },
];

class GlobeErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

function GlobeFallback() {
  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-full bg-[#0b1520] shadow-[0_0_70px_rgba(49,217,188,0.13)]">
      <div
        className="absolute inset-0 rounded-full bg-cover bg-center opacity-90"
        style={{ backgroundImage: "url('/images/earth-texture.png')" }}
      />
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_28%_30%,rgba(255,255,255,0.36),transparent_36%),linear-gradient(110deg,transparent_37%,rgba(105,240,208,0.16),transparent_70%)]" />
      <div className="absolute inset-0 rounded-full border border-[#82d8c6]/40 shadow-[inset_-34px_-28px_70px_rgba(6,16,28,0.7)]" />
    </div>
  );
}

export function OmniEarthGlobe() {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<{
    controls: () => {
      autoRotate: boolean;
      autoRotateSpeed: number;
      enableZoom: boolean;
    };
  } | null>(null);
  const [dimensions, setDimensions] = useState({ width: 520, height: 520 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(([entry]) => {
      const width = Math.floor(entry.contentRect.width);
      setDimensions({ width, height: width });
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const controls = globeRef.current?.controls();
    if (!controls) return;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.28;
    controls.enableZoom = false;
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative aspect-square w-full touch-pan-y"
      role="img"
      aria-label="Globo terrestre 3D interativo com conexões entre mercados globais. Arraste para girar."
    >
      <GlobeErrorBoundary fallback={<GlobeFallback />}>
        <Globe
          ref={globeRef}
          width={dimensions.width}
          height={dimensions.height}
          backgroundColor="rgba(0,0,0,0)"
          globeImageUrl="/images/earth-texture.png"
          bumpImageUrl=""
          showAtmosphere
          atmosphereColor="#69f0d0"
          atmosphereAltitude={0.16}
          pointsData={markets}
          pointLat="lat"
          pointLng="lng"
          pointAltitude={0.012}
          pointRadius={0.32}
          pointColor={() => "#ffbf69"}
          pointResolution={8}
          arcsData={connections}
          arcColor={() => ["rgba(105, 240, 208, 0.08)", "rgba(105, 240, 208, 0.88)"]}
          arcDashLength={0.45}
          arcDashGap={0.24}
          arcDashAnimateTime={2200}
          arcStroke={0.28}
          arcsTransitionDuration={0}
          enablePointerInteraction
          animateIn
        />
      </GlobeErrorBoundary>
      <div className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_-30px_-20px_90px_rgba(5,14,26,0.62),0_0_70px_rgba(49,217,188,0.13)]" />
    </div>
  );
}
