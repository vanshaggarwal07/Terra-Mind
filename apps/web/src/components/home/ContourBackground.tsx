"use client";

/**
 * Topographic contour background for the hero.
 * Two SVG layers: sparse (base) and dense (revealed as scrubber advances).
 * Respects prefers-reduced-motion — paths render without animation.
 */
export function ContourBackground({ density = 0 }: { density: number }) {
  // density: 0–1, driven by the timefold scrubber
  const denseOpacity = 0.15 + density * 0.55;

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      aria-hidden="true"
    >
      {/* Sparse base layer — draws in on mount */}
      <svg
        className="absolute inset-0 w-full h-full opacity-55"
        viewBox="0 0 1200 500"
        preserveAspectRatio="none"
      >
        {[
          "M0,80 C200,40 400,120 600,70 C800,20 1000,90 1200,50",
          "M0,150 C220,190 420,110 620,160 C820,210 1000,140 1200,170",
          "M0,240 C240,200 420,270 640,230 C840,190 1020,260 1200,220",
          "M0,330 C220,370 440,300 640,340 C840,380 1020,310 1200,350",
          "M0,420 C220,390 440,440 660,400 C860,360 1040,430 1200,400",
        ].map((d, i) => (
          <path
            key={i}
            d={d}
            className="contour-path draw-path"
            style={{ animationDelay: `${i * 0.1}s` }}
          />
        ))}
      </svg>

      {/* Dense layer — fades in as year advances */}
      <svg
        className="absolute inset-0 w-full h-full transition-opacity duration-700"
        style={{ opacity: denseOpacity }}
        viewBox="0 0 1200 500"
        preserveAspectRatio="none"
      >
        {[
          "M0,95 C210,60 410,130 610,90 C810,45 1010,100 1200,70",
          "M0,115 C200,85 410,155 610,115 C810,70 1010,120 1200,90",
          "M0,165 C230,200 430,125 630,175 C830,220 1010,155 1200,185",
          "M0,185 C220,215 420,145 620,195 C820,240 1010,170 1200,200",
          "M0,255 C250,215 430,285 650,245 C850,205 1030,275 1200,235",
          "M0,275 C240,235 420,305 640,265 C840,225 1020,295 1200,255",
          "M0,345 C230,385 450,315 650,355 C850,390 1030,325 1200,360",
          "M0,365 C220,400 440,335 640,375 C840,405 1020,345 1200,375",
        ].map((d, i) => (
          <path key={i} d={d} className="contour-path-dense" />
        ))}
      </svg>
    </div>
  );
}
