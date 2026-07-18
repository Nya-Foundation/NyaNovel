import Image from "next/image";
import logoDark from "@/assets/brand/logo-horizontal-dark.svg";
import logoLight from "@/assets/brand/logo-horizontal-light.svg";
import markDark from "@/assets/brand/mark-on-dark.svg";
import markLight from "@/assets/brand/mark-on-light.svg";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  variant?: "horizontal" | "mark";
  className?: string;
  priority?: boolean;
};

/** Theme-aware rendering of the canonical Latent Frame artwork in assets/brand. */
export function BrandLogo({ variant = "horizontal", className, priority = false }: BrandLogoProps) {
  const dark = variant === "horizontal" ? logoDark : markDark;
  const light = variant === "horizontal" ? logoLight : markLight;

  return (
    <span
      role="img"
      aria-label="NyaNovel"
      className={cn("brand-logo relative inline-flex shrink-0", className)}
    >
      <Image
        src={dark}
        alt=""
        priority={priority}
        className="brand-logo-dark h-full w-full object-contain object-left"
      />
      <Image
        src={light}
        alt=""
        priority={priority}
        className="brand-logo-light absolute inset-0 h-full w-full object-contain object-left"
      />
    </span>
  );
}
