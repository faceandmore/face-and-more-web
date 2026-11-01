'use client'
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X, ChevronDown } from "lucide-react";
import logo from "@/assets/logotransparent.webp";
import { imgSrc } from "@/lib/utils";

interface NavChild {
  to: string;
  label: string;
}

interface NavItem {
  to: string;
  label: string;
  children?: NavChild[];
}

const leistungen: NavChild[] = [
  { to: "/leistungen/akne",                  label: "Akne" },
  { to: "/leistungen/problemhaut",            label: "Problemhaut" },
  { to: "/leistungen/fruchtsaeure",           label: "Fruchtsäure" },
  { to: "/leistungen/gesichtsbehandlung",     label: "Gesichtsbehandlung" },
  { to: "/leistungen/microneedling",          label: "Microneedling" },
  { to: "/leistungen/microblading",           label: "Microblading" },
  { to: "/leistungen/wimpernkranzverdichtung",label: "Wimpernkranzverdichtung" },
  { to: "/hautanalyse",                       label: "Hautanalyse" },
];

const navItems: NavItem[] = [
  { to: "/leistungen",  label: "Leistungen",  children: leistungen },
  { to: "/hautcoaching",label: "Hautcoaching" },
  { to: "/hautanalyse", label: "Hautanalyse" },
  { to: "/produkte",    label: "Produkte" },
  { to: "/preise",      label: "Preise" },
  { to: "/ueber-mich",  label: "Über mich" },
  { to: "/kontakt",     label: "Kontakt" },
  { to: "/blog",        label: "Blog" },
];

const DropdownMenu = ({
  item,
  isActive,
}: {
  item: NavItem;
  isActive: boolean;
}) => (
  <div className="relative group">
    <button
      className={`inline-flex items-center gap-1 text-xs tracking-wide transition-colors ${
        isActive ? "text-primary" : "text-foreground/80 hover:text-primary"
      }`}
    >
      {item.label}
      <ChevronDown
        size={11}
        className="mt-px transition-transform duration-200 group-hover:rotate-180"
      />
    </button>

    {/* Invisible bridge keeps hover active while mouse travels to dropdown */}
    <div className="absolute top-full left-0 pt-4 opacity-0 pointer-events-none translate-y-1 group-hover:opacity-100 group-hover:pointer-events-auto group-hover:translate-y-0 transition-all duration-200 z-50">
      <div className="bg-background border border-border/60 shadow-lg py-2 min-w-[230px]">
        {item.children!.map((child) => (
          <Link
            key={child.to}
            href={child.to}
            className="block px-5 py-2 text-xs tracking-wide text-foreground/75 hover:text-primary hover:bg-secondary/40 transition-colors"
          >
            {child.label}
          </Link>
        ))}
        <div className="mt-1 mx-3 pt-2 border-t border-border/50">
          <Link
            href={item.to}
            className="block px-2 py-1.5 text-[0.65rem] uppercase tracking-widest text-primary hover:text-primary-glow transition-colors"
          >
            Alle {item.label} ansehen →
          </Link>
        </div>
      </div>
    </div>
  </div>
);

const SiteHeader = () => {
  const [scrolled, setScrolled]         = useState(false);
  const [open, setOpen]                 = useState(false);
  const [openSubmenu, setOpenSubmenu]   = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const closeMenu = () => {
    setOpen(false);
    setOpenSubmenu(null);
  };

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
        scrolled ? "bg-background/85 backdrop-blur-md border-b border-border" : "bg-transparent"
      }`}
    >
      <div className="container-editorial flex items-center justify-between h-24 md:h-32">
        <Link href="/" className="flex items-center" aria-label="FACE AND MORE — Startseite">
          <img src={imgSrc(logo)} alt="FACE AND MORE by Michaela Kornherr" className="h-24 md:h-28 w-auto" fetchPriority="high" />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-9">
          {navItems.map((item) => {
            const isActive =
              pathname === item.to ||
              (item.to !== "/" && pathname.startsWith(item.to));

            if (item.children) {
              return (
                <DropdownMenu key={item.to} item={item} isActive={isActive} />
              );
            }

            return (
              <Link
                key={item.to}
                href={item.to}
                className={`text-xs tracking-wide transition-colors ${
                  isActive ? "text-primary" : "text-foreground/80 hover:text-primary"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden lg:block">
          <Link
            href="/kontakt"
            className="inline-flex items-center px-5 py-2.5 bg-primary text-primary-foreground text-sm tracking-wide hover:bg-primary-glow transition-colors"
          >
            Termin buchen
          </Link>
        </div>

        <button
          className="lg:hidden p-2 -mr-2 text-foreground"
          onClick={() => setOpen(!open)}
          aria-label="Menü"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="lg:hidden bg-background border-t border-border">
          <div className="container-editorial py-6 flex flex-col gap-1">

            {/* Brand header */}
            <div className="flex items-center gap-4 pb-5 mb-2 border-b border-border/50">
              <img src={imgSrc(logo)} alt="FACE AND MORE" className="h-16 w-auto" />
              <div>
                <p className="font-serif text-lg leading-tight text-foreground">Face and More</p>
                <p className="text-xs text-foreground/50 mt-0.5">Kosmetikstudio Wien</p>
              </div>
            </div>

            {navItems.map((item) => {
              if (item.children) {
                const isExpanded = openSubmenu === item.to;
                return (
                  <div key={item.to}>
                    <button
                      onClick={() => setOpenSubmenu(isExpanded ? null : item.to)}
                      className="w-full flex items-center justify-between py-3 text-base text-foreground"
                    >
                      {item.label}
                      <ChevronDown
                        size={16}
                        className={`text-muted-foreground transition-transform duration-200 ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {isExpanded && (
                      <div className="mb-2 pl-4 flex flex-col border-l border-border/50 ml-1">
                        {item.children.map((child) => (
                          <Link
                            key={child.to}
                            href={child.to}
                            onClick={closeMenu}
                            className="py-2 text-sm text-foreground/70 hover:text-primary transition-colors"
                          >
                            {child.label}
                          </Link>
                        ))}
                        <Link
                          href={item.to}
                          onClick={closeMenu}
                          className="pt-2 mt-1 border-t border-border/40 text-xs uppercase tracking-widest text-primary"
                        >
                          Alle {item.label} →
                        </Link>
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={item.to}
                  href={item.to}
                  onClick={closeMenu}
                  className="py-3 text-base text-foreground"
                >
                  {item.label}
                </Link>
              );
            })}

            <Link
              href="/kontakt"
              onClick={closeMenu}
              className="mt-4 inline-flex items-center justify-center px-5 py-3 bg-primary text-primary-foreground text-sm tracking-wide"
            >
              Termin buchen
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};

export default SiteHeader;
