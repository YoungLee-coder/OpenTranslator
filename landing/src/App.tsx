import { Hero } from "@/components/sections/Hero";
import { Gallery } from "@/components/sections/Gallery";
import { Features } from "@/components/sections/Features";
import { Principles } from "@/components/sections/Principles";
import { Pricing } from "@/components/sections/Pricing";
import { Faq } from "@/components/sections/Faq";
import { Footer } from "@/components/sections/Footer";
import { useContent } from "@/lib/i18n";

export function App() {
  const { a11y } = useContent();

  return (
    <div className="page-shell">
      <div className="page-inner">
        <a className="skip-link" href="#main">
          {a11y.skipToContent}
        </a>
        <Hero />
      </div>
      <main id="main">
        {/* The product window is the centrepiece: it breaks out of the text column. */}
        <div className="page-wide">
          <Gallery />
        </div>
        <div className="page-inner">
          <Features />
          <Principles />
          <Pricing />
          <Faq />
        </div>
      </main>
      <div className="page-inner">
        <Footer />
      </div>
    </div>
  );
}
