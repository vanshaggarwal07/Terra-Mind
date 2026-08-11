import { LandingHero } from "@/components/hero/LandingHero";
import { FeaturesBento } from "@/components/home/FeaturesBento";
import { FinalCta } from "@/components/home/FinalCta";
import { HowItWorks } from "@/components/home/HowItWorks";
import { LiveDemo } from "@/components/home/LiveDemo";
import { PlatformShowcase } from "@/components/home/PlatformShowcase";
import { RegionsGrid } from "@/components/home/RegionsGrid";
import { Testimonials } from "@/components/home/Testimonials";
import { TrustStats } from "@/components/home/TrustStats";

export default function HomePage() {
  return (
    <>
      <LandingHero />
      <TrustStats />
      <RegionsGrid />
      <LiveDemo />
      <FeaturesBento />
      <HowItWorks />
      <Testimonials />
      <PlatformShowcase />
      <FinalCta />
    </>
  );
}
