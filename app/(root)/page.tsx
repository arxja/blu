import { CtaSection } from "@/components/pages/home";
import { FeaturesSection } from "@/components/pages/home";
import { HeroSection } from "@/components/pages/home";
import { LogosSection } from "@/components/pages/home";
import { StatsSection } from "@/components/pages/home";
import { TestimonialsSection } from "@/components/pages/home";

export default function Home() {
  return (
    <div>
      <HeroSection />
      <LogosSection />
      <FeaturesSection />
      <StatsSection />
      <TestimonialsSection />
      <CtaSection />
    </div>
  );
}
