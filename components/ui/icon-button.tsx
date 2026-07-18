import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const iconButtonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center transition-[background-color,color,border-color,filter,transform] duration-fast ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0 active:scale-[0.94]",
  {
    variants: {
      variant: {
        panel:
          "text-fg-2 hover:bg-surface-2 hover:text-fg focus-visible:ring-offset-surface",
        subtle:
          "text-muted hover:bg-surface-3 hover:text-fg focus-visible:ring-offset-surface-2",
        overlay:
          "bg-black/60 text-white/90 backdrop-blur-md hover:bg-black/80 hover:text-white focus-visible:ring-white focus-visible:ring-offset-black",
        lightbox:
          "rounded-full bg-white/10 text-white hover:scale-105 hover:bg-white/20 focus-visible:ring-white focus-visible:ring-offset-black",
        accent:
          "bg-accent text-on-accent shadow-[var(--glow-accent)] hover:brightness-[1.07] focus-visible:ring-offset-surface",
      },
      size: {
        sm: "size-8 rounded-[8px] [&_svg]:size-4",
        md: "size-9 rounded-[9px] [&_svg]:size-[18px]",
        lg: "size-10 rounded-[10px] [&_svg]:size-5",
      },
    },
    defaultVariants: { variant: "panel", size: "md" },
  },
);

type IconButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> &
  VariantProps<typeof iconButtonVariants> & {
    label: string;
  };

/** Consistent labelled icon-only action for panels, image overlays, and dialogs. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, title = label, variant, size, className, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={title}
      className={cn(iconButtonVariants({ variant, size }), className)}
      {...props}
    />
  );
});
