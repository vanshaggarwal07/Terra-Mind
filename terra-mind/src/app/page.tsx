import { PriceAlertBand } from "@/components/forms/PriceAlertForm";
import { LandingHero } from "@/components/hero/LandingHero";
import { CorridorTimeline } from "@/components/home/CorridorTimeline";
import { FeaturesBento } from "@/components/home/FeaturesBento";
import { FinalCta } from "@/components/home/FinalCta";
import { HowItWorks } from "@/components/home/HowItWorks";
import { LiveDemo } from "@/components/home/LiveDemo";
import { MarketComparison } from "@/components/home/MarketComparison";
import { PlatformShowcase } from "@/components/home/PlatformShowcase";
import { RegionsGrid } from "@/components/home/RegionsGrid";
import { Testimonials } from "@/components/home/Testimonials";
import { ThenNowNext } from "@/components/home/ThenNowNext";
import { TrustStats } from "@/components/home/TrustStats";
import { WhyCorridor } from "@/components/home/WhyCorridor";
import { getListings } from "@/lib/sheets";

// Refresh sheet-derived home stats every 5 minutes without going dynamic.
export const revalidate = 300;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function HomePage() {
  const { listings } = await getListings();

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    name: "Terra-Mind",
    url: SITE_URL,
    description:
      "Property intelligence and verified land parcels along the Yamuna Expressway, Jewar Airport and Film City corridor.",
    areaServed: [
      "Yamuna Expressway",
      "Jewar",
      "Greater Noida",
      "Noida International Airport corridor",
    ],
    telephone: process.env.NEXT_PUBLIC_CONTACT_PHONE ?? undefined,
    email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <LandingHero />
      <TrustStats listings={listings} />
      <WhyCorridor listings={listings} />
      <RegionsGrid />
      <ThenNowNext listings={listings} />
      <CorridorTimeline listings={listings} />
      <MarketComparison listings={listings} />
      <LiveDemo />
      <FeaturesBento />
      <HowItWorks />
      <Testimonials />
      <PriceAlertBand />
      <PlatformShowcase />
      <FinalCta />
    </>
  );
}
