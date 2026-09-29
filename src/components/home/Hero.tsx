import Link from "next/link";
import { ArrowRight, Sparkles, Star, ShieldCheck, HeartHandshake } from "lucide-react";
import heroImg from "@/assets/hero-skin.jpg";
import { imgSrc } from "@/lib/utils";

const trustBadges = [
  { icon: HeartHandshake, label: "Persönliche Betreuung" },
  { icon: Sparkles, label: "3D Hautanalyse" },
  { icon: ShieldCheck, label: "Langjährige Erfahrung" },
  { icon: Star, label: "5.0 Bewertungen" },
];

const Hero = () => (
  <section className="relative overflow-hidden bg-gradient-warm">
    <div className="container-editorial pt-11 md:pt-[4.5rem] pb-14 md:pb-[5.4rem] grid lg:grid-cols-12 gap-10 lg:gap-x-16 lg:gap-y-0">

      {/* Heading + lede */}
      <div className="lg:col-span-7 lg:row-start-1 reveal">
        <p className="eyebrow mb-6">Premium Skin Studio · Wien</p>
        <h1 className="display text-[clamp(2.25rem,4.95vw,4.275rem)]">
          Individuelle Hautpflege beginnt mit dem richtigen{" "}
          <span className="italic text-primary">Verständnis</span> deiner Haut.
        </h1>
        <p className="lede mt-6 max-w-[32.4rem] text-[0.9rem] md:text-[1.0125rem]">
          Moderne 3D-Hautanalyse, gezielte Behandlungen und persönliche Betreuung —
          für Ergebnisse, die zu deiner Haut passen.
        </p>
      </div>

      {/* Image — spans 2 grid rows on desktop */}
      <div className="lg:col-span-5 lg:row-start-1 lg:row-span-2 reveal reveal-delay-2">
        <div className="relative aspect-[2/3] w-[90%] mx-auto lg:mx-0 lg:ml-auto overflow-hidden shadow-elegant">
          <img
            src={imgSrc(heroImg)}
            alt="Hautanalyse und Hautpflege bei FACE AND MORE in Wien"
            className="w-full h-full object-cover"
            loading="eager"
          />
          <div className="absolute -bottom-px left-0 right-0 h-32 bg-gradient-to-t from-background/40 to-transparent" />
        </div>
      </div>

      {/* Buttons + trust — single instance, after image in DOM (mobile) / bottom-left on desktop */}
      <div className="lg:col-span-7 lg:row-start-2 lg:self-end lg:pb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/hautanalyse"
            className="group inline-flex items-center justify-center gap-2 px-[1.575rem] py-[0.9rem] text-[0.79rem] bg-primary text-primary-foreground tracking-wide hover:bg-primary-glow transition-colors"
          >
            Hautanalyse buchen
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="/leistungen"
            className="inline-flex items-center justify-center gap-2 px-[1.575rem] py-[0.9rem] text-[0.79rem] border border-foreground/20 text-foreground tracking-wide hover:border-primary hover:text-primary transition-colors"
          >
            Behandlungen ansehen
          </Link>
        </div>

        <div className="mt-6 lg:mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 lg:gap-6 max-w-[36rem]">
          {trustBadges.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-start gap-3">
              <Icon size={16} className="text-primary mt-0.5 shrink-0" />
              <span className="text-xs leading-snug text-foreground/75">{label}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  </section>
);

export default Hero;
