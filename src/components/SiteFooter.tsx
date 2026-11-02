import Link from "next/link";
import { Instagram, Facebook, Mail } from "lucide-react";
import logo from "@/assets/logotransparent.webp";
import javeraLogo from "@/assets/Javera.logo.rund.webp";
import { imgSrc } from "@/lib/utils";

const SiteFooter = () => (
  <footer className="bg-secondary/60 border-t border-border mt-24">
    <div className="container-editorial py-10 grid gap-8 md:grid-cols-3">
      <div className="flex flex-col items-center text-center">
        <Link href="/" aria-label="FACE AND MORE — Startseite" className="inline-block">
          <img src={imgSrc(logo)} alt="FACE AND MORE by Michaela Kornherr" className="h-20 md:h-24 w-auto" width={960} height={540} loading="lazy" />
        </Link>
        <p className="mt-4 max-w-sm text-sm text-muted-foreground leading-relaxed">
          Moderne Hautanalyse, gezielte Behandlungen und persönliche Hautberatung im Herzen Wiens.
        </p>
      </div>
      <div>
        <iframe
          title="Standort FACE AND MORE"
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2658.0!2d16.3726!3d48.2256!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x476d0790c8b9a9c7%3A0x0!2sWolfsaugasse+6%2C+1200+Wien!5e0!3m2!1sde!2sat!4v1"
          width="100%"
          height="180"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="grayscale opacity-80"
        />
      </div>
      <div>
        <p className="eyebrow mb-3">Studio</p>
        <ul className="space-y-2 text-sm text-foreground/80">
          <li>Wolfsaugasse 6/2, A-1200 Wien</li>
          <li>+43 677 62 920 665</li>
        </ul>
        <p className="eyebrow mt-5 mb-2">Öffnungszeiten</p>
        <ul className="space-y-1.5 text-sm text-foreground/80">
          <li>Mo – Do: 08:30 – 18:00 Uhr</li>
          <li>Fr: 08:30 – 13:00 Uhr<br /><span className="text-xs text-muted-foreground">(nach Rücksprache auch nachmittags)</span></li>
        </ul>
        <div className="flex items-center gap-4 mt-5">
          <a
            href="https://www.instagram.com/faceandmorewien/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="text-foreground/60 hover:text-primary transition-colors"
          >
            <Instagram size={18} />
          </a>
          <a
            href="https://www.facebook.com/faceandmore.wien"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Facebook"
            className="text-foreground/60 hover:text-primary transition-colors"
          >
            <Facebook size={18} />
          </a>
          <a
            href="mailto:michaela@faceandmore.at"
            aria-label="E-Mail"
            className="text-foreground/60 hover:text-primary transition-colors"
          >
            <Mail size={18} />
          </a>
        </div>
      </div>
    </div>
    <div className="border-t border-border">
      <div className="container-editorial py-4 flex flex-col items-center gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <p>© {new Date().getFullYear()} FACE AND MORE by Michaela Kornherr</p>
          <span>·</span>
          <Link href="/impressum" className="hover:text-foreground transition-colors">Impressum</Link>
          <span>·</span>
          <Link href="/datenschutz" className="hover:text-foreground transition-colors">Datenschutz</Link>
        </div>
        <a
          href="https://javera-studio.at"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 opacity-60 hover:opacity-90 transition-opacity duration-500"
          style={{ textDecoration: "none" }}
        >
          <span className="text-[9px] tracking-[0.18em] uppercase font-light">
            Webdesign by
          </span>
          <img src={imgSrc(javeraLogo)} alt="JAVERA STUDIO" className="h-3.5 w-auto" width={128} height={128} loading="lazy" />
          <span className="text-[9px] tracking-[0.18em] uppercase font-light">
            JAVERA STUDIO
          </span>
        </a>
      </div>
    </div>
  </footer>
);

export default SiteFooter;
