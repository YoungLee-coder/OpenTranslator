import { Hero } from "@/components/sections/Hero";
import { Gallery } from "@/components/sections/Gallery";
import { Features } from "@/components/sections/Features";
import { Principles } from "@/components/sections/Principles";
import { Pricing } from "@/components/sections/Pricing";
import { Faq } from "@/components/sections/Faq";
import { Footer } from "@/components/sections/Footer";

export function App() {
  return (
    <div className="page-shell">
      <div className="page-inner">
        <Hero />
        <Gallery />
        <Features />
        <Principles />
        <Pricing />
        <Faq />
        <Footer />
      </div>
    </div>
  );
}
